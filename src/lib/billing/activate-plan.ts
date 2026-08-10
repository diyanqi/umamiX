import { prisma } from "@/lib/prisma";

export async function activatePlan(input: {
  userId?: string;
  projectId: string;
  planCode: string;
}) {
  const plan = await prisma.plan.findFirst({
    where: { code: input.planCode, isActive: true },
  });
  if (!plan) {
    throw new Error("plan_not_found");
  }

  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
  });
  if (!project) {
    throw new Error("project_not_found");
  }

  const existing = await prisma.subscription.findFirst({
    where: { projectId: input.projectId, status: { in: ["ACTIVE", "TRIALING"] } },
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
          userId: input.userId ?? project.userId,
          organizationId: project.organizationId,
          projectId: project.id,
          planId: plan.id,
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });

  return { subscription, plan, project };
}
