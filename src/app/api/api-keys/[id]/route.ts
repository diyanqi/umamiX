import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserProjectIds } from "@/lib/auth-helpers";
import { getRequestMeta, logAudit } from "@/lib/audit";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const projectIds = await getUserProjectIds(session.user.id);
  const apiKey = await prisma.apiKey.findUnique({
    where: { id },
    select: { projectId: true },
  });

  if (!apiKey || !projectIds.has(apiKey.projectId)) {
    return NextResponse.json({ error: "api_key_not_found" }, { status: 404 });
  }

  const apiKeyRow = await prisma.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
    select: { id: true, projectId: true, tenantId: true, name: true },
  });

  const meta = getRequestMeta(request);
  await logAudit({
    ...meta,
    tenantId: apiKeyRow.tenantId,
    userId: session.user.id,
    projectId: apiKeyRow.projectId,
    action: "api_key.revoke",
    resourceType: "api_key",
    resourceId: apiKeyRow.id,
    metadata: { name: apiKeyRow.name },
  });

  return NextResponse.json({ ok: true });
}
