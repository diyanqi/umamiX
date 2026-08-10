import { prisma } from "./prisma";

export type PlanLimits = {
  websites: number;
  eventsPerMonth: number;
  pageviewsPerMonth: number;
  retentionDays: number;
  reports: number;
  apiAccess: boolean;
  aiInsights: boolean;
  teamMembers: number;
  advancedReports: boolean;
};

export const defaultLimits: PlanLimits = {
  websites: 0,
  eventsPerMonth: 0,
  pageviewsPerMonth: 0,
  retentionDays: 30,
  reports: 0,
  apiAccess: false,
  aiInsights: false,
  teamMembers: 1,
  advancedReports: false,
};

export function parseLimits(value: unknown): PlanLimits {
  if (!value || typeof value !== "object") return defaultLimits;
  const raw = value as Record<string, unknown>;
  return {
    websites: Number(raw.websites ?? defaultLimits.websites),
    eventsPerMonth: Number(raw.eventsPerMonth ?? defaultLimits.eventsPerMonth),
    pageviewsPerMonth: Number(raw.pageviewsPerMonth ?? defaultLimits.pageviewsPerMonth),
    retentionDays: Number(raw.retentionDays ?? defaultLimits.retentionDays),
    reports: Number(raw.reports ?? defaultLimits.reports),
    apiAccess: Boolean(raw.apiAccess ?? defaultLimits.apiAccess),
    aiInsights: Boolean(raw.aiInsights ?? defaultLimits.aiInsights),
    teamMembers: Number(raw.teamMembers ?? defaultLimits.teamMembers),
    advancedReports: Boolean(raw.advancedReports ?? defaultLimits.advancedReports),
  };
}

export async function getActivePlan(projectId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      projectId,
      status: { in: ["ACTIVE", "TRIALING"] },
    },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });

  if (!subscription) {
    const freePlan = await prisma.plan.findUnique({ where: { code: "free" } });
    return { subscription: null, plan: freePlan, limits: parseLimits(freePlan?.limits) };
  }

  return {
    subscription,
    plan: subscription.plan,
    limits: parseLimits(subscription.plan.limits),
  };
}

export function getMonthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

export async function getUsage(projectId: string, metric: "PAGEVIEWS" | "EVENTS" | "AI_CALLS") {
  const { start } = getMonthRange();
  const record = await prisma.usageRecord.findUnique({
    where: {
      projectId_metric_periodStart: {
        projectId,
        metric,
        periodStart: start,
      },
    },
  });
  return record?.quantity ?? 0;
}

export async function assertPlanLimit(
  projectId: string,
  resource: keyof PlanLimits,
  currentValue = 0,
) {
  const { limits } = await getActivePlan(projectId);
  const limit = limits[resource];
  if (typeof limit === "number" && currentValue >= limit) {
    throw new Error(`Plan limit reached for ${resource}`);
  }
  return limits;
}
