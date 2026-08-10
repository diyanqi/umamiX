import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserOrganizationIds } from "@/lib/auth-helpers";
import { getActivePlan, getMonthRange, parseLimits } from "@/lib/plans";
import { assertProjectAccess } from "@/lib/auth-helpers";
import { getRequestMeta, logAudit } from "@/lib/audit";

const changePlanSchema = z.object({
  projectId: z.string().min(1),
  planCode: z.string().min(1).max(80),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const organizationIds = await getUserOrganizationIds(session.user.id);
  const project = await prisma.project.findFirst({
    where: { organizationId: { in: organizationIds } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  if (!project) {
    return NextResponse.json({ plan: null, usage: null });
  }

  const { plan, subscription, limits } = await getActivePlan(project.id);
  const { start, end } = getMonthRange();
  const usage = await prisma.usageRecord.findMany({
    where: {
      projectId: project.id,
      periodStart: start,
      periodEnd: end,
    },
    select: { metric: true, quantity: true },
  });

  return NextResponse.json({
    project,
    plan: plan
      ? {
          code: plan.code,
          name: plan.name,
          priceMonthly: plan.priceMonthly,
          currency: plan.currency,
          features: plan.features,
          limits: parseLimits(plan.limits),
        }
      : null,
    subscription: subscription
      ? {
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        }
      : null,
    usage,
    limits,
  });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = changePlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    await assertProjectAccess(session.user.id, parsed.data.projectId);
  } catch {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      role: { in: ["OWNER", "ADMIN"] },
    },
    select: { organizationId: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const plan = await prisma.plan.findFirst({
    where: { code: parsed.data.planCode, isActive: true },
  });
  if (!plan) {
    return NextResponse.json({ error: "plan_not_found" }, { status: 404 });
  }

  const project = await prisma.project.findUnique({
    where: { id: parsed.data.projectId },
  });
  if (!project) {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  const existing = await prisma.subscription.findFirst({
    where: { projectId: parsed.data.projectId, status: { in: ["ACTIVE", "TRIALING"] } },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const subscription = existing
    ? await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          planId: plan.id,
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
      })
    : await prisma.subscription.create({
        data: {
          tenantId: project.tenantId,
          userId: session.user.id,
          organizationId: project.organizationId,
          projectId: project.id,
          planId: plan.id,
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });

  const meta = getRequestMeta(request);
  await logAudit({
    ...meta,
    tenantId: project.tenantId,
    userId: session.user.id,
    organizationId: project.organizationId,
    projectId: project.id,
    action: "subscription.change_plan",
    resourceType: "subscription",
    resourceId: subscription.id,
    metadata: { planCode: plan.code },
  });

  return NextResponse.json({ subscription, plan });
}
