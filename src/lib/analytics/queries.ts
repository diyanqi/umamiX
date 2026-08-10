import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPeriodRange } from "@/lib/utils";

type DayRow = { day: Date; value: bigint };

export type StatsFilters = {
  path?: string;
  referrer?: string;
  country?: string;
  browser?: string;
  os?: string;
  device?: string;
};

function pageviewWhere(filters?: StatsFilters): Prisma.PageviewWhereInput {
  return {
    ...(filters?.path ? { path: { contains: filters.path, mode: "insensitive" } } : {}),
    ...(filters?.referrer ? { referrerDomain: { contains: filters.referrer, mode: "insensitive" } } : {}),
    ...(filters?.country ? { country: filters.country } : {}),
    ...(filters?.browser ? { browser: filters.browser } : {}),
    ...(filters?.os ? { os: filters.os } : {}),
    ...(filters?.device ? { device: filters.device } : {}),
  };
}

function sessionWhere(filters?: StatsFilters): Prisma.SessionWhereInput {
  return {
    ...(filters?.country ? { country: filters.country } : {}),
    ...(filters?.browser ? { browser: filters.browser } : {}),
    ...(filters?.os ? { os: filters.os } : {}),
    ...(filters?.device ? { device: filters.device } : {}),
  };
}

export async function getOverview(websiteId: string, days = 30, filters?: StatsFilters) {
  const { start, end } = getPeriodRange(days);
  return getOverviewBetween(websiteId, start, end, filters);
}

