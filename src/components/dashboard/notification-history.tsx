"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { BellRing } from "lucide-react";

type Notification = {
  id: string;
  kind: string;
  provider: string;
  title: string;
  body: string;
  status: string;
  createdAt: string;
  sentAt: string | null;
};

export function NotificationHistory() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const load = useCallback(async () => {
    const response = await fetch("/api/notifications");
    if (response.ok) {
      const data = (await response.json()) as { notifications: Notification[] };
      setNotifications(data.notifications);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BellRing className="h-4 w-4" />
        最近通知
      </div>
      {notifications.length === 0 ? (
        <p className="rounded-md border p-4 text-sm text-muted-foreground">
          暂无通知。配置 OpenClaw 后，每日统计、周报、异常与配额预警会出现在这里。
        </p>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div key={notification.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{notification.title}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    notification.status === "SENT"
                      ? "bg-emerald-100 text-emerald-700"
                      : notification.status === "FAILED"
                        ? "bg-red-100 text-red-700"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {notification.status}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{notification.body}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {format(new Date(notification.createdAt), "MM/dd HH:mm")} · {notification.provider}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
