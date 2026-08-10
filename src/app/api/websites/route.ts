import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertProjectAccess, getUserOrganizationIds } from "@/lib/auth-helpers";
import { getActivePlan, parseLimits } from "@/lib/plans";
import { prisma as db } from "@/lib/prisma";
import { getRequestMeta, logAudit } from "@/lib/audit";

const createWebsiteSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(120),
  domain: z.string().min(3).max(253),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const organizationIds = await getUserOrganizationIds(session.user.id);
  const projects = await prisma.project.findMany({
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
          isActive: true,
          createdAt: true,
        },
      },
    },
  });

  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createWebsiteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { projectId, name, domain } = parsed.data;

  try {
    await assertProjectAccess(session.user.id, projectId);
  } catch {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  const { limits } = await getActivePlan(projectId);
  const websiteCount = await prisma.website.count({ where: { projectId } });
  if (websiteCount >= limits.websites) {
    return NextResponse.json(
      { error: "plan_limit_websites", limit: limits.websites },
      { status: 403 },
    );
  }

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  const website = await prisma.website.create({
    data: {
      tenantId: project.tenantId,
      userId: session.user.id,
      projectId,
      name,
      domain,
    },
  });

  const appUrl = (process.env.APP_URL ?? "https://analytics.infvar.com").replace(/\/$/, "");
  const snippet = [
    `<script async src="${appUrl}/script.js"`,
    `  data-project-id="${projectId}"`,
    `  data-website-id="${website.id}">`,
    `</script>`,
  ].join("\n");

  const meta = getRequestMeta(request);
  await logAudit({
    ...meta,
    tenantId: website.tenantId,
    userId: session.user.id,
    projectId,
    action: "website.create",
    resourceType: "website",
    resourceId: website.id,
    metadata: { name: website.name, domain: website.domain },
  });

  return NextResponse.json(
    {
      website: {
        id: website.id,
        name: website.name,
        domain: website.domain,
        shareId: website.shareId,
        createdAt: website.createdAt,
      },
      snippet,
      limits: parseLimits(limits as unknown as Record<string, unknown>),
    },
    { status: 201 },
  );
}
