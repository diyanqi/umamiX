"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { TrafficChart, type ChartPoint } from "./traffic-chart";
import { BarList } from "./bar-list";
import { StatCard } from "./stat-card";
import { formatDuration, formatNumber } from "@/lib/utils";

type PublicStats = {
  website: { name: string; domain: string };
  stats: {
    overview: {
      pageviews: number;
      visitors: number;
      sessions: number;
      bounceRate: number;
      avgDurationSeconds: number;
      series: ChartPoint[];
    };
    pages: Array<{ path: string; _count: { _all: number } }>;
    referrers: Array<{ referrerDomain: string | null; _count: { _all: number } }>;
  };
};

export function PublicStatsView({ shareId }: { shareId: string }) {
  const [data, setData] = useState<PublicStats | null>(null);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);

  const load = useCallback(
    async (nextDays: number) => {
      setError("");
      const response = await fetch(`/api/public/stats?shareId=${shareId}&days=${nextDays}`);
      if (response.ok) {
        setData((await response.json()) as PublicStats);
      } else {
        setError("分享链接无效或网站已停用");
      }
    },
    [shareId],
  );

  useEffect(() => {
    void load(days);
  }, [days, load]);

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  if (!data) {
    return <div className="rounded-lg border bg-card p-12 text-center text-sm text-muted-foreground">加载中...</div>;
  }

  const { overview } = data.stats;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{data.website.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data.website.domain}</p>
        </div>
        <div className="flex rounded-md border bg-card p-0.5">
          {[7, 30, 90].map((value) => (
            <button
              key={value}
              onClick={() => setDays(value)}
              className={`rounded px-3 py-1.5 text-xs ${
                days === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {value} 天
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="页面浏览" value={formatNumber(overview.pageviews)} accent />
        <StatCard label="独立访客" value={formatNumber(overview.visitors)} />
        <StatCard label="会话" value={formatNumber(overview.sessions)} />
        <StatCard
          label="跳出率 / 平均时长"
          value={`${overview.bounceRate}%`}
          hint={formatDuration(overview.avgDurationSeconds)}
        />
      </div>

      <div className="rounded-lg border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">流量趋势</h2>
        <TrafficChart data={overview.series} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold">热门页面</h2>
          <BarList items={data.stats.pages.map((page) => ({ label: page.path, count: page._count._all }))} />
        </div>
        <div className="rounded-lg border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold">来源</h2>
          <BarList
            items={data.stats.referrers.map((referrer) => ({
              label: referrer.referrerDomain ?? "direct",
              count: referrer._count._all,
            }))}
          />
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        由无尽分析 Infvar Analytics 提供 · {format(new Date(), "yyyy-MM-dd")}
      </p>
    </div>
  );
}
