"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateWebsiteDialog({
  projects,
}: {
  projects: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [snippet, setSnippet] = useState("");

  async function createWebsite() {
    setSubmitting(true);
    setError("");
    setSnippet("");
    try {
      const response = await fetch("/api/websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, name, domain }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error === "plan_limit_websites" ? "当前计划网站数量已达上限" : "创建失败，请检查输入");
        return;
      }
      setSnippet(data.snippet);
      setName("");
      setDomain("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        添加网站
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg border bg-card p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">添加网站</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  创建后即可获得追踪代码
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {snippet ? (
              <div className="mt-5 space-y-3">
                <Label>追踪代码</Label>
                <pre className="overflow-x-auto rounded-md bg-[#101613] p-4 text-xs leading-6 text-white/80">
                  {snippet}
                </pre>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigator.clipboard.writeText(snippet)}
                >
                  <Copy className="h-4 w-4" />
                  复制代码
                </Button>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
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
                  <Label>网站名称</Label>
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="例如：我的博客"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>域名</Label>
                  <Input
                    value={domain}
                    onChange={(event) => setDomain(event.target.value)}
                    placeholder="blog.example.com"
                  />
                </div>
                {error ? <p className="text-xs text-destructive">{error}</p> : null}
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={createWebsite} disabled={submitting || !name || !domain}>
                    {submitting ? "创建中..." : "创建"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
