import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertProjectAccess, getUserProjectIds } from "@/lib/auth-helpers";
import { getRequestMeta, logAudit } from "@/lib/audit";

const createReportSchema = z.object({
  projectId: z.string().min(1),
  websiteId: z.string().optional().nullable(),
  name: z.string().min(1).max(120),
  kind: z.enum(["FUNNEL", "RETENTION", "UTM", "GOALS", "JOURNEY", "ATTRIBUTION"]),
  config: z.record(z.string(), z.unknown()).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const projectIds = await getUserProjectIds(session.user.id);
  const reports = await prisma.report.findMany({
    where: { projectId: { in: Array.from(projectIds) } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      kind: true,
      config: true,
      websiteId: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ reports });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { projectId, websiteId, name, kind, config } = parsed.data;
  try {
    await assertProjectAccess(session.user.id, projectId);
  } catch {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  const report = await prisma.report.create({
    data: {
      tenantId: project.tenantId,
      userId: session.user.id,
      projectId,
      websiteId: websiteId ?? null,
      name,
      kind,
      config: (config ?? {}) as Prisma.InputJsonValue,
    },
  });

  const meta = getRequestMeta(request);
  await logAudit({
    ...meta,
    tenantId: project.tenantId,
    userId: session.user.id,
    projectId,
    action: "report.create",
    resourceType: "report",
    resourceId: report.id,
    metadata: { name: report.name, kind: report.kind },
  });

  return NextResponse.json({ report }, { status: 201 });
}
