import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Globe, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserOrganizationIds } from "@/lib/auth-helpers";
import { getWebsiteStats } from "@/lib/analytics/queries";
import { getActivePlan, getMonthRange, parseLimits } from "@/lib/plans";
import { StatCard } from "@/components/dashboard/stat-card";
import { TrafficChart } from "@/components/dashboard/traffic-chart";
import { BarList } from "@/components/dashboard/bar-list";
import { formatDuration, formatNumber } from "@/lib/utils";
import { getInstanceSlug } from "@/lib/instance";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "概览",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const organizationIds = await getUserOrganizationIds(session.user.id);
  const instanceSlug = await getInstanceSlug();
  let projects = await prisma.project.findMany({
    where: { organizationId: { in: organizationIds } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      websites: {
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, domain: true },
      },
    },
  });
  if (instanceSlug) {
    const matched = projects.filter((project) => project.slug === instanceSlug);
    if (matched.length === 0) notFound();
    projects = matched;
  }

  const firstWebsite = projects.flatMap((project) => project.websites)[0];
  const stats = firstWebsite ? await getWebsiteStats(firstWebsite.id, 30) : null;

  const firstProject = projects[0];
  const planInfo = firstProject ? await getActivePlan(firstProject.id) : null;
  const limits = planInfo?.plan ? parseLimits(planInfo.plan.limits) : null;
  const { start, end } = getMonthRange();
  const usage = firstProject
    ? await prisma.usageRecord.findMany({
        where: { projectId: firstProject.id, periodStart: start, periodEnd: end },
        select: { metric: true, quantity: true },
      })
    : [];
  const usageMap = Object.fromEntries(usage.map((item) => [item.metric, item.quantity]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">概览</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {firstWebsite
              ? `${firstWebsite.name} · ${firstWebsite.domain}`
              : "欢迎使用无尽分析"}
          </p>
        </div>
        {firstWebsite ? (
          <Link
            href={`/dashboard/websites/${firstWebsite.id}`}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            查看完整分析 <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>

      {!firstWebsite || !stats ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Globe className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-4 text-base font-semibold">开始收集流量</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            创建网站、复制追踪脚本，然后访问你的站点即可看到真实数据。
          </p>
          <Link
            href="/dashboard/websites"
            className="mt-6 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            前往网站管理
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="页面浏览" value={formatNumber(stats.overview.pageviews)} accent />
            <StatCard label="独立访客" value={formatNumber(stats.overview.visitors)} />
            <StatCard label="会话" value={formatNumber(stats.overview.sessions)} />
            <StatCard
              label="跳出率"
              value={`${stats.overview.bounceRate}%`}
              hint={formatDuration(stats.overview.avgDurationSeconds)}
            />
          </div>

          <div className="rounded-lg border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">最近 30 天流量</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{firstWebsite.domain}</p>
              </div>
            </div>
            <TrafficChart data={stats.overview.series} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border bg-card p-5">
              <h2 className="mb-4 text-sm font-semibold">热门页面</h2>
              <BarList
                items={stats.pages.map((page) => ({
                  label: page.path,
                  count: page._count._all,
                }))}
              />
            </div>
            <div className="rounded-lg border bg-card p-5">
              <h2 className="mb-4 text-sm font-semibold">来源</h2>
              <BarList
                items={stats.referrers.map((referrer) => ({
                  label: referrer.referrerDomain ?? "direct",
                  count: referrer._count._all,
                }))}
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border bg-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">计划与配额</h2>
                <Link href="/dashboard/settings" className="text-xs font-medium text-primary">
                  管理
                </Link>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">计划</span>
                  <span className="font-medium">{planInfo?.plan?.name ?? "Free"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">网站</span>
                  <span className="font-medium">
                    {projects.flatMap((project) => project.websites).length}
                    {limits ? ` / ${limits.websites === 999 ? "∞" : limits.websites}` : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">本月事件</span>
                  <span className="font-medium">
                    {formatNumber(usageMap.EVENTS ?? 0)}
                    {limits ? ` / ${formatNumber(limits.eventsPerMonth)}` : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">本月页面浏览</span>
                  <span className="font-medium">
                    {formatNumber(usageMap.PAGEVIEWS ?? 0)}
                    {limits ? ` / ${formatNumber(limits.pageviewsPerMonth)}` : ""}
                  </span>
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-card p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <h2 className="text-sm font-semibold">AI 洞察</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {limits?.aiInsights
                  ? "进入网站分析页生成流量总结、异常归因与周报建议。"
                  : "Pro 计划包含 AI 洞察，可自动解释流量变化。"}
              </p>
              {firstWebsite ? (
                <Link
                  href={`/dashboard/websites/${firstWebsite.id}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary"
                >
                  生成洞察 <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
