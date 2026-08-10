import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertProjectAccess } from "@/lib/auth-helpers";
import { getRequestMeta, logAudit } from "@/lib/audit";
import { getGoalConversions } from "@/lib/analytics/goals";

const createGoalSchema = z.object({
  projectId: z.string().min(1),
  websiteId: z.string().min(1),
  name: z.string().min(1).max(120),
  type: z.enum(["EVENT", "PAGEVIEW"]).default("EVENT"),
  value: z.string().min(1).max(500),
  operator: z.enum(["EXACT", "CONTAINS", "REGEX"]).default("EXACT"),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const websiteId = request.nextUrl.searchParams.get("websiteId");
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!websiteId || !projectId) {
    return NextResponse.json({ error: "websiteId_and_projectId_required" }, { status: 400 });
  }

  try {
    await assertProjectAccess(session.user.id, projectId);
  } catch {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  const goals = await prisma.goal.findMany({
    where: { websiteId, projectId },
    orderBy: { createdAt: "desc" },
  });
  if (request.nextUrl.searchParams.get("withConversions") === "1") {
    const withConversions = await Promise.all(
      goals.map(async (goal) => ({
        ...goal,
        conversions: (await getGoalConversions(goal, 30)).count,
      })),
    );
    return NextResponse.json({ goals: withConversions });
  }
  return NextResponse.json({ goals });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    await assertProjectAccess(session.user.id, parsed.data.projectId);
  } catch {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  const website = await prisma.website.findUnique({
    where: { id: parsed.data.websiteId },
    select: { id: true, projectId: true, tenantId: true, userId: true },
  });
  if (!website || website.projectId !== parsed.data.projectId) {
    return NextResponse.json({ error: "website_not_found" }, { status: 404 });
  }

  const goal = await prisma.goal.create({
    data: {
      tenantId: website.tenantId,
      userId: session.user.id,
      projectId: parsed.data.projectId,
      websiteId: parsed.data.websiteId,
      name: parsed.data.name,
      type: parsed.data.type,
      value: parsed.data.value,
      operator: parsed.data.operator,
    },
  });

  const meta = getRequestMeta(request);
  await logAudit({
    ...meta,
    tenantId: website.tenantId,
    userId: session.user.id,
    projectId: website.projectId,
    action: "goal.create",
    resourceType: "goal",
    resourceId: goal.id,
    metadata: { name: goal.name, type: goal.type },
  });

  return NextResponse.json({ goal }, { status: 201 });
}
