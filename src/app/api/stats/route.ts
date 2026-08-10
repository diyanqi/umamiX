import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { authenticateApiKey } from "@/lib/api-auth";
import { assertWebsiteAccess } from "@/lib/auth-helpers";
import {
  getWebsiteStats,
  getOverviewBetween,
  type StatsFilters,
} from "@/lib/analytics/queries";
import { getPeriodRange } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await auth();
  let userId = session?.user?.id;
  if (!userId) {
    const apiKey = await authenticateApiKey(request);
    if (!apiKey) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    userId = apiKey.userId;
  }

  const websiteId = request.nextUrl.searchParams.get("websiteId");
  const filters: StatsFilters = {
    path: request.nextUrl.searchParams.get("path") ?? undefined,
    referrer: request.nextUrl.searchParams.get("referrer") ?? undefined,
    country: request.nextUrl.searchParams.get("country") ?? undefined,
    browser: request.nextUrl.searchParams.get("browser") ?? undefined,
    os: request.nextUrl.searchParams.get("os") ?? undefined,
    device: request.nextUrl.searchParams.get("device") ?? undefined,
  };
  const days = Math.min(
    365,
    Math.max(1, Number(request.nextUrl.searchParams.get("days") ?? "30")),
  );

  if (!websiteId) {
    return NextResponse.json({ error: "websiteId_required" }, { status: 400 });
  }

  try {
    await assertWebsiteAccess(userId, websiteId);
  } catch {
    return NextResponse.json({ error: "website_not_found" }, { status: 404 });
  }

  const stats = await getWebsiteStats(websiteId, days, filters);
  if (request.nextUrl.searchParams.get("compare") === "1") {
    const { start } = getPeriodRange(days);
    const previousEnd = new Date(start.getTime());
    const previousStart = new Date(previousEnd.getTime() - days * 86_400_000);
    const previous = await getOverviewBetween(
      websiteId,
      previousStart,
      previousEnd,
      filters,
    );
    return NextResponse.json({ ...stats, previous });
  }
  return NextResponse.json(stats);
}
