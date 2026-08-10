import { ReportKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPeriodRange } from "@/lib/utils";
import { getGoalConversions } from "./goals";

export type ReportConfig = {
  steps?: string[];
  conversionEvent?: string;
  goalIds?: string[];
  interval?: "day" | "week";
};

export async function runFunnel(
  websiteId: string,
  steps: string[],
  days: number,
) {
  const { start, end } = getPeriodRange(days);
  const pageviews = await prisma.pageview.findMany({
    where: {
      websiteId,
      timestamp: { gte: start, lte: end },
      sessionId: { not: null },
    },
    select: { sessionId: true, path: true },
    orderBy: { timestamp: "asc" },
  });

  const sessions = new Map<string, string[]>();
  for (const pageview of pageviews) {
    if (!pageview.sessionId) continue;
    const paths = sessions.get(pageview.sessionId) ?? [];
    paths.push(pageview.path);
    sessions.set(pageview.sessionId, paths);
  }

  const stepCounts = steps.map(() => 0);
  for (const paths of sessions.values()) {
    let index = 0;
    for (const path of paths) {
      if (index >= steps.length) break;
      if (path === steps[index]) {
        stepCounts[index] += 1;
        index += 1;
      }
    }
  }

  const totalSessions = sessions.size;
  return {
    sessions: totalSessions,
    steps: steps.map((path, index) => ({
      path,
      sessions: stepCounts[index],
      conversionRate:
        totalSessions === 0
          ? 0
          : Math.round((stepCounts[index] / totalSessions) * 1000) / 10,
    })),
  };
}

type RetentionRow = {
  first_day: Date;
  cohort_size: bigint;
  day1: bigint;
  day3: bigint;
  day7: bigint;
};

export async function runRetention(websiteId: string, days: number) {
  const { start, end } = getPeriodRange(days);
  const rows = await prisma.$queryRaw<RetentionRow[]>`
    WITH first_seen AS (
      SELECT "visitorId", MIN("timestamp")::date AS first_day
      FROM "Pageview"
      WHERE "websiteId" = ${websiteId}
        AND "timestamp" >= ${start}
        AND "timestamp" <= ${end}
      GROUP BY "visitorId"
    ),
    activity AS (
      SELECT DISTINCT "visitorId", "timestamp"::date AS day
      FROM "Pageview"
      WHERE "websiteId" = ${websiteId}
        AND "timestamp" >= ${start}
        AND "timestamp" <= ${end}
    )
    SELECT
      fs.first_day,
      COUNT(DISTINCT fs."visitorId") AS cohort_size,
      COUNT(DISTINCT CASE WHEN a.day = fs.first_day + 1 THEN a."visitorId" END) AS day1,
      COUNT(DISTINCT CASE WHEN a.day = fs.first_day + 3 THEN a."visitorId" END) AS day3,
      COUNT(DISTINCT CASE WHEN a.day = fs.first_day + 7 THEN a."visitorId" END) AS day7
    FROM first_seen fs
    LEFT JOIN activity a ON a."visitorId" = fs."visitorId"
    GROUP BY fs.first_day
    ORDER BY fs.first_day DESC
    LIMIT 30
  `;

  return {
    cohorts: rows.map((row) => ({
      day: row.first_day.toISOString(),
      cohortSize: Number(row.cohort_size),
      day1: Number(row.day1),
      day3: Number(row.day3),
      day7: Number(row.day7),
      day1Rate:
        Number(row.cohort_size) === 0
          ? 0
          : Math.round((Number(row.day1) / Number(row.cohort_size)) * 1000) / 10,
      day3Rate:
        Number(row.cohort_size) === 0
          ? 0
          : Math.round((Number(row.day3) / Number(row.cohort_size)) * 1000) / 10,
      day7Rate:
        Number(row.cohort_size) === 0
          ? 0
          : Math.round((Number(row.day7) / Number(row.cohort_size)) * 1000) / 10,
    })),
  };
}

