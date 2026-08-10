import { NotificationKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dispatchNotification } from "@/lib/notifications/provider";
import { getPeriodRange } from "@/lib/utils";
import { getActivePlan } from "@/lib/plans";
import { generateInsights } from "@/lib/ai";

async function alreadySent(
  userId: string,
  projectId: string | null,
  kind: NotificationKind,
  since: Date,
) {
  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      projectId: projectId ?? null,
      kind,
      createdAt: { gte: since },
    },
    select: { id: true },
  });
  return Boolean(existing);
}

function startOfToday(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

async function sendPeriodStats(kind: "DAILY_STATS" | "WEEKLY_REPORT", date: Date) {
  const settings = await prisma.notificationSetting.findMany({
    where: {
      enabled: true,
      eventKinds: { has: kind },
    },
    select: {
      userId: true,
      tenantId: true,
      projectId: true,
      provider: true,
    },
  });

  const days = kind === "DAILY_STATS" ? 1 : 7;
  const { start, end } = getPeriodRange(days);

  for (const setting of settings) {
    const projectId = setting.projectId ?? undefined;
    if (!projectId) continue;

    const already = await alreadySent(setting.userId, setting.projectId, kind, start);
    if (already) continue;

    const websiteIds = await prisma.website.findMany({
      where: { projectId },
      select: { id: true },
    });
    if (websiteIds.length === 0) continue;

    const [pageviews, visitors, sessions] = await Promise.all([
      prisma.pageview.count({
        where: {
          websiteId: { in: websiteIds.map((website) => website.id) },
          timestamp: { gte: start, lte: end },
        },
      }),
      prisma.pageview
        .groupBy({
          by: ["visitorId"],
          where: {
            websiteId: { in: websiteIds.map((website) => website.id) },
            timestamp: { gte: start, lte: end },
          },
        })
        .then((rows) => rows.length),
      prisma.session.count({
        where: {
          projectId,
          startedAt: { gte: start, lte: end },
        },
      }),
    ]);

    let insightText = "";
    if (kind === "WEEKLY_REPORT") {
      const { limits } = await getActivePlan(projectId);
      if (limits.aiInsights && process.env.OPENAI_API_KEY) {
        const firstWebsite = await prisma.website.findFirst({
          where: { projectId },
          select: { name: true },
        });
        const topPages = await prisma.pageview.groupBy({
          by: ["path"],
          where: {
            websiteId: { in: websiteIds.map((website) => website.id) },
            timestamp: { gte: start, lte: end },
          },
          _count: { _all: true },
          orderBy: { _count: { path: "desc" } },
          take: 5,
        });
        try {
          insightText = await generateInsights({
            websiteName: firstWebsite?.name ?? "网站",
            days,
            pageviews,
            visitors,
            sessions,
            bounceRate: 0,
            topPages: topPages.map((page) => ({
              path: page.path,
              count: page._count._all,
            })),
          });
        } catch (error) {
          console.error("weekly AI insight failed", error);
        }
      }
    }

    await dispatchNotification({
      tenantId: setting.tenantId,
      userId: setting.userId,
      projectId: setting.projectId,
      kind,
      title: kind === "DAILY_STATS" ? "每日统计" : "每周报告",
      body: `${kind === "DAILY_STATS" ? "昨日" : "最近 7 天"}页面浏览 ${pageviews}，独立访客 ${visitors}，会话 ${sessions}。${
        insightText ? `\n\nAI 洞察：${insightText}` : ""
      }`,
      payload: { pageviews, visitors, sessions, periodStart: start.toISOString(), insight: insightText },
    });
  }
}

export async function sendDailyStats(date = new Date()) {
  await sendPeriodStats("DAILY_STATS", date);
}

export async function sendWeeklyReport(date = new Date()) {
  await sendPeriodStats("WEEKLY_REPORT", date);
}

export async function runAnomalyCheck(date = new Date()) {
  const { start } = getPeriodRange(7);
  const today = startOfToday(date);
  const websites = await prisma.website.findMany({
    where: { isActive: true },
    select: {
      id: true,
      projectId: true,
      tenantId: true,
      userId: true,
    },
  });

  for (const website of websites) {
    const [todayCount, previousAverage] = await Promise.all([
      prisma.pageview.count({
        where: { websiteId: website.id, timestamp: { gte: today } },
      }),
      prisma.pageview
        .aggregate({
          _count: { _all: true },
          where: {
            websiteId: website.id,
            timestamp: { gte: start, lt: today },
          },
        })
        .then((result) => result._count._all / 7),
    ]);

    if (previousAverage >= 20 && todayCount >= previousAverage * 2) {
      const already = await alreadySent(
        website.userId,
        website.projectId,
        "TRAFFIC_ANOMALY",
        today,
      );
      if (!already) {
        await dispatchNotification({
          tenantId: website.tenantId,
          userId: website.userId,
          projectId: website.projectId,
          kind: "TRAFFIC_ANOMALY",
          title: "流量异常提醒",
          body: `今日页面浏览 ${todayCount}，高于近 7 天日均 ${Math.round(previousAverage)} 的 2 倍。`,
          payload: { todayCount, previousAverage: Math.round(previousAverage) },
        });
      }
    }
  }
}

export async function dispatchQuotaWarning(input: {
  tenantId: string;
  userId: string;
  projectId: string;
  metric: string;
  used: number;
  limit: number;
}) {
  const today = startOfToday(new Date());
  const already = await alreadySent(input.userId, input.projectId, "QUOTA_WARNING", today);
  if (already) return;

  await dispatchNotification({
    tenantId: input.tenantId,
    userId: input.userId,
    projectId: input.projectId,
    kind: "QUOTA_WARNING",
    title: "配额预警",
    body: `${input.metric} 本月用量已达 ${input.used} / ${input.limit}，请升级计划或降低采集量。`,
    payload: { metric: input.metric, used: input.used, limit: input.limit },
  });
}

export async function runRetentionCleanup(date = new Date()) {
  const subscriptions = await prisma.subscription.findMany({
    where: { status: { in: ["ACTIVE", "TRIALING"] } },
    select: {
      projectId: true,
      plan: { select: { limits: true } },
    },
  });

  for (const subscription of subscriptions) {
    const limits = subscription.plan.limits as { retentionDays?: number };
    const retentionDays = Math.max(1, limits.retentionDays ?? 30);
    const cutoff = new Date(date.getTime() - retentionDays * 86_400_000);

    await prisma.$transaction([
      prisma.pageview.deleteMany({
        where: { projectId: subscription.projectId, timestamp: { lt: cutoff } },
      }),
      prisma.event.deleteMany({
        where: { projectId: subscription.projectId, timestamp: { lt: cutoff } },
      }),
      prisma.session.deleteMany({
        where: { projectId: subscription.projectId, startedAt: { lt: cutoff } },
      }),
      prisma.dailyMetric.deleteMany({
        where: { projectId: subscription.projectId, date: { lt: cutoff } },
      }),
    ]);
  }
}

export function startNotificationScheduler() {
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() < 5) {
        await sendDailyStats(now);
      }
      if (now.getDay() === 1 && now.getHours() === 1 && now.getMinutes() < 5) {
        await sendWeeklyReport(now);
      }
      if (now.getHours() === 2 && now.getMinutes() < 5) {
        await runRetentionCleanup(now);
      }
      await runAnomalyCheck(now);
    } catch (error) {
      console.error("notification scheduler failed", error);
    } finally {
      running = false;
    }
  };

  void tick();
  setInterval(tick, 15 * 60 * 1000);
  console.log("Infvar notification scheduler started");
}
