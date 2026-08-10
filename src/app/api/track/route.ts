import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { getAnalyticsQueue, type TrackPayload } from "@/lib/queue";
import { detectDevice, getReferrerDomain } from "@/lib/analytics/detect";
import { getActivePlan, getUsage } from "@/lib/plans";

const trackSchema = z.object({
  type: z.enum(["pageview", "event"]),
  projectId: z.string().min(1).max(120),
  websiteId: z.string().optional(),
  path: z.string().max(2000).default("/"),
  url: z.string().max(4000).optional(),
  title: z.string().max(500).optional(),
  referrer: z.string().max(4000).optional(),
  visitorId: z.string().max(200).optional(),
  sessionId: z.string().max(200).optional(),
  name: z.string().max(200).optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
  language: z.string().max(50).optional(),
  screen: z.string().max(50).optional(),
  timezone: z.string().max(100).optional(),
});

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const rateKey = `rl:track:${ip}`;
  const limit = Number(process.env.TRACKING_RATE_LIMIT_PER_MINUTE ?? "600");
  const count = await redis.incr(rateKey);
  if (count === 1) {
    await redis.expire(rateKey, 60);
  }
  if (count > limit) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = trackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const data = parsed.data;
  const website = await prisma.website.findFirst({
    where: {
      projectId: data.projectId,
      isActive: true,
      ...(data.websiteId ? { id: data.websiteId } : {}),
    },
    select: { id: true, userId: true, tenantId: true, projectId: true, domain: true },
  });

  if (!website) {
    return NextResponse.json({ error: "unknown_project" }, { status: 404 });
  }

  const { limits } = await getActivePlan(website.projectId);
  const usageMetric = data.type === "pageview" ? "PAGEVIEWS" : "EVENTS";
  const usageLimit =
    usageMetric === "PAGEVIEWS" ? limits.pageviewsPerMonth : limits.eventsPerMonth;
  const used = await getUsage(website.projectId, usageMetric);
  if (used >= usageLimit) {
    return NextResponse.json({ error: "quota_exceeded" }, { status: 429 });
  }

  const origin = request.headers.get("origin");
  const refererHost = request.headers.get("referer");
  let hostHeader: string | null = null;
  if (origin) {
    try {
      hostHeader = new URL(origin).hostname;
    } catch {
      hostHeader = null;
    }
  } else if (refererHost) {
    try {
      hostHeader = new URL(refererHost).hostname;
    } catch {
      hostHeader = null;
    }
  }

  if (hostHeader && website.domain && website.domain !== hostHeader) {
    return NextResponse.json({ error: "domain_mismatch" }, { status: 403 });
  }

  const userAgent = request.headers.get("user-agent") ?? undefined;
  const { browser, os, device } = detectDevice(userAgent);

  const payload: TrackPayload = {
    ...data,
    websiteId: website.id,
    visitorId: data.visitorId,
    sessionId: data.sessionId,
    userAgent,
    ip,
    country: request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry") ?? undefined,
    region: request.headers.get("x-vercel-ip-country-region") ?? undefined,
    city: request.headers.get("x-vercel-ip-city") ?? undefined,
    referrer: data.referrer,
    receivedAt: Date.now(),
  };

  await getAnalyticsQueue().add("event", payload, {
    jobId: `evt-${website.id}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  });

  if (process.env.NODE_ENV === "development") {
    console.log("track", {
      type: data.type,
      projectId: data.projectId,
      websiteId: website.id,
      browser,
      os,
      device,
      referrerDomain: getReferrerDomain(data.referrer),
    });
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
