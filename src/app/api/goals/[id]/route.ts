import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserProjectIds } from "@/lib/auth-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const projectIds = await getUserProjectIds(session.user.id);
  const goal = await prisma.goal.findUnique({ where: { id }, select: { projectId: true } });
  if (!goal || !projectIds.has(goal.projectId)) {
    return NextResponse.json({ error: "goal_not_found" }, { status: 404 });
  }

  await prisma.goal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
