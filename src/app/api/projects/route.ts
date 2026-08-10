import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserOrganizationIds } from "@/lib/auth-helpers";
import { getRequestMeta, logAudit } from "@/lib/audit";

const createProjectSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/i, "slug can only contain letters, numbers and dashes"),
  description: z.string().max(500).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const organizationIds = await getUserOrganizationIds(session.user.id);
  const projects = await prisma.project.findMany({
    where: { organizationId: { in: organizationIds } },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { websites: true } },
      subscriptions: {
        where: { status: { in: ["ACTIVE", "TRIALING"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { plan: { select: { name: true, code: true, limits: true } } },
      },
    },
  });

  return NextResponse.json({
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description,
      websiteCount: project._count.websites,
      plan: project.subscriptions[0]?.plan ?? null,
      createdAt: project.createdAt,
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      role: { in: ["OWNER", "ADMIN"] },
    },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) {
    return NextResponse.json({ error: "organization_required" }, { status: 403 });
  }

  const existing = await prisma.project.findUnique({
    where: {
      organizationId_slug: {
        organizationId: membership.organizationId,
        slug: parsed.data.slug,
      },
    },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "slug_taken" }, { status: 409 });
  }

  const project = await prisma.project.create({
    data: {
      tenantId: membership.tenantId,
      userId: session.user.id,
      organizationId: membership.organizationId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
    },
  });

  const freePlan = await prisma.plan.findUnique({ where: { code: "free" } });
  if (freePlan) {
    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    await prisma.subscription.create({
      data: {
        tenantId: membership.tenantId,
        userId: session.user.id,
        organizationId: membership.organizationId,
        projectId: project.id,
        planId: freePlan.id,
        status: "ACTIVE",
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });
  }

  const meta = getRequestMeta(request);
  await logAudit({
    ...meta,
    tenantId: membership.tenantId,
    userId: session.user.id,
    organizationId: membership.organizationId,
    projectId: project.id,
    action: "project.create",
    resourceType: "project",
    resourceId: project.id,
    metadata: { name: project.name, slug: project.slug },
  });

  return NextResponse.json({ project }, { status: 201 });
}
