import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertProjectAccess } from "@/lib/auth-helpers";
import { activatePlan } from "@/lib/billing/activate-plan";
import { getBillingProvider } from "@/lib/billing/provider";
import { getRequestMeta, logAudit } from "@/lib/audit";

const checkoutSchema = z.object({
  projectId: z.string().min(1),
  planCode: z.string().min(1).max(80),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    await assertProjectAccess(session.user.id, parsed.data.projectId);
  } catch {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  const plan = await prisma.plan.findFirst({
    where: { code: parsed.data.planCode, isActive: true },
  });
  if (!plan) {
    return NextResponse.json({ error: "plan_not_found" }, { status: 404 });
  }

  const project = await prisma.project.findUnique({
    where: { id: parsed.data.projectId },
  });
  if (!project) {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  const provider = getBillingProvider();
  const checkout = await provider.createCheckout({
    tenantId: project.tenantId,
    userId: session.user.id,
    organizationId: project.organizationId,
    projectId: project.id,
    planCode: plan.code,
    planName: plan.name,
    priceMonthly: plan.priceMonthly,
    currency: plan.currency,
  });

  if (checkout.simulated) {
    await activatePlan({
      userId: session.user.id,
      projectId: project.id,
      planCode: plan.code,
    });
    const meta = getRequestMeta(request);
    await logAudit({
      ...meta,
      tenantId: project.tenantId,
      userId: session.user.id,
      organizationId: project.organizationId,
      projectId: project.id,
      action: "billing.checkout_simulated",
      resourceType: "subscription",
      metadata: { planCode: plan.code },
    });
    return NextResponse.json({
      simulated: true,
      redirectUrl: "/dashboard/settings?billing=success",
    });
  }

  return NextResponse.json({
    url: checkout.url,
    sessionId: checkout.sessionId,
  });
}
