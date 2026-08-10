import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRequestMeta, logAudit } from "@/lib/audit";

const acceptSchema = z.object({
  token: z.string().min(1).max(200),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = acceptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, githubLogin: true, tenantId: true },
  });
  const invitation = await prisma.invitation.findUnique({
    where: { token: parsed.data.token },
  });

  if (!user || !invitation || invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
    return NextResponse.json({ error: "invite_invalid" }, { status: 400 });
  }
  if (
    invitation.githubLogin.toLowerCase() !== (user.githubLogin ?? "").toLowerCase()
  ) {
    return NextResponse.json({ error: "invite_not_for_user" }, { status: 403 });
  }

  await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: invitation.organizationId,
        userId: user.id,
      },
    },
    update: { role: invitation.role },
    create: {
      tenantId: invitation.tenantId,
      userId: user.id,
      organizationId: invitation.organizationId,
      role: invitation.role,
    },
  });

  const accepted = await prisma.invitation.update({
    where: { id: invitation.id },
    data: { status: "ACCEPTED", acceptedAt: new Date() },
  });

  const meta = getRequestMeta(request);
  await logAudit({
    ...meta,
    tenantId: invitation.tenantId,
    userId: user.id,
    organizationId: invitation.organizationId,
    projectId: invitation.projectId,
    action: "team.invite_accept",
    resourceType: "invitation",
    resourceId: accepted.id,
  });

  return NextResponse.json({ ok: true });
}
