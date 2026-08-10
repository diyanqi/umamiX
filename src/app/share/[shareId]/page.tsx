import type { Metadata } from "next";
import { PublicStatsView } from "@/components/dashboard/public-stats";
import { prisma } from "@/lib/prisma";

type PageProps = { params: Promise<{ shareId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareId } = await params;
  const website = await prisma.website.findUnique({
    where: { shareId },
    select: { name: true, domain: true },
  });
  return {
    title: website ? `${website.name} 公开统计` : "公开统计",
  };
}

export default async function SharePage({ params }: PageProps) {
  const { shareId } = await params;
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl p-4 md:p-8">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold">无尽分析</p>
          <p className="text-xs text-muted-foreground">Infvar Analytics · 公开分享报告</p>
        </div>
        <PublicStatsView shareId={shareId} />
      </div>
    </main>
  );
}
