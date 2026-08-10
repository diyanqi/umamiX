"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SensitiveCapDialog } from "./sensitive-cap-dialog";

type Project = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  websiteCount: number;
  plan: { name: string; code: string } | null;
  createdAt: string;
};

export function ProjectManager() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/projects");
    if (response.ok) {
      const data = (await response.json()) as { projects: Project[] };
      setProjects(data.projects);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setError("");
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug, description }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error === "slug_taken" ? "slug 已被占用" : "创建失败");
      return;
    }
    setName("");
    setSlug("");
    setDescription("");
    await load();
    router.refresh();
  }

  async function remove(id: string, projectName: string) {
    if (!window.confirm(`确认删除项目 ${projectName} 及其全部数据？`)) return;
    const response = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (response.status === 428) {
      setPendingDelete({ id, name: projectName });
      setVerifyOpen(true);
    } else if (response.ok) {
      await load();
      router.refresh();
    }
  }

  async function removeAfterVerification() {
    setVerifyOpen(false);
    if (!pendingDelete) return;
    const response = await fetch(`/api/projects/${pendingDelete.id}`, { method: "DELETE" });
    if (response.ok) {
      await load();
      router.refresh();
    }
    setPendingDelete(null);
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>项目名称</Label>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="我的博客分析" />
        </div>
        <div className="space-y-1.5">
          <Label>Slug</Label>
          <Input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="blog" />
        </div>
        <div className="space-y-1.5">
          <Label>描述（可选）</Label>
          <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="说明" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={create} disabled={!name || !slug}>
          <FolderPlus className="h-4 w-4" />
          创建项目
        </Button>
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="p-3 font-medium">名称</th>
              <th className="p-3 font-medium">Slug</th>
              <th className="p-3 font-medium">网站</th>
              <th className="p-3 font-medium">计划</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{project.name}</td>
                <td className="p-3 text-muted-foreground">{project.slug}</td>
                <td className="p-3 text-muted-foreground">{project.websiteCount}</td>
                <td className="p-3 text-muted-foreground">{project.plan?.name ?? "Free"}</td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => remove(project.id, project.name)}
                    className="text-muted-foreground hover:text-destructive"
                    title="删除项目"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {projects.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                  暂无项目
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <SensitiveCapDialog
        open={verifyOpen}
        onClose={() => {
          setVerifyOpen(false);
          setPendingDelete(null);
        }}
        onVerified={() => void removeAfterVerification()}
      />
    </div>
  );
}
