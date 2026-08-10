"use client";

import { useCallback, useEffect, useState } from "react";
import { BarList } from "./bar-list";

type PropertyData = {
  eventCount: number;
  keys: Array<{
    key: string;
    count: number;
    values: Array<{ value: string; count: number }>;
  }>;
};

export function EventPropertiesPanel({
  websiteId,
  eventNames,
}: {
  websiteId: string;
  eventNames: string[];
}) {
  const [name, setName] = useState(eventNames[0] ?? "");
  const [data, setData] = useState<PropertyData | null>(null);

  const load = useCallback(
    async (nextName: string) => {
      if (!nextName) {
        setData(null);
        return;
      }
      const response = await fetch(
        `/api/events/properties?websiteId=${websiteId}&name=${encodeURIComponent(nextName)}&days=30`,
      );
      if (response.ok) {
        setData((await response.json()) as PropertyData);
      }
    },
    [websiteId],
  );

  useEffect(() => {
    void load(name);
  }, [name, load]);

  if (eventNames.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        暂无事件属性，发送带 properties 的事件后即可分析
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <select
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="h-9 w-full max-w-xs rounded-md border border-input bg-card px-3 text-sm"
      >
        {eventNames.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>

      {data ? (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">最近 30 天 {data.eventCount} 条事件</p>
          <div className="grid gap-4 lg:grid-cols-2">
            {data.keys.map((key) => (
              <div key={key.key} className="rounded-md border p-3">
                <p className="mb-2 text-sm font-medium">{key.key}</p>
                <BarList items={key.values.map((item) => ({ label: item.value, count: item.count }))} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">该事件暂无属性数据</p>
      )}
    </div>
  );
}