export async function runUtm(websiteId: string, days: number) {
  const { start, end } = getPeriodRange(days);
  const [sources, mediums, campaigns] = await Promise.all([
    prisma.pageview.groupBy({
      by: ["utmSource"],
      where: {
        websiteId,
        timestamp: { gte: start, lte: end },
        utmSource: { not: null },
      },
      _count: { _all: true },
      orderBy: { _count: { utmSource: "desc" } },
      take: 20,
    }),
    prisma.pageview.groupBy({
      by: ["utmMedium"],
      where: {
        websiteId,
        timestamp: { gte: start, lte: end },
        utmMedium: { not: null },
      },
      _count: { _all: true },
      orderBy: { _count: { utmMedium: "desc" } },
      take: 20,
    }),
    prisma.pageview.groupBy({
      by: ["utmCampaign"],
      where: {
        websiteId,
        timestamp: { gte: start, lte: end },
        utmCampaign: { not: null },
      },
      _count: { _all: true },
      orderBy: { _count: { utmCampaign: "desc" } },
      take: 20,
    }),
  ]);

  return {
    sources: sources.map((row) => ({
      value: row.utmSource ?? "unknown",
      count: row._count._all,
    })),
    mediums: mediums.map((row) => ({
      value: row.utmMedium ?? "unknown",
      count: row._count._all,
    })),
    campaigns: campaigns.map((row) => ({
      value: row.utmCampaign ?? "unknown",
      count: row._count._all,
    })),
  };
}

export async function runJourney(websiteId: string, days: number) {
  const { start, end } = getPeriodRange(days);
  const pageviews = await prisma.pageview.findMany({
    where: {
      websiteId,
      timestamp: { gte: start, lte: end },
      sessionId: { not: null },
    },
    select: { sessionId: true, path: true },
    orderBy: { timestamp: "asc" },
  });

  const journeys = new Map<string, string[]>();
  for (const pageview of pageviews) {
    if (!pageview.sessionId) continue;
    const paths = journeys.get(pageview.sessionId) ?? [];
    paths.push(pageview.path);
    journeys.set(pageview.sessionId, paths);
  }

  const sequenceCounts = new Map<string, number>();
  for (const paths of journeys.values()) {
    const sequence = paths.slice(0, 2).join(" → ") || "(empty)";
    sequenceCounts.set(sequence, (sequenceCounts.get(sequence) ?? 0) + 1);
  }

  return {
    sessions: journeys.size,
    topSequences: Array.from(sequenceCounts.entries())
      .map(([sequence, count]) => ({ sequence, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
    averagePagesPerSession:
      journeys.size === 0
        ? 0
        : Math.round(
            (Array.from(journeys.values()).reduce((sum, paths) => sum + paths.length, 0) /
              journeys.size) *
              10,
          ) / 10,
  };
}

export async function runAttribution(
  websiteId: string,
  conversionEvent: string,
  days: number,
) {
  const { start, end } = getPeriodRange(days);
  const events = await prisma.event.findMany({
    where: {
      websiteId,
      timestamp: { gte: start, lte: end },
      name: conversionEvent || "conversion",
      sessionId: { not: null },
    },
    select: { sessionId: true },
  });

  const sessionIds = Array.from(
    new Set(events.map((event) => event.sessionId).filter((id): id is string => Boolean(id))),
  );
  const sessions = sessionIds.length
    ? await prisma.session.findMany({
        where: { id: { in: sessionIds } },
        select: { referrerDomain: true },
      })
    : [];

  const counts = new Map<string, number>();
  for (const session of sessions) {
    const key = session.referrerDomain ?? "direct";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return {
    conversions: sessionIds.length,
    channels: Array.from(counts.entries())
      .map(([channel, count]) => ({ channel, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export async function runGoalReport(websiteId: string, goalIds: string[], days: number) {
  const goals = await prisma.goal.findMany({
    where: { id: { in: goalIds } },
    select: {
      id: true,
      name: true,
      websiteId: true,
      type: true,
      value: true,
      operator: true,
    },
  });
  const results = await Promise.all(
    goals.map(async (goal) => ({
      id: goal.id,
      name: goal.name,
      type: goal.type,
      ...(await getGoalConversions(goal, days)),
    })),
  );
  return { goals: results };
}

export async function runReport(
  kind: ReportKind,
  websiteId: string | null,
  config: ReportConfig,
  days: number,
) {
  if (!websiteId) {
    return { error: "website_required" };
  }

  switch (kind) {
    case "FUNNEL":
      return { funnel: await runFunnel(websiteId, config.steps ?? [], days) };
    case "RETENTION":
      return { retention: await runRetention(websiteId, days) };
    case "UTM":
      return { utm: await runUtm(websiteId, days) };
    case "JOURNEY":
      return { journey: await runJourney(websiteId, days) };
    case "ATTRIBUTION":
      return {
        attribution: await runAttribution(
          websiteId,
          config.conversionEvent ?? "conversion",
          days,
        ),
      };
    case "GOALS":
      return { goals: await runGoalReport(websiteId, config.goalIds ?? [], days) };
    default:
      return { error: "unsupported_report" };
  }
}
