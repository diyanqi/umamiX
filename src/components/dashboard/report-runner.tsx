"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

type Report = {
  id: string;
  name: string;
  kind: string;
  websiteId: string | null;
  createdAt: string;
};

const kindLabels: Record<string, string> = {
  FUNNEL: "漏斗分析",
  RETENTION: "留存分析",
  UTM: "UTM 分析",
  GOALS: "目标跟踪",
  JOURNEY: "用户旅程",
  ATTRIBUTION: "归因分析",
};

export function ReportRunner({ reports }: { reports: Report[] }) {
  const [runningId, setRunningId] = useState("");
  const [days, setDays] = useState(30);
  const [result, setResult] = useState<{ id: string; text: string } | null>(null);
  const [error, setError] = useState("");

  async function run(id: string) {
    setRunningId(id);
    setError("");
    try {
      const response = await fetch(`/api/reports/${id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error === "advanced_reports_not_included" ? "当前计划不包含高级报告" : "运行失败");
        return;
      }
      setResult({ id, text: JSON.stringify(data.result, null, 2) });
    } finally {
      setRunningId("");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">时间范围</span>
        <select
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
          className="h-9 rounded-md border border-input bg-card px-3 text-sm"
        >
          <option value={7}>7 天</option>
          <option value={30}>30 天</option>
          <option value={90}>90 天</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="p-4 font-medium">名称</th>
                <th className="p-4 font-medium">类型</th>
                <th className="p-4 font-medium">创建时间</th>
                <th className="p-4 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-b last:border-0">
                  <td className="p-4 font-medium">{report.name}</td>
                  <td className="p-4 text-muted-foreground">{kindLabels[report.kind] ?? report.kind}</td>
                  <td className="p-4 text-muted-foreground">
                    {new Intl.DateTimeFormat("zh-CN").format(new Date(report.createdAt))}
                  </td>
                  <td className="p-4 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => run(report.id)}
                      disabled={runningId === report.id || !report.websiteId}
                    >
                      <Play className="h-3.5 w-3.5" />
                      {runningId === report.id ? "运行中..." : "运行"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {result ? (
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">运行结果</p>
            <button onClick={() => setResult(null)} className="text-xs text-muted-foreground hover:text-foreground">
              关闭
            </button>
          </div>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-4 text-xs leading-6">
            {result.text}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
