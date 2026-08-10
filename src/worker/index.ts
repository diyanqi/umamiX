import "@/lib/env";
import { Worker, type Job } from "bullmq";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import type { TrackPayload } from "@/lib/queue";
import { detectDevice, getReferrerDomain } from "@/lib/analytics/detect";
import { getActivePlan } from "@/lib/plans";
import { dispatchQuotaWarning, startNotificationScheduler } from "./notifications";

function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function monthKey(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

async function incrementDailyMetric(
  website: { id: string; tenantId: string; userId: string; projectId: string },
  metric: "PAGEVIEWS" | "EVENTS" | "SESSIONS" | "VISITORS",
  date: Date,
  amount = 1,
) {
  const day = startOfDay(date);
  await prisma.dailyMetric.upsert({
    where: {
      websiteId_date_metric: {
        websiteId: website.id,
        date: day,
        metric,
      },
    },
    create: {
      tenantId: website.tenantId,
      userId: website.userId,
      projectId: website.projectId,
      websiteId: website.id,
      date: day,
      metric,
      value: amount,
    },
    update: {
      value: { increment: amount },
    },
  });
}

async function incrementUsage(
  website: { tenantId: string; userId: string; projectId: string },
  metric: "PAGEVIEWS" | "EVENTS" | "SESSIONS" | "VISITORS",
  date: Date,
  amount = 1,
) {
  const periodStart = monthKey(date);
  const periodEnd = new Date(
    Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 1),
  );

  const record = await prisma.usageRecord.upsert({
    where: {
      projectId_metric_periodStart: {
        projectId: website.projectId,
        metric,
        periodStart,
      },
    },
    create: {
      tenantId: website.tenantId,
      userId: website.userId,
      projectId: website.projectId,
      metric,
      periodStart,
      periodEnd,
      quantity: amount,
    },
    update: {
      quantity: { increment: amount },
    },
  });
  return record.quantity;
}

