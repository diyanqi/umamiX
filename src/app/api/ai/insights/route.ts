import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertWebsiteAccess } from "@/lib/auth-helpers";
import { getActivePlan, getUsage } from "@/lib/plans";
import { getOverview, getTopPages } from "@/lib/analytics/queries";
import { generateInsights } from "@/lib/ai";

const insightsSchema = z.object({
  websiteId: z.string().min(1),
  days: z.number().int().min(1).max(90).default(30),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = insightsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { websiteId, days } = parsed.data;

  try {
    await assertWebsiteAccess(session.user.id, websiteId);
  } catch {
    return NextResponse.json({ error: "website_not_found" }, { status: 404 });
  }

  const website = await prisma.website.findUnique({
    where: { id: websiteId },
    select: { name: true, projectId: true, tenantId: true, userId: true },
  });
  if (!website) {
    return NextResponse.json({ error: "website_not_found" }, { status: 404 });
  }

  const { limits } = await getActivePlan(website.projectId);
  if (!limits.aiInsights) {
    return NextResponse.json({ error: "ai_not_included" }, { status: 403 });
  }

  const aiCalls = await getUsage(website.projectId, "AI_CALLS");
  if (aiCalls >= 200) {
    return NextResponse.json({ error: "ai_quota_exceeded" }, { status: 429 });
  }

  const [overview, pages] = await Promise.all([
    getOverview(websiteId, days),
    getTopPages(websiteId, days, 10),
  ]);

  let insight: string;
  try {
    insight = await generateInsights({
      websiteName: website.name,
      days,
      pageviews: overview.pageviews,
      visitors: overview.visitors,
      sessions: overview.sessions,
      bounceRate: overview.bounceRate,
      topPages: pages.map((page) => ({
        path: page.path,
        count: page._count._all,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json(
      { error: "ai_provider_error", message },
      { status: 503 },
    );
  }

  const periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  await prisma.usageRecord.upsert({
    where: {
      projectId_metric_periodStart: {
        projectId: website.projectId,
        metric: "AI_CALLS",
        periodStart,
      },
    },
    create: {
      tenantId: website.tenantId,
      userId: website.userId,
      projectId: website.projectId,
      metric: "AI_CALLS",
      periodStart,
      periodEnd: new Date(
        new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 1),
      ),
      quantity: 1,
    },
    update: { quantity: { increment: 1 } },
  });

  return NextResponse.json({ insight });
}
