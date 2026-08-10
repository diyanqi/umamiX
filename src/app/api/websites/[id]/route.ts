import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertWebsiteAccess } from "@/lib/auth-helpers";
import { getRequestMeta, logAudit } from "@/lib/audit";
import { requireRecentCapVerification } from "@/lib/cap-verification";

const updateWebsiteSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  domain: z.string().min(3).max(253).optional(),
  isActive: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    await assertWebsiteAccess(session.user.id, id);
  } catch {
    return NextResponse.json({ error: "website_not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateWebsiteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const website = await prisma.website.update({
    where: { id },
    data: parsed.data,
  });

  const meta = getRequestMeta(request);
  await logAudit({
    ...meta,
    tenantId: website.tenantId,
    userId: session.user.id,
    projectId: website.projectId,
    action: "website.update",
    resourceType: "website",
    resourceId: website.id,
  });

  return NextResponse.json({ website });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await requireRecentCapVerification())) {
    return NextResponse.json({ error: "verification_required" }, { status: 428 });
  }

  const { id } = await context.params;
  try {
    await assertWebsiteAccess(session.user.id, id);
  } catch {
    return NextResponse.json({ error: "website_not_found" }, { status: 404 });
  }

  const website = await prisma.website.delete({ where: { id } });
  const meta = getRequestMeta(request);
  await logAudit({
    ...meta,
    tenantId: website.tenantId,
    userId: session.user.id,
    projectId: website.projectId,
    action: "website.delete",
    resourceType: "website",
    resourceId: website.id,
    metadata: { name: website.name },
  });
  return NextResponse.json({ ok: true });
}
