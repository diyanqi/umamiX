import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { authenticateApiKey } from "@/lib/api-auth";
import { assertWebsiteAccess } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getPeriodRange } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await auth();
  let userId = session?.user?.id;
  if (!userId) {
    const apiKey = await authenticateApiKey(request, ["ANALYTICS_READ"]);
    if (!apiKey) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    userId = apiKey.userId;
  }

  const websiteId = request.nextUrl.searchParams.get("websiteId");
  const name = request.nextUrl.searchParams.get("name");
  if (!websiteId || !name) {
    return NextResponse.json({ error: "websiteId_and_name_required" }, { status: 400 });
  }

  try {
    await assertWebsiteAccess(userId, websiteId);
  } catch {
    return NextResponse.json({ error: "website_not_found" }, { status: 404 });
  }

  const days = Math.min(90, Math.max(1, Number(request.nextUrl.searchParams.get("days") ?? "30")));
  const { start, end } = getPeriodRange(days);
  const events = await prisma.event.findMany({
    where: {
      websiteId,
      name,
      timestamp: { gte: start, lte: end },
      properties: { not: Prisma.DbNull },
    },
    select: { properties: true },
    orderBy: { timestamp: "desc" },
    take: 500,
  });

  const counts = new Map<string, Map<string, number>>();
  for (const event of events) {
    const properties = event.properties as Record<string, unknown> | null;
    if (!properties) continue;
    for (const [key, rawValue] of Object.entries(properties)) {
      if (rawValue === null || rawValue === undefined) continue;
      const value =
        typeof rawValue === "object" ? JSON.stringify(rawValue).slice(0, 80) : String(rawValue).slice(0, 80);
      const keyCounts = counts.get(key) ?? new Map<string, number>();
      keyCounts.set(value, (keyCounts.get(value) ?? 0) + 1);
      counts.set(key, keyCounts);
    }
  }

  const keys = Array.from(counts.entries())
    .map(([key, values]) => ({
      key,
      count: Array.from(values.values()).reduce((sum, count) => sum + count, 0),
      values: Array.from(values.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return NextResponse.json({ eventCount: events.length, keys });
}
