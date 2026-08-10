"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Plan = {
  code: string;
  name: string;
  priceMonthly: number;
  description: string;
};

export function PlanSwitcher({
  plans,
  projectId,
  currentCode,
}: {
  plans: Plan[];
  projectId: string;
  currentCode: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function change(planCode: string) {
    setBusy(planCode);
    setError("");
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, planCode }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error === "plan_not_found" ? "计划不存在" : "切换失败");
    } else if (data.simulated) {
      router.refresh();
    } else if (data.url) {
      window.location.href = data.url;
    }
    setBusy("");
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.code}
            className={`rounded-lg border p-4 ${
              plan.code === currentCode ? "border-primary bg-primary/5" : ""
            }`}
          >
            <p className="text-sm font-semibold">{plan.name}</p>
            <p className="mt-1 text-lg font-semibold">
              ¥{plan.priceMonthly / 100}
              <span className="text-xs font-normal text-muted-foreground"> / 月</span>
            </p>
            <p className="mt-2 min-h-8 text-xs leading-5 text-muted-foreground">{plan.description}</p>
            <Button
              size="sm"
              variant={plan.code === currentCode ? "secondary" : "default"}
              className="mt-3 w-full"
              disabled={busy === plan.code || plan.code === currentCode}
              onClick={() => change(plan.code)}
            >
              {plan.code === currentCode ? "当前计划" : busy === plan.code ? "切换中..." : "切换"}
            </Button>
          </div>
        ))}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
