import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserOrganizationIds } from "@/lib/auth-helpers";
import { getActivePlan } from "@/lib/plans";
import { getRequestMeta, logAudit } from "@/lib/audit";

const createInviteSchema = z.object({
  githubLogin: z.string().min(1).max(80),
  role: z.enum(["OWNER", "ADMIN", "ANALYST", "VIEWER"]).default("VIEWER"),
  projectId: z.string().nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const organizationIds = await getUserOrganizationIds(session.user.id);
  const invitations = await prisma.invitation.findMany({
    where: { organizationId: { in: organizationIds }, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      githubLogin: true,
      role: true,
      token: true,
      expiresAt: true,
      createdAt: true,
      organization: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json({ invitations });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const organizationIds = await getUserOrganizationIds(session.user.id);
  const actor = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      organizationId: { in: organizationIds },
      role: { in: ["OWNER", "ADMIN"] },
    },
    select: { organizationId: true, organization: { select: { tenantId: true } } },
  });
  if (!actor) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const project = await prisma.project.findFirst({
    where: { organizationId: actor.organizationId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const teamLimit = project ? (await getActivePlan(project.id)).limits.teamMembers : 1;
  const [memberCount, inviteCount] = await Promise.all([
    prisma.membership.count({ where: { organizationId: actor.organizationId } }),
    prisma.invitation.count({
      where: { organizationId: actor.organizationId, status: "PENDING" },
    }),
  ]);
  if (memberCount + inviteCount >= teamLimit) {
    return NextResponse.json({ error: "team_limit_reached" }, { status: 403 });
  }

  const existingInvite = await prisma.invitation.findFirst({
    where: {
      organizationId: actor.organizationId,
      githubLogin: { equals: parsed.data.githubLogin, mode: "insensitive" },
      status: "PENDING",
    },
  });
  if (existingInvite) {
    return NextResponse.json({ error: "invite_exists" }, { status: 409 });
  }

  const alreadyMember = await prisma.user.findFirst({
    where: { githubLogin: { equals: parsed.data.githubLogin, mode: "insensitive" } },
    select: { id: true },
  });
  if (alreadyMember) {
    const membership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: actor.organizationId,
          userId: alreadyMember.id,
        },
      },
    });
    if (membership) {
      return NextResponse.json({ error: "already_member" }, { status: 409 });
    }
  }

  const expiresAt = new Date(Date.now() + 7 * 86_400_000);
  const invitation = await prisma.invitation.create({
    data: {
      tenantId: actor.organization.tenantId,
      organizationId: actor.organizationId,
      projectId: parsed.data.projectId ?? null,
      invitedByUserId: session.user.id,
      githubLogin: parsed.data.githubLogin,
      role: parsed.data.role,
      expiresAt,
    },
  });

  const meta = getRequestMeta(request);
  await logAudit({
    ...meta,
    tenantId: actor.organization.tenantId,
    userId: session.user.id,
    organizationId: actor.organizationId,
    action: "team.invite",
    resourceType: "invitation",
    resourceId: invitation.id,
    metadata: { githubLogin: invitation.githubLogin, role: invitation.role },
  });

  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return NextResponse.json(
    {
      invitation: {
        id: invitation.id,
        githubLogin: invitation.githubLogin,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
      inviteUrl: `${appUrl}/invite/${invitation.token}`,
    },
    { status: 201 },
  );
}
