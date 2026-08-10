import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Globe } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserOrganizationIds } from "@/lib/auth-helpers";
import { CreateWebsiteDialog } from "@/components/dashboard/create-website-dialog";
import { WebsiteActions } from "@/components/dashboard/website-actions";
import { getInstanceSlug } from "@/lib/instance";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "网站",
};

const appUrl = (process.env.APP_URL ?? "https://analytics.infvar.com").replace(/\/$/, "");

export default async function WebsitesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const organizationIds = await getUserOrganizationIds(session.user.id);
  const instanceSlug = await getInstanceSlug();
  let projects = await prisma.project.findMany({
    where: { organizationId: { in: organizationIds } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      websites: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          domain: true,
          shareId: true,
          isActive: true,
          createdAt: true,
        },
      },
    },
  });

  if (instanceSlug) {
    const matched = projects.filter((project) => project.slug === instanceSlug);
    if (matched.length === 0) notFound();
    projects = matched;
  }

  const websites = projects.flatMap((project) =>
    project.websites.map((website) => ({ ...website, projectId: project.id })),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">网站</h1>
          <p className="mt-1 text-sm text-muted-foreground">管理项目、追踪代码与分析入口</p>
        </div>
        <CreateWebsiteDialog projects={projects} />
      </div>

      {websites.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Globe className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-4 text-base font-semibold">还没有网站</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            添加第一个网站，复制追踪代码到你的页面，然后回到仪表盘查看真实流量。
          </p>
          <div className="mt-6 flex justify-center">
            <CreateWebsiteDialog projects={projects} />
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="p-4 font-medium">网站</th>
                  <th className="p-4 font-medium">域名</th>
                  <th className="p-4 font-medium">项目</th>
                  <th className="p-4 font-medium">状态</th>
                  <th className="p-4 font-medium">创建时间</th>
                  <th className="p-4 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {websites.map((website) => (
                  <tr key={website.id} className="border-b last:border-0">
                    <td className="p-4 font-medium">{website.name}</td>
                    <td className="p-4 text-muted-foreground">{website.domain}</td>
                    <td className="p-4 text-muted-foreground">
                      {projects.find((project) => project.id === website.projectId)?.name}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                          website.isActive ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {website.isActive ? "追踪中" : "已停用"}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {new Intl.DateTimeFormat("zh-CN").format(website.createdAt)}
                    </td>
                    <td className="p-4">
                      <WebsiteActions
                        website={{ id: website.id, name: website.name }}
                        snippet={`<script async src="${appUrl}/script.js" data-project-id="${website.projectId}" data-website-id="${website.id}"></script>`}
                        shareUrl={`${appUrl}/share/${website.shareId}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
