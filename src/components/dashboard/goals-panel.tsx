"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Goal = {
  id: string;
  name: string;
  type: "EVENT" | "PAGEVIEW";
  value: string;
  operator: "EXACT" | "CONTAINS" | "REGEX";
  conversions: number;
};

export function GoalsPanel({
  websiteId,
  projectId,
}: {
  websiteId: string;
  projectId: string;
}) {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [type, setType] = useState<"EVENT" | "PAGEVIEW">("EVENT");
  const [operator, setOperator] = useState<"EXACT" | "CONTAINS" | "REGEX">("EXACT");

  const load = useCallback(async () => {
    const response = await fetch(
      `/api/goals?websiteId=${websiteId}&projectId=${projectId}&withConversions=1`,
    );
    if (response.ok) {
      const data = (await response.json()) as { goals: Goal[] };
      setGoals(data.goals);
    }
  }, [websiteId, projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    const response = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, websiteId, name, type, value, operator }),
    });
    if (response.ok) {
      setName("");
      setValue("");
      await load();
      router.refresh();
    }
  }

  async function remove(id: string) {
    const response = await fetch(`/api/goals/${id}`, { method: "DELETE" });
    if (response.ok) {
      await load();
      router.refresh();
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="space-y-1.5">
          <Label>目标名称</Label>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="注册成功" />
        </div>
        <div className="space-y-1.5">
          <Label>匹配值</Label>
          <Input value={value} onChange={(event) => setValue(event.target.value)} placeholder="signup" />
        </div>
        <div className="space-y-1.5">
          <Label>类型</Label>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as "EVENT" | "PAGEVIEW")}
            className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
          >
            <option value="EVENT">事件</option>
            <option value="PAGEVIEW">页面浏览</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>匹配方式</Label>
          <select
            value={operator}
            onChange={(event) => setOperator(event.target.value as "EXACT" | "CONTAINS" | "REGEX")}
            className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
          >
            <option value="EXACT">精确</option>
            <option value="CONTAINS">包含</option>
            <option value="REGEX">正则</option>
          </select>
        </div>
      </div>
      <Button onClick={create} disabled={!name || !value}>
        <Target className="h-4 w-4" />
        创建目标
      </Button>

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="p-3 font-medium">名称</th>
              <th className="p-3 font-medium">类型</th>
              <th className="p-3 font-medium">匹配值</th>
              <th className="p-3 font-medium">30 天转化</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {goals.map((goal) => (
              <tr key={goal.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{goal.name}</td>
                <td className="p-3 text-muted-foreground">{goal.type}</td>
                <td className="p-3 text-muted-foreground">{goal.value}</td>
                <td className="p-3 font-medium">{goal.conversions}</td>
                <td className="p-3 text-right">
                  <button onClick={() => remove(goal.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {goals.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                  暂无目标，创建后会自动统计转化
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
