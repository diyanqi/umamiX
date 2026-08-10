import { formatNumber } from "@/lib/utils";

export function BarList({
  items,
}: {
  items: Array<{ label: string; count: number }>;
}) {
  const max = Math.max(1, ...items.map((item) => item.count));
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">暂无数据</p>;
  }
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-32 truncate text-xs text-muted-foreground" title={item.label}>
            {item.label}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/70"
              style={{ width: `${Math.max(3, (item.count / max) * 100)}%` }}
            />
          </div>
          <span className="w-14 text-right text-xs tabular-nums">{formatNumber(item.count)}</span>
        </div>
      ))}
    </div>
  );
}
