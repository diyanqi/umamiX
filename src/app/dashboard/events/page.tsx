import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Zap } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserOrganizationIds } from "@/lib/auth-helpers";
import { getEventBreakdown } from "@/lib/analytics/queries";
import { BarList } from "@/components/dashboard/bar-list";
import { GoalsPanel } from "@/components/dashboard/goals-panel";
import { EventPropertiesPanel } from "@/components/dashboard/event-properties-panel";
import { format } from "date-fns";

export const metadata: Metadata = {
  title: "事件",
};

export default async function EventsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const organizationIds = await getUserOrganizationIds(session.user.id);
  const website = await prisma.website.findFirst({
    where: { project: { organizationId: { in: organizationIds } } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, projectId: true },
  });

  const events = website ? await getEventBreakdown(website.id, 30, 50) : [];
  const recentEvents = website
    ? await prisma.event.findMany({
        where: { websiteId: website.id },
        orderBy: { timestamp: "desc" },
        take: 20,
        select: {
          id: true,
          name: true,
          properties: true,
          url: true,
          timestamp: true,
        },
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">事件</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          自定义事件、属性与转化统计
        </p>
      </div>

      {!website ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Zap className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-4 text-base font-semibold">先添加一个网站</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            添加网站并部署追踪脚本后，自定义事件会出现在这里。
          </p>
        </div>
      ) : (
        <>
      <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border bg-card p-5">
              <h2 className="mb-4 text-sm font-semibold">事件排行</h2>
              <BarList
                items={events.map((event) => ({ label: event.name, count: event.count }))}
              />
            </div>
            <div className="rounded-lg border bg-card p-5">
              <h2 className="mb-4 text-sm font-semibold">最新事件</h2>
              <div className="space-y-3">
                {recentEvents.map((event) => (
                  <div key={event.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{event.name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{event.url ?? "—"}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {format(new Date(event.timestamp), "MM/dd HH:mm")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
      </div>
      <div className="rounded-lg border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">转化目标</h2>
        </div>
        <GoalsPanel websiteId={website.id} projectId={website.projectId} />
      </div>
      <div className="rounded-lg border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">事件属性分析</h2>
        <EventPropertiesPanel
          websiteId={website.id}
          eventNames={events.map((event) => event.name)}
        />
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
            使用 analytics.track(&quot;signup&quot;, {`{ plan: "pro" }`}) 发送自定义事件。属性会随事件保存，供报告与目标匹配使用。
          </p>
        </>
      )}
    </div>
  );
}
