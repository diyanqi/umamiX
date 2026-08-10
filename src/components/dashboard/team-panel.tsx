"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Link2, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Member = {
  id: string;
  role: string;
  organization: { id: string; name: string };
  user: { id: string; name: string | null; email: string | null; githubLogin: string | null };
};

type Invitation = {
  id: string;
  githubLogin: string;
  role: string;
  token: string;
  expiresAt: string;
  organization: { id: string; name: string };
};

const roles = ["OWNER", "ADMIN", "ANALYST", "VIEWER"];

export function TeamPanel() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [githubLogin, setGithubLogin] = useState("");
  const [role, setRole] = useState("VIEWER");
  const [inviteLogin, setInviteLogin] = useState("");
  const [inviteRole, setInviteRole] = useState("VIEWER");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteUrl, setInviteUrl] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/team");
    if (response.ok) {
      const data = (await response.json()) as { memberships: Member[] };
      setMembers(data.memberships);
    }
    const inviteResponse = await fetch("/api/team/invitations");
    if (inviteResponse.ok) {
      const inviteData = (await inviteResponse.json()) as { invitations: Invitation[] };
      setInvitations(inviteData.invitations);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addMember() {
    setError("");
    const response = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ githubLogin, role }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(
        data.error === "user_not_found"
          ? "该 GitHub 用户尚未注册无尽分析"
          : data.error === "team_limit_reached"
            ? "当前计划团队人数已达上限"
            : "添加失败",
      );
      return;
    }
    setGithubLogin("");
    await load();
    router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("确认移除此成员？")) return;
    const response = await fetch(`/api/team/${id}`, { method: "DELETE" });
    if (response.ok) {
      await load();
      router.refresh();
    }
  }

  async function updateRole(id: string, nextRole: string) {
    await fetch(`/api/team/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });
    await load();
  }

  async function createInvite() {
    setError("");
    setInviteUrl("");
    const response = await fetch("/api/team/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ githubLogin: inviteLogin, role: inviteRole }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(
        data.error === "team_limit_reached"
          ? "当前计划团队人数已达上限"
          : data.error === "invite_exists"
            ? "该用户已有待处理邀请"
            : "邀请失败",
      );
      return;
    }
    setInviteLogin("");
    setInviteUrl(data.inviteUrl);
    await load();
    router.refresh();
  }

  async function revokeInvite(id: string) {
    await fetch(`/api/team/invitations/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>GitHub 用户名</Label>
          <Input value={githubLogin} onChange={(event) => setGithubLogin(event.target.value)} placeholder="octocat" />
        </div>
        <div className="space-y-1.5">
          <Label>角色</Label>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
          >
            {roles.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <Button onClick={addMember} disabled={!githubLogin}>
            <UserPlus className="h-4 w-4" />
            添加成员
          </Button>
        </div>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="rounded-md border p-4">
        <p className="mb-3 text-sm font-medium">邀请新成员</p>
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            value={inviteLogin}
            onChange={(event) => setInviteLogin(event.target.value)}
            placeholder="GitHub 用户名"
          />
          <select
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value)}
            className="h-9 rounded-md border border-input bg-card px-3 text-sm"
          >
            {roles.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <Button onClick={createInvite} disabled={!inviteLogin}>
            <Link2 className="h-4 w-4" />
            生成邀请链接
          </Button>
        </div>
        {inviteUrl ? (
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded bg-muted px-3 py-2 text-xs">{inviteUrl}</code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(inviteUrl)}
            >
              <Copy className="h-3.5 w-3.5" />
              复制
            </Button>
          </div>
        ) : null}
        {invitations.length > 0 ? (
          <div className="mt-4 space-y-2">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>
                  {invitation.githubLogin} · {invitation.role} · {new Date(invitation.expiresAt).toLocaleDateString("zh-CN")} 过期
                </span>
                <button onClick={() => revokeInvite(invitation.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="p-3 font-medium">成员</th>
              <th className="p-3 font-medium">GitHub</th>
              <th className="p-3 font-medium">组织</th>
              <th className="p-3 font-medium">角色</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{member.user.name ?? "用户"}</td>
                <td className="p-3 text-muted-foreground">{member.user.githubLogin ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{member.organization.name}</td>
                <td className="p-3">
                  <select
                    value={member.role}
                    onChange={(event) => updateRole(member.id, event.target.value)}
                    className="h-8 rounded-md border border-input bg-card px-2 text-xs"
                  >
                    {roles.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => remove(member.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {members.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                  暂无成员
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
