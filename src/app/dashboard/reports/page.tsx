import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileBarChart } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserOrganizationIds, getUserProjectIds } from "@/lib/auth-helpers";
import { ReportBuilder } from "@/components/dashboard/report-builder";
import { ReportRunner } from "@/components/dashboard/report-runner";

export const metadata: Metadata = {
  title: "报告",
};

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const organizationIds = await getUserOrganizationIds(session.user.id);
  const projects = await prisma.project.findMany({
    where: { organizationId: { in: organizationIds } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  const projectIds = await getUserProjectIds(session.user.id);
  const reports = await prisma.report.findMany({
    where: { projectId: { in: Array.from(projectIds) } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      kind: true,
      websiteId: true,
      createdAt: true,
    },
  });

  const serializableReports = reports.map((report) => ({
    ...report,
    createdAt: report.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">报告</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            漏斗、留存、UTM、旅程与归因分析
          </p>
        </div>
        <ReportBuilder projects={projects} />
      </div>

      {reports.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <FileBarChart className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-4 text-base font-semibold">还没有报告</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            创建漏斗、留存或 UTM 报告，为后续分析配置保存常用视图。
          </p>
        </div>
      ) : (
        <ReportRunner reports={serializableReports} />
      )}
    </div>
  );
}
