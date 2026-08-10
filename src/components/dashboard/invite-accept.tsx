"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function InviteAccept({ token }: { token: string }) {
  const [state, setState] = useState<"checking" | "success" | "login" | "invalid">("checking");

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/team/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (response.status === 401) {
        setState("login");
      } else if (response.ok) {
        setState("success");
      } else {
        setState("invalid");
      }
    })();
  }, [token]);

  return (
    <div className="mx-auto max-w-md rounded-lg border bg-card p-8 text-center">
      <p className="text-lg font-semibold">团队邀请</p>
      {state === "checking" ? <p className="mt-3 text-sm text-muted-foreground">正在确认邀请...</p> : null}
      {state === "success" ? (
        <p className="mt-3 text-sm text-muted-foreground">已加入组织，现在可以访问团队项目。</p>
      ) : null}
      {state === "login" ? (
        <p className="mt-3 text-sm text-muted-foreground">请先使用被邀请的 GitHub 账号登录。</p>
      ) : null}
      {state === "invalid" ? (
        <p className="mt-3 text-sm text-muted-foreground">邀请无效、已过期或不是发给你的。</p>
      ) : null}
      {state === "login" ? (
        <Link
          href="/signin"
          className="mt-5 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground"
        >
          使用 GitHub 登录
        </Link>
      ) : null}
    </div>
  );
}
