"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { TrafficChart, type ChartPoint } from "./traffic-chart";
import { BarList } from "./bar-list";
import { StatCard } from "./stat-card";
import { formatDuration, formatNumber } from "@/lib/utils";

type Overview = {
  pageviews: number;
  visitors: number;
  sessions: number;
  bounceRate: number;
  avgDurationSeconds: number;
  series: ChartPoint[];
};

type Stats = {
  overview: Overview;
  pages: Array<{ path: string; _count: { _all: number } }>;
  referrers: Array<{ referrerDomain: string | null; _count: { _all: number } }>;
  countries: Array<{ country: string | null; _count: { _all: number } }>;
  languages: Array<{ language: string | null; _count: { _all: number } }>;
  devices: {
    browsers: Array<{ browser: string; _count: { _all: number } }>;
    operatingSystems: Array<{ os: string; _count: { _all: number } }>;
    devices: Array<{ device: string; _count: { _all: number } }>;
  };
  events: Array<{ name: string; count: number }>;
  recent: Array<{
    path: string;
    title: string | null;
    country: string | null;
    browser: string | null;
    os: string | null;
    device: string | null;
    timestamp: string;
  }>;
  previous?: {
    pageviews: number;
    visitors: number;
    sessions: number;
    bounceRate: number;
  };
};

const periods = [
  { days: 7, label: "7 天" },
  { days: 30, label: "30 天" },
  { days: 90, label: "90 天" },
];

export function WebsiteAnalytics({
  websiteId,
  initialStats,
}: {
  websiteId: string;
  initialStats: Stats;
}) {
  const [stats, setStats] = useState<Stats>(initialStats);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (nextDays: number) => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/stats?websiteId=${websiteId}&days=${nextDays}&compare=1`,
        );
        if (response.ok) {
          const data = (await response.json()) as Stats;
          setStats(data);
        }
      } finally {
        setLoading(false);
      }
    },
    [websiteId],
  );

  useEffect(() => {
    void load(days);
  }, [days, load]);

  const { overview } = stats;
  const changePercent = (current: number, previous: number) => {
    if (!previous) return undefined;
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? "+" : ""}${Math.round(change * 10) / 10}%`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">时间范围</span>
          <div className="flex rounded-md border bg-card p-0.5">
            {periods.map((period) => (
              <button
                key={period.days}
                onClick={() => setDays(period.days)}
                className={`rounded px-3 py-1.5 text-xs ${
                  days === period.days
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
        {loading ? <span className="text-xs text-muted-foreground">加载中...</span> : null}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="页面浏览"
          value={formatNumber(overview.pageviews)}
          accent
          hint={stats.previous ? changePercent(overview.pageviews, stats.previous.pageviews) : undefined}
        />
        <StatCard
          label="独立访客"
          value={formatNumber(overview.visitors)}
          hint={stats.previous ? changePercent(overview.visitors, stats.previous.visitors) : undefined}
        />
        <StatCard
          label="会话"
          value={formatNumber(overview.sessions)}
          hint={stats.previous ? changePercent(overview.sessions, stats.previous.sessions) : undefined}
        />
        <StatCard
          label="跳出率 / 平均时长"
          value={`${overview.bounceRate}%`}
          hint={`${formatDuration(overview.avgDurationSeconds)} · 较上期 ${
            stats.previous
              ? `${overview.bounceRate - stats.previous.bounceRate >= 0 ? "+" : ""}${Math.round((overview.bounceRate - stats.previous.bounceRate) * 10) / 10}pp`
              : "—"
          }`}
        />
      </div>

      <div className="rounded-lg border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">流量趋势</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">最近 {days} 天页面浏览</p>
          </div>
        </div>
        <TrafficChart data={overview.series} />
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
        <div className="rounded-lg border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold">国家 / 地区</h2>
          <BarList
            items={stats.countries.map((country) => ({
              label: country.country ?? "未知",
              count: country._count._all,
            }))}
          />
        </div>
        <div className="rounded-lg border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold">语言</h2>
          <BarList
            items={stats.languages.map((language) => ({
              label: language.language ?? "未知",
              count: language._count._all,
            }))}
          />
        </div>
        <div className="rounded-lg border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold">设备</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <BarList
              items={stats.devices.browsers.map((item) => ({
                label: item.browser,
                count: item._count._all,
              }))}
            />
            <BarList
              items={stats.devices.operatingSystems.map((item) => ({
                label: item.os,
                count: item._count._all,
              }))}
            />
            <BarList
              items={stats.devices.devices.map((item) => ({
                label: item.device,
                count: item._count._all,
              }))}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">事件</h2>
        {stats.events.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            暂无自定义事件，使用 analytics.track(&quot;event&quot;, {}) 即可开始收集
          </p>
        ) : (
          <BarList
            items={stats.events.map((event) => ({
              label: event.name,
              count: event.count,
            }))}
          />
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <div className="p-5 pb-3">
          <h2 className="text-sm font-semibold">最近访问</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] text-sm">
            <thead>
              <tr className="border-y text-left text-xs text-muted-foreground">
                <th className="p-3 font-medium">页面</th>
                <th className="p-3 font-medium">地区</th>
                <th className="p-3 font-medium">浏览器</th>
                <th className="p-3 font-medium">系统</th>
                <th className="p-3 font-medium">设备</th>
                <th className="p-3 font-medium">时间</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent.map((row, index) => (
                <tr key={`${row.path}-${index}`} className="border-b last:border-0">
                  <td className="max-w-56 truncate p-3 font-medium">{row.path}</td>
                  <td className="p-3 text-muted-foreground">{row.country ?? "未知"}</td>
                  <td className="p-3 text-muted-foreground">{row.browser ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{row.os ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{row.device ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">
                    {format(new Date(row.timestamp), "MM/dd HH:mm")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
