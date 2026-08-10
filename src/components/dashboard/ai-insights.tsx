"use client";

import { useState } from "react";
import { Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AiInsights({ websiteId }: { websiteId: string }) {
  const [days, setDays] = useState(30);
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    setInsight("");
    try {
      const response = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId, days }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(
          data.error === "ai_not_included"
            ? "当前计划不包含 AI 洞察，升级 Pro 后可用"
            : data.error === "ai_provider_error"
              ? "AI 服务未配置或暂时不可用"
              : "生成失败",
        );
        return;
      }
      setInsight(data.insight);
    } catch {
      setError("生成失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold">AI 洞察</h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className="h-8 rounded-md border border-input bg-card px-2 text-xs"
          >
            <option value={7}>7 天</option>
            <option value={30}>30 天</option>
            <option value={90}>90 天</option>
          </select>
          <Button size="sm" onClick={generate} disabled={loading}>
            <Bot className="h-3.5 w-3.5" />
            {loading ? "分析中..." : "生成洞察"}
          </Button>
        </div>
      </div>
      {insight ? (
        <pre className="mt-4 whitespace-pre-wrap rounded-md bg-muted p-4 text-sm leading-7 text-foreground">
          {insight}
        </pre>
      ) : null}
      {error ? <p className="mt-4 text-xs text-destructive">{error}</p> : null}
      {!insight && !error ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          使用 OpenAI 兼容接口总结流量变化、解释异常峰值并生成周报建议。
        </p>
      ) : null}
    </div>
  );
}
