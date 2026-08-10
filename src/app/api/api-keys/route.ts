import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertProjectAccess } from "@/lib/auth-helpers";
import { getRequestMeta, logAudit } from "@/lib/audit";

const createKeySchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(80),
  scopes: z.array(z.enum(["ANALYTICS_READ", "ANALYTICS_WRITE", "API_READ", "API_WRITE", "MANAGER"])).min(1),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId_required" }, { status: 400 });
  }

  try {
    await assertProjectAccess(session.user.id, projectId);
  } catch {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { projectId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      scopes: true,
      expiresAt: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ keys });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { projectId, name, scopes } = parsed.data;

  try {
    await assertProjectAccess(session.user.id, projectId);
  } catch {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  const secret = `ivf_${randomBytes(24).toString("base64url")}`;
  const keyHash = createHash("sha256").update(secret).digest("hex");
  const prefix = secret.slice(0, 12);

  const apiKey = await prisma.apiKey.create({
    data: {
      tenantId: project.tenantId,
      userId: session.user.id,
      projectId,
      name,
      prefix,
      keyHash,
      scopes,
    },
  });

  const meta = getRequestMeta(request);
  await logAudit({
    ...meta,
    tenantId: project.tenantId,
    userId: session.user.id,
    projectId,
    action: "api_key.create",
    resourceType: "api_key",
    resourceId: apiKey.id,
    metadata: { name: apiKey.name, scopes: apiKey.scopes },
  });

  return NextResponse.json(
    {
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        prefix: apiKey.prefix,
        scopes: apiKey.scopes,
        createdAt: apiKey.createdAt,
      },
      key: secret,
    },
    { status: 201 },
  );
}
