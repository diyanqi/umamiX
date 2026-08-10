"use client";

import { createElement, useEffect, useRef } from "react";
import { ShieldCheck, X } from "lucide-react";
import "cap-widget";

export function SensitiveCapDialog({
  open,
  onClose,
  onVerified,
}: {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
}) {
  const widgetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = widgetRef.current;
    if (!open || !element) return;
    const handleSolve = () => onVerified();
    element.addEventListener("solve", handleSolve);
    return () => element.removeEventListener("solve", handleSolve);
  }, [open, onVerified]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">安全验证</h2>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          删除属于敏感操作，请先完成 Proof-of-Work 验证。
        </p>
        <div className="mt-5 flex justify-center">
          {createElement("cap-widget", {
            ref: widgetRef,
            "data-cap-api-endpoint": "/api/cap-sensitive/",
            "data-cap-i18n-initial-state": "验证后继续",
            "data-cap-i18n-verifying-label": "验证中...",
            "data-cap-i18n-solved-label": "已验证",
          })}
        </div>
      </div>
    </div>
  );
}
