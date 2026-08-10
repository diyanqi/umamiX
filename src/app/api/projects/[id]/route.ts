import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserOrganizationIds } from "@/lib/auth-helpers";
import { getRequestMeta, logAudit } from "@/lib/audit";
import { requireRecentCapVerification } from "@/lib/cap-verification";

const updateProjectSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/i)
    .optional(),
  description: z.string().max(500).nullable().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

async function getProjectForUser(userId: string, projectId: string) {
  const organizationIds = await getUserOrganizationIds(userId);
  const membership = await prisma.membership.findFirst({
    where: { userId, organizationId: { in: organizationIds } },
    select: { role: true, organizationId: true },
  });
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { organization: true },
  });
  if (!project || !organizationIds.includes(project.organizationId)) return null;
  return { project, membership };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const found = await getProjectForUser(session.user.id, id);
  if (!found) {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }
  if (!found.membership || found.membership.role === "VIEWER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const project = await prisma.project.update({
    where: { id },
    data: parsed.data,
  });

  const meta = getRequestMeta(request);
  await logAudit({
    ...meta,
    tenantId: project.tenantId,
    userId: session.user.id,
    organizationId: project.organizationId,
    projectId: project.id,
    action: "project.update",
    resourceType: "project",
    resourceId: project.id,
  });

  return NextResponse.json({ project });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await requireRecentCapVerification())) {
    return NextResponse.json({ error: "verification_required" }, { status: 428 });
  }

  const { id } = await context.params;
  const found = await getProjectForUser(session.user.id, id);
  if (!found) {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }
  if (!found.membership || !["OWNER", "ADMIN"].includes(found.membership.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const project = await prisma.project.delete({ where: { id } });
  const meta = getRequestMeta(request);
  await logAudit({
    ...meta,
    tenantId: project.tenantId,
    userId: session.user.id,
    organizationId: project.organizationId,
    action: "project.delete",
    resourceType: "project",
    resourceId: project.id,
    metadata: { name: project.name },
  });

  return NextResponse.json({ ok: true });
}
