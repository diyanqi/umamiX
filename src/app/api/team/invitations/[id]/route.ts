import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserOrganizationIds } from "@/lib/auth-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const organizationIds = await getUserOrganizationIds(session.user.id);
  const invitation = await prisma.invitation.findUnique({ where: { id } });
  if (!invitation || !organizationIds.includes(invitation.organizationId)) {
    return NextResponse.json({ error: "invite_not_found" }, { status: 404 });
  }

  await prisma.invitation.update({
    where: { id },
    data: { status: "REVOKED" },
  });
  return NextResponse.json({ ok: true });
}