async function processJob(job: Job<TrackPayload>) {
  const payload = job.data;
  const website = await prisma.website.findUnique({
    where: { id: payload.websiteId ?? "" },
    select: { id: true, tenantId: true, userId: true, projectId: true },
  });

  if (!website) {
    throw new Error(`Website ${payload.websiteId} not found`);
  }

  const receivedAt = payload.receivedAt ? new Date(payload.receivedAt) : new Date();
  const sessionKey = payload.sessionId ?? `anon-${payload.visitorId ?? "guest"}-${Date.now()}`;
  const referrerDomain = getReferrerDomain(payload.referrer);
  const { browser, os, device } = detectDevice(payload.userAgent);
  const { limits } = await getActivePlan(website.projectId);

  const session = await prisma.session.upsert({
    where: {
      websiteId_sessionKey: {
        websiteId: website.id,
        sessionKey,
      },
    },
    create: {
      tenantId: website.tenantId,
      userId: website.userId,
      projectId: website.projectId,
      websiteId: website.id,
      visitorId: payload.visitorId ?? "unknown",
      sessionKey,
      startedAt: receivedAt,
      endedAt: receivedAt,
      entryPath: payload.path,
      referrer: payload.referrer,
      referrerDomain,
      country: payload.country,
      region: payload.region,
      city: payload.city,
      language: payload.language,
      browser,
      os,
      device,
      screen: payload.screen,
      pageviewCount: payload.type === "pageview" ? 1 : 0,
      eventCount: payload.type === "event" ? 1 : 0,
      isBounce: payload.type === "pageview",
    },
    update: {
      endedAt: receivedAt,
      referrer: payload.referrer ?? undefined,
      referrerDomain: referrerDomain ?? undefined,
      country: payload.country ?? undefined,
      region: payload.region ?? undefined,
      city: payload.city ?? undefined,
      language: payload.language ?? undefined,
      browser: browser === "Unknown" ? undefined : browser,
      os: os === "Unknown" ? undefined : os,
      device: device === "Desktop" ? undefined : device,
      screen: payload.screen ?? undefined,
      pageviewCount: payload.type === "pageview" ? { increment: 1 } : undefined,
      eventCount: payload.type === "event" ? { increment: 1 } : undefined,
    },
  });

  const baseData = {
    tenantId: website.tenantId,
    userId: website.userId,
    projectId: website.projectId,
    websiteId: website.id,
    sessionId: session.id,
    visitorId: payload.visitorId ?? "unknown",
    referrer: payload.referrer,
    referrerDomain,
    country: payload.country,
    region: payload.region,
    city: payload.city,
    language: payload.language,
    browser,
    os,
    device,
    screen: payload.screen,
    timestamp: receivedAt,
  };

  if (payload.type === "pageview") {
    await prisma.pageview.create({
      data: {
        ...baseData,
        path: payload.path || "/",
        url: payload.url,
        title: payload.title,
      },
    });
    await incrementDailyMetric(website, "PAGEVIEWS", receivedAt);
    const pageviewUsage = await incrementUsage(website, "PAGEVIEWS", receivedAt);
    if (pageviewUsage >= Math.ceil(limits.pageviewsPerMonth * 0.8) || pageviewUsage >= limits.pageviewsPerMonth) {
      await dispatchQuotaWarning({
        tenantId: website.tenantId,
        userId: website.userId,
        projectId: website.projectId,
        metric: "PAGEVIEWS",
        used: pageviewUsage,
        limit: limits.pageviewsPerMonth,
      });
    }
  } else {
    await prisma.event.create({
      data: {
        ...baseData,
        name: payload.name ?? "event",
        properties: payload.properties as Prisma.InputJsonValue | undefined,
        url: payload.url,
      },
    });
    await incrementDailyMetric(website, "EVENTS", receivedAt);
    const eventUsage = await incrementUsage(website, "EVENTS", receivedAt);
    if (eventUsage >= Math.ceil(limits.eventsPerMonth * 0.8) || eventUsage >= limits.eventsPerMonth) {
      await dispatchQuotaWarning({
        tenantId: website.tenantId,
        userId: website.userId,
        projectId: website.projectId,
        metric: "EVENTS",
        used: eventUsage,
        limit: limits.eventsPerMonth,
      });
    }
  }

  const wasFirstPageview = session.pageviewCount === 0 && payload.type === "pageview";
  const durationSeconds = Math.max(
    0,
    Math.floor((receivedAt.getTime() - session.startedAt.getTime()) / 1000),
  );

  await prisma.session.update({
    where: { id: session.id },
    data: {
      endedAt: receivedAt,
      durationSeconds,
      isBounce: wasFirstPageview ? true : false,
      exitPath: payload.path,
    },
  });

  if (payload.visitorId) {
    const day = startOfDay(receivedAt).toISOString();
    const added = await redis.sadd(`vis:${website.id}:${day}`, payload.visitorId);
    if (added) {
      await incrementDailyMetric(website, "VISITORS", receivedAt);
      await incrementUsage(website, "VISITORS", receivedAt);
    }
  }

  const sessionDay = startOfDay(receivedAt).toISOString();
  const addedSession = await redis.sadd(`ses:${website.id}:${sessionDay}`, sessionKey);
  if (addedSession) {
    await incrementDailyMetric(website, "SESSIONS", receivedAt);
    await incrementUsage(website, "SESSIONS", receivedAt);
  }
}

const concurrency = Number(process.env.WORKER_CONCURRENCY ?? "4");

const worker = new Worker<TrackPayload>("analytics-events", processJob, {
  connection: redis,
  concurrency,
});

worker.on("completed", (job) => {
  console.log(`analytics job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`analytics job ${job?.id} failed`, error);
});

console.log(`Infvar analytics worker started (concurrency ${concurrency})`);
startNotificationScheduler();

async function shutdown() {
  try {
    await worker.close();
  } catch {
    // Worker may already be closing its connections.
  }
  try {
    await redis.quit();
  } catch {
    // Redis connection may already be closed.
  }
  try {
    await prisma.$disconnect();
  } catch {
    // Database client may already be disconnected.
  }
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
