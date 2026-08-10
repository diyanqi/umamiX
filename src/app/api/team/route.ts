import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserOrganizationIds } from "@/lib/auth-helpers";
import { getActivePlan } from "@/lib/plans";
import { getRequestMeta, logAudit } from "@/lib/audit";

const addMemberSchema = z.object({
  githubLogin: z.string().min(1).max(80),
  role: z.enum(["OWNER", "ADMIN", "ANALYST", "VIEWER"]).default("VIEWER"),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const organizationIds = await getUserOrganizationIds(session.user.id);
  const memberships = await prisma.membership.findMany({
    where: { organizationId: { in: organizationIds } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      organization: { select: { id: true, name: true, tenantId: true } },
      user: {
        select: { id: true, name: true, email: true, githubLogin: true, image: true },
      },
    },
  });

  return NextResponse.json({ memberships });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const organizationIds = await getUserOrganizationIds(session.user.id);
  const actorMembership = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      organizationId: { in: organizationIds },
      role: { in: ["OWNER", "ADMIN"] },
    },
    select: { organizationId: true, organization: { select: { tenantId: true } } },
  });
  if (!actorMembership) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const user = await prisma.user.findFirst({
    where: { githubLogin: { equals: parsed.data.githubLogin, mode: "insensitive" } },
    select: { id: true, tenantId: true, name: true, githubLogin: true },
  });
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const project = await prisma.project.findFirst({
    where: { organizationId: actorMembership.organizationId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const teamLimit = project
    ? (await getActivePlan(project.id)).limits.teamMembers
    : 1;
  const memberCount = await prisma.membership.count({
    where: { organizationId: actorMembership.organizationId },
  });
  if (memberCount >= teamLimit) {
    return NextResponse.json({ error: "team_limit_reached" }, { status: 403 });
  }

  const existing = await prisma.membership.findUnique({
    where: {
      organizationId_userId: {
        organizationId: actorMembership.organizationId,
        userId: user.id,
      },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "already_member" }, { status: 409 });
  }

  const membership = await prisma.membership.create({
    data: {
      tenantId: actorMembership.organization.tenantId,
      userId: user.id,
      organizationId: actorMembership.organizationId,
      role: parsed.data.role,
    },
  });

  const meta = getRequestMeta(request);
  await logAudit({
    ...meta,
    tenantId: actorMembership.organization.tenantId,
    userId: session.user.id,
    organizationId: actorMembership.organizationId,
    action: "team.member_add",
    resourceType: "membership",
    resourceId: membership.id,
    metadata: { githubLogin: user.githubLogin, role: parsed.data.role },
  });

  return NextResponse.json({ membership }, { status: 201 });
}
