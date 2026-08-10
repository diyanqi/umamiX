"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const reportKinds = [
  { value: "FUNNEL", label: "漏斗分析" },
  { value: "RETENTION", label: "留存分析" },
  { value: "UTM", label: "UTM 分析" },
  { value: "GOALS", label: "目标跟踪" },
  { value: "JOURNEY", label: "用户旅程" },
  { value: "ATTRIBUTION", label: "归因分析" },
];

export function ReportBuilder({
  projects,
  websiteId,
}: {
  projects: Array<{ id: string; name: string }>;
  websiteId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [name, setName] = useState("");
  const [kind, setKind] = useState("FUNNEL");
  const [saving, setSaving] = useState(false);

  async function create() {
    setSaving(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          websiteId,
          name,
          kind,
          config: {},
        }),
      });
      if (response.ok) {
        setOpen(false);
        setName("");
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        新建报告
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border bg-card p-5 shadow-xl">
            <h2 className="text-base font-semibold">新建报告</h2>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label>报告名称</Label>
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：注册漏斗" />
              </div>
              <div className="space-y-1.5">
                <Label>项目</Label>
                <select
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>类型</Label>
                <select
                  value={kind}
                  onChange={(event) => setKind(event.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
                >
                  {reportKinds.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
                <Button onClick={create} disabled={saving || !name}>
                  {saving ? "保存中..." : "保存"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