export async function getOverviewBetween(
  websiteId: string,
  start: Date,
  end: Date,
  filters?: StatsFilters,
) {
  const where = {
    websiteId,
    timestamp: { gte: start, lte: end },
    ...pageviewWhere(filters),
  } satisfies Prisma.PageviewWhereInput;
  const sessionWhereClause = {
    websiteId,
    startedAt: { gte: start, lte: end },
    ...sessionWhere(filters),
  } satisfies Prisma.SessionWhereInput;

  const [pageviews, uniqueVisitors, sessions, bounced, avgDuration] = await Promise.all([
    prisma.pageview.count({ where }),
    prisma.pageview
      .groupBy({ by: ["visitorId"], where })
      .then((rows) => rows.length),
    prisma.session.count({
      where: sessionWhereClause,
    }),
    prisma.session.count({
      where: {
        ...sessionWhereClause,
        isBounce: true,
      },
    }),
    prisma.session.aggregate({
      _avg: { durationSeconds: true },
      where: sessionWhereClause,
    }),
  ]);

  const filterSql = Prisma.sql`
    ${filters?.path ? Prisma.sql`AND "path" ILIKE ${`%${filters.path}%`}` : Prisma.empty}
    ${filters?.referrer ? Prisma.sql`AND "referrerDomain" ILIKE ${`%${filters.referrer}%`}` : Prisma.empty}
    ${filters?.country ? Prisma.sql`AND "country" = ${filters.country}` : Prisma.empty}
    ${filters?.browser ? Prisma.sql`AND "browser" = ${filters.browser}` : Prisma.empty}
    ${filters?.os ? Prisma.sql`AND "os" = ${filters.os}` : Prisma.empty}
    ${filters?.device ? Prisma.sql`AND "device" = ${filters.device}` : Prisma.empty}
  `;
  const series = await prisma.$queryRaw<DayRow[]>`
    SELECT date_trunc('day', "timestamp") AS day, COUNT(*)::bigint AS value
    FROM "Pageview"
    WHERE "websiteId" = ${websiteId}
      AND "timestamp" >= ${start}
      AND "timestamp" <= ${end}
      ${filterSql}
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  return {
    pageviews,
    visitors: uniqueVisitors,
    sessions,
    bounceRate: sessions === 0 ? 0 : Math.round((bounced / sessions) * 1000) / 10,
    avgDurationSeconds: Math.round(avgDuration._avg.durationSeconds ?? 0),
    series: series.map((row) => ({
      day: row.day.toISOString(),
      value: Number(row.value),
    })),
  };
}

export async function getTopPages(
  websiteId: string,
  days = 30,
  take = 20,
  filters?: StatsFilters,
) {
  const { start, end } = getPeriodRange(days);
  return prisma.pageview.groupBy({
    by: ["path"],
    where: {
      websiteId,
      timestamp: { gte: start, lte: end },
      ...pageviewWhere(filters),
    },
    _count: { _all: true },
    orderBy: { _count: { path: "desc" } },
    take,
  });
}

export async function getTopReferrers(
  websiteId: string,
  days = 30,
  take = 20,
  filters?: StatsFilters,
) {
  const { start, end } = getPeriodRange(days);
  return prisma.pageview.groupBy({
    by: ["referrerDomain"],
    where: {
      websiteId,
      timestamp: { gte: start, lte: end },
      referrerDomain: { not: null },
      ...pageviewWhere(filters),
    },
    _count: { _all: true },
    orderBy: { _count: { referrerDomain: "desc" } },
    take,
  });
}

export async function getTopCountries(
  websiteId: string,
  days = 30,
  take = 20,
  filters?: StatsFilters,
) {
  const { start, end } = getPeriodRange(days);
  return prisma.pageview.groupBy({
    by: ["country"],
    where: {
      websiteId,
      timestamp: { gte: start, lte: end },
      country: { not: null },
      ...pageviewWhere(filters),
    },
    _count: { _all: true },
    orderBy: { _count: { country: "desc" } },
    take,
  });
}

export async function getTopLanguages(
  websiteId: string,
  days = 30,
  take = 20,
  filters?: StatsFilters,
) {
  const { start, end } = getPeriodRange(days);
  return prisma.pageview.groupBy({
    by: ["language"],
    where: {
      websiteId,
      timestamp: { gte: start, lte: end },
      language: { not: null },
      ...pageviewWhere(filters),
    },
    _count: { _all: true },
    orderBy: { _count: { language: "desc" } },
    take,
  });
}

export async function getDeviceBreakdown(
  websiteId: string,
  days = 30,
  take = 10,
  filters?: StatsFilters,
) {
  const { start, end } = getPeriodRange(days);
  const [browsers, operatingSystems, devices] = await Promise.all([
    prisma.pageview
      .groupBy({
        by: ["browser"],
        where: { websiteId, timestamp: { gte: start, lte: end }, ...pageviewWhere(filters) },
        _count: { _all: true },
        orderBy: { _count: { browser: "desc" } },
        take,
      })
      .then((rows) => rows.map((row) => ({ browser: row.browser ?? "Unknown", _count: row._count }))),
    prisma.pageview
      .groupBy({
        by: ["os"],
        where: { websiteId, timestamp: { gte: start, lte: end }, ...pageviewWhere(filters) },
        _count: { _all: true },
        orderBy: { _count: { os: "desc" } },
        take,
      })
      .then((rows) => rows.map((row) => ({ os: row.os ?? "Unknown", _count: row._count }))),
    prisma.pageview
      .groupBy({
        by: ["device"],
        where: { websiteId, timestamp: { gte: start, lte: end }, ...pageviewWhere(filters) },
        _count: { _all: true },
        orderBy: { _count: { device: "desc" } },
        take,
      })
      .then((rows) => rows.map((row) => ({ device: row.device ?? "Unknown", _count: row._count }))),
  ]);
  return { browsers, operatingSystems, devices };
}

export async function getEventBreakdown(websiteId: string, days = 30, take = 30) {
  const { start, end } = getPeriodRange(days);
  const events = await prisma.event.groupBy({
    by: ["name"],
    where: { websiteId, timestamp: { gte: start, lte: end } },
    _count: { _all: true },
    orderBy: { _count: { name: "desc" } },
    take,
  });
  return events.map((event) => ({
    name: event.name,
    count: event._count._all,
  }));
}

export async function getRecentPageviews(
  websiteId: string,
  take = 10,
  filters?: StatsFilters,
) {
  const { start, end } = getPeriodRange(30);
  const rows = await prisma.pageview.findMany({
    where: { websiteId, timestamp: { gte: start, lte: end }, ...pageviewWhere(filters) },
    orderBy: { timestamp: "desc" },
    take,
    select: {
      path: true,
      title: true,
      country: true,
      browser: true,
      os: true,
      device: true,
      timestamp: true,
    },
  });
  return rows.map((row) => ({
    ...row,
    timestamp: row.timestamp.toISOString(),
  }));
}

export async function getWebsiteStats(
  websiteId: string,
  days = 30,
  filters?: StatsFilters,
) {
  const [overview, pages, referrers, countries, languages, devices, events, recent] =
    await Promise.all([
      getOverview(websiteId, days, filters),
      getTopPages(websiteId, days, 20, filters),
      getTopReferrers(websiteId, days, 20, filters),
      getTopCountries(websiteId, days, 20, filters),
      getTopLanguages(websiteId, days, 20, filters),
      getDeviceBreakdown(websiteId, days, 10, filters),
      getEventBreakdown(websiteId, days),
      getRecentPageviews(websiteId, 10, filters),
    ]);
  return { overview, pages, referrers, countries, languages, devices, events, recent };
}
