"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart3, Copy, Link2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SensitiveCapDialog } from "./sensitive-cap-dialog";

export function WebsiteActions({
  website,
  snippet,
  shareUrl,
}: {
  website: { id: string; name: string };
  snippet: string;
  shareUrl?: string;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);

  async function copySnippet() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function remove() {
    if (!window.confirm(`确认删除 ${website.name} 及其所有统计数据？`)) return;
    setDeleting(true);
    const response = await fetch(`/api/websites/${website.id}`, { method: "DELETE" });
    if (response.status === 428) {
      setVerifyOpen(true);
    } else if (response.ok) {
      router.refresh();
    }
    setDeleting(false);
  }

  async function removeAfterVerification() {
    setVerifyOpen(false);
    setDeleting(true);
    const response = await fetch(`/api/websites/${website.id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
    setDeleting(false);
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`/dashboard/websites/${website.id}`}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs hover:bg-muted"
      >
        <BarChart3 className="h-3.5 w-3.5" />
        分析
      </Link>
      <Button variant="outline" size="sm" onClick={copySnippet}>
        <Copy className="h-3.5 w-3.5" />
        {copied ? "已复制" : "代码"}
      </Button>
      {shareUrl ? (
        <Button
          variant="outline"
          size="sm"
          title="复制公开分享链接"
          onClick={async () => {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          <Link2 className="h-3.5 w-3.5" />
          {copied ? "已复制" : "分享"}
        </Button>
      ) : null}
      <Button variant="ghost" size="icon" onClick={remove} disabled={deleting} title="删除">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
      <SensitiveCapDialog
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        onVerified={() => void removeAfterVerification()}
      />
    </div>
  );
}
