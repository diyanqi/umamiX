"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";

const allKinds = [
  { value: "TRAFFIC_ANOMALY", label: "流量异常" },
  { value: "DAILY_STATS", label: "每日统计" },
  { value: "WEEKLY_REPORT", label: "每周报告" },
  { value: "QUOTA_WARNING", label: "配额预警" },
  { value: "SECURITY_EVENT", label: "安全事件" },
];

export function NotificationSettings() {
  const [enabled, setEnabled] = useState(true);
  const [kinds, setKinds] = useState(["TRAFFIC_ANOMALY", "QUOTA_WARNING"]);
  const [channel, setChannel] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void fetch("/api/notifications/settings")
      .then((response) => response.json())
      .then((data: { settings?: Array<{ enabled: boolean; eventKinds: string[]; config?: Record<string, unknown> }> }) => {
        const setting = data.settings?.[0];
        if (setting) {
          setEnabled(setting.enabled);
          setKinds(setting.eventKinds);
          setChannel(String(setting.config?.channel ?? ""));
        }
      });
  }, []);

  async function save() {
    const response = await fetch("/api/notifications/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "clawdbot",
        enabled,
        eventKinds: kinds,
        config: { channel },
      }),
    });
    if (response.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  }

  function toggleKind(kind: string) {
    setKinds((current) =>
      current.includes(kind)
        ? current.filter((item) => item !== kind)
        : [...current, kind],
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BellRing className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium">OpenClaw 通知</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              通过 clawdbot 发送到微信，不依赖邮件
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEnabled((value) => !value)}
          className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-muted"}`}
          aria-label="切换通知"
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
              enabled ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">通知类型</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {allKinds.map((kind) => (
            <label key={kind.value} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={kinds.includes(kind.value)}
                onChange={() => toggleKind(kind.value)}
                className="h-4 w-4 accent-primary"
              />
              {kind.label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">通道标识（可选）</p>
        <input
          value={channel}
          onChange={(event) => setChannel(event.target.value)}
          placeholder="clawdbot 会话标识"
          className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
        />
      </div>

      <Button onClick={save}>{saved ? "已保存" : "保存设置"}</Button>
    </div>
  );
}
