"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
};

const scopes = ["ANALYTICS_READ", "ANALYTICS_WRITE", "API_READ", "API_WRITE", "MANAGER"];

export function ApiKeysPanel({
  projects,
}: {
  projects: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["ANALYTICS_READ"]);
  const [createdKey, setCreatedKey] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!projectId) return;
    const response = await fetch(`/api/api-keys?projectId=${projectId}`);
    if (response.ok) {
      const data = (await response.json()) as { keys: ApiKey[] };
      setKeys(data.keys);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createKey() {
    setError("");
    setCreatedKey("");
    const response = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, name, scopes: selectedScopes }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError("创建失败");
      return;
    }
    setCreatedKey(data.key);
    setName("");
    void load();
    router.refresh();
  }

  async function revoke(id: string) {
    await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    void load();
  }

  function toggleScope(scope: string) {
    setSelectedScopes((current) =>
      current.includes(scope)
        ? current.filter((item) => item !== scope)
        : [...current, scope],
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
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
          <Label>密钥名称</Label>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="CI 部署密钥" />
        </div>
      </div>

      <div>
        <Label>权限范围</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {scopes.map((scope) => (
            <button
              key={scope}
              type="button"
              onClick={() => toggleScope(scope)}
              className={`rounded-md border px-3 py-1.5 text-xs ${
                selectedScopes.includes(scope)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              {scope}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={createKey} disabled={!name}>
          <Plus className="h-4 w-4" />
          创建密钥
        </Button>
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>

      {createdKey ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-medium text-emerald-800">密钥已创建，只显示一次</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded bg-white px-3 py-2 text-xs">{createdKey}</code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(createdKey)}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="p-3 font-medium">名称</th>
              <th className="p-3 font-medium">前缀</th>
              <th className="p-3 font-medium">权限</th>
              <th className="p-3 font-medium">创建时间</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => (
              <tr key={key.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{key.name}</td>
                <td className="p-3 text-muted-foreground">{key.prefix}...</td>
                <td className="p-3 text-muted-foreground">{key.scopes.join(", ")}</td>
                <td className="p-3 text-muted-foreground">
                  {new Intl.DateTimeFormat("zh-CN").format(new Date(key.createdAt))}
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => revoke(key.id)} title="撤销" className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {keys.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                  <KeyRound className="mx-auto mb-2 h-5 w-5" />
                  暂无 API 密钥
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
