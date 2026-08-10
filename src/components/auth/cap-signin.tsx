"use client";

import { createElement, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { GitBranch, ShieldCheck } from "lucide-react";
import "cap-widget";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function CapSignIn() {
  const widgetRef = useRef<HTMLElement | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    const element = widgetRef.current;
    if (!element) return;

    const handleSolve = (event: Event) => {
      const detail = (event as CustomEvent<{ token: string }>).detail;
      if (!detail?.token) return;
      setToken(detail.token);
      void fetch("/api/cap/cookie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: detail.token }),
      });
    };

    const handleError = () => {
      setToken("");
    };

    element.addEventListener("solve", handleSolve);
    element.addEventListener("error", handleError);
    return () => {
      element.removeEventListener("solve", handleSolve);
      element.removeEventListener("error", handleError);
    };
  }, []);

  async function startSignIn() {
    if (!token) return;
    setBusy(true);
    await signIn("github", { callbackUrl: "/dashboard" });
  }

  const errorMessage =
    error === "AccessDenied"
      ? "验证未通过：请先完成 Proof-of-Work 验证，并确保 GitHub 账号注册超过 1 个月。"
      : error === "Configuration"
        ? "登录配置不完整，请检查 GitHub OAuth 设置。"
        : null;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <CardTitle className="text-lg">登录无尽分析</CardTitle>
        <CardDescription>
          仅支持 GitHub 账号。注册与登录都需要通过 Proof-of-Work 验证。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex justify-center">
          {createElement("cap-widget", {
            ref: widgetRef,
            "data-cap-api-endpoint": "/api/cap/",
            "data-cap-i18n-initial-state": "验证你是人类",
            "data-cap-i18n-verifying-label": "验证中...",
            "data-cap-i18n-solved-label": "已验证",
          })}
        </div>

        {errorMessage ? (
          <p className="rounded-md bg-destructive/10 p-3 text-xs leading-5 text-destructive">
            {errorMessage}
          </p>
        ) : null}

        <Button
          className="w-full"
          variant={token ? "default" : "outline"}
          disabled={!token || busy}
          onClick={startSignIn}
        >
          <GitBranch className="h-4 w-4" />
          {busy ? "正在跳转 GitHub..." : "使用 GitHub 登录"}
        </Button>

        <p className="text-center text-xs leading-5 text-muted-foreground">
          不收集 Cookie、不做指纹识别。GitHub 账号年龄不足 1 个月将无法注册。
        </p>
      </CardContent>
    </Card>
  );
}
