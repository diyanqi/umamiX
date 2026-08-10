import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertWebsiteAccess } from "@/lib/auth-helpers";
import { getActivePlan } from "@/lib/plans";
import { runReport, type ReportConfig } from "@/lib/analytics/reports";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const report = await prisma.report.findUnique({
    where: { id },
    select: {
      id: true,
      kind: true,
      config: true,
      websiteId: true,
      projectId: true,
      tenantId: true,
      userId: true,
    },
  });
  if (!report) {
    return NextResponse.json({ error: "report_not_found" }, { status: 404 });
  }

  if (report.websiteId) {
    try {
      await assertWebsiteAccess(session.user.id, report.websiteId);
    } catch {
      return NextResponse.json({ error: "website_not_found" }, { status: 404 });
    }
  } else {
    return NextResponse.json({ error: "website_required" }, { status: 400 });
  }

  const { limits } = await getActivePlan(report.projectId);
  const advancedKinds = ["FUNNEL", "RETENTION", "JOURNEY", "ATTRIBUTION"];
  if (advancedKinds.includes(report.kind) && !limits.advancedReports) {
    return NextResponse.json({ error: "advanced_reports_not_included" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { days?: number };
  const days = Math.min(90, Math.max(7, Number(body.days ?? 30)));
  const result = await runReport(
    report.kind,
    report.websiteId,
    report.config as ReportConfig,
    days,
  );

  return NextResponse.json({ result });
}
