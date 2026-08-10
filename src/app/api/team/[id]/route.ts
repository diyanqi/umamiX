import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserOrganizationIds } from "@/lib/auth-helpers";

const updateRoleSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "ANALYST", "VIEWER"]),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const organizationIds = await getUserOrganizationIds(session.user.id);
  const actor = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      organizationId: { in: organizationIds },
      role: { in: ["OWNER", "ADMIN"] },
    },
  });
  if (!actor) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({ where: { id } });
  if (!membership || membership.organizationId !== actor.organizationId) {
    return NextResponse.json({ error: "member_not_found" }, { status: 404 });
  }

  const updated = await prisma.membership.update({
    where: { id },
    data: { role: parsed.data.role },
  });
  return NextResponse.json({ membership: updated });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const organizationIds = await getUserOrganizationIds(session.user.id);
  const actor = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      organizationId: { in: organizationIds },
      role: { in: ["OWNER", "ADMIN"] },
    },
  });
  if (!actor) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const membership = await prisma.membership.findUnique({ where: { id } });
  if (!membership || membership.organizationId !== actor.organizationId) {
    return NextResponse.json({ error: "member_not_found" }, { status: 404 });
  }

  if (membership.role === "OWNER" && membership.userId !== session.user.id) {
    const ownerCount = await prisma.membership.count({
      where: { organizationId: actor.organizationId, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      return NextResponse.json({ error: "last_owner" }, { status: 403 });
    }
  }

  await prisma.membership.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
