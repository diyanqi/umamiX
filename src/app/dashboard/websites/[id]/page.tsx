import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserProjectIds } from "@/lib/auth-helpers";
import { getWebsiteStats } from "@/lib/analytics/queries";
import { WebsiteAnalytics } from "@/components/dashboard/website-analytics";
import { AiInsights } from "@/components/dashboard/ai-insights";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const website = await prisma.website.findUnique({ where: { id } });
  return { title: website?.name ?? "网站分析" };
}

export default async function WebsiteAnalyticsPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) notFound();

  const { id } = await params;
  const projectIds = await getUserProjectIds(session.user.id);
  const website = await prisma.website.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      domain: true,
      projectId: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!website || !projectIds.has(website.projectId)) notFound();

  const stats = await getWebsiteStats(website.id, 30);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{website.name}</h1>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                website.isActive ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
              }`}
            >
              {website.isActive ? "追踪中" : "已停用"}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{website.domain}</p>
        </div>
        <a
          href="/dashboard/websites"
          className="inline-flex h-9 items-center rounded-md border px-4 text-sm hover:bg-muted"
        >
          返回网站列表
        </a>
      </div>

      <AiInsights websiteId={website.id} />
      <WebsiteAnalytics websiteId={website.id} initialStats={stats} />
    </div>
  );
}
