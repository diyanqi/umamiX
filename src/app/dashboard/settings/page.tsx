import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserOrganizationIds } from "@/lib/auth-helpers";
import { getActivePlan, getMonthRange, parseLimits } from "@/lib/plans";
import { ApiKeysPanel } from "@/components/dashboard/api-keys-panel";
import { NotificationSettings } from "@/components/dashboard/notification-settings";
import { ProjectManager } from "@/components/dashboard/project-manager";
import { NotificationHistory } from "@/components/dashboard/notification-history";
import { PlanSwitcher } from "@/components/dashboard/plan-switcher";
import { TeamPanel } from "@/components/dashboard/team-panel";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "设置",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const organizationIds = await getUserOrganizationIds(session.user.id);
  const [projects, plans] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId: { in: organizationIds } },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        code: true,
        name: true,
        priceMonthly: true,
        description: true,
      },
    }),
  ]);

  const firstProject = projects[0];
  const planInfo = firstProject ? await getActivePlan(firstProject.id) : null;
  const { start, end } = getMonthRange();
  const usage = firstProject
    ? await prisma.usageRecord.findMany({
        where: { projectId: firstProject.id, periodStart: start, periodEnd: end },
        select: { metric: true, quantity: true },
      })
    : [];

  const usageMap = Object.fromEntries(usage.map((item) => [item.metric, item.quantity]));
  const limits = planInfo ? parseLimits(planInfo.plan?.limits) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">设置</h1>
        <p className="mt-1 text-sm text-muted-foreground">计划、API、通知与团队</p>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">当前计划</p>
              <h2 className="mt-1 text-2xl font-semibold">{planInfo?.plan?.name ?? "Free"}</h2>
            </div>
            <Badge variant={planInfo?.subscription?.status === "ACTIVE" ? "default" : "secondary"}>
              {planInfo?.subscription?.status ?? "ACTIVE"}
            </Badge>
          </div>
          {limits ? (
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs text-muted-foreground">网站配额</p>
                <p className="mt-1 font-semibold">{limits.websites === 999 ? "∞" : limits.websites}</p>
              </div>
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs text-muted-foreground">数据保留</p>
                <p className="mt-1 font-semibold">{limits.retentionDays} 天</p>
              </div>
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs text-muted-foreground">本月页面浏览</p>
                <p className="mt-1 font-semibold">
                  {new Intl.NumberFormat().format(usageMap.PAGEVIEWS ?? 0)}
                  <span className="text-xs font-normal text-muted-foreground">
                    {" "}/ {new Intl.NumberFormat().format(limits.pageviewsPerMonth)}
                  </span>
                </p>
              </div>
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs text-muted-foreground">本月事件</p>
                <p className="mt-1 font-semibold">
                  {new Intl.NumberFormat().format(usageMap.EVENTS ?? 0)}
                  <span className="text-xs font-normal text-muted-foreground">
                    {" "}/ {new Intl.NumberFormat().format(limits.eventsPerMonth)}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">尚未创建项目</p>
          )}
          {firstProject ? (
            <div className="mt-6 border-t pt-5">
              <p className="mb-3 text-xs font-medium text-muted-foreground">切换计划</p>
              <PlanSwitcher
                plans={plans}
                projectId={firstProject.id}
                currentCode={planInfo?.plan?.code ?? "free"}
              />
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border bg-card p-5">
          <h2 className="text-sm font-semibold">通知设置</h2>
          <div className="mt-4">
            <NotificationSettings />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="text-sm font-semibold">API 密钥</h2>
        <p className="mt-1 text-xs text-muted-foreground">用于服务端读取与写入分析数据</p>
        <div className="mt-5">
          <ApiKeysPanel projects={projects} />
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="text-sm font-semibold">项目</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          每个项目独立计数配额与分析资源
        </p>
        <div className="mt-5">
          <ProjectManager />
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="text-sm font-semibold">通知记录</h2>
        <div className="mt-4">
          <NotificationHistory />
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="text-sm font-semibold">团队</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Business 计划支持更多成员与权限
        </p>
        <div className="mt-4">
          <TeamPanel />
        </div>
      </section>
    </div>
  );
}
