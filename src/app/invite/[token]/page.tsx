import type { Metadata } from "next";
import { InviteAccept } from "@/components/dashboard/invite-accept";

type PageProps = { params: Promise<{ token: string }> };

export const metadata: Metadata = {
  title: "团队邀请",
};

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <InviteAccept token={token} />
    </main>
  );
}
