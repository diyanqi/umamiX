import { NextRequest, NextResponse } from "next/server";
import { activatePlan } from "@/lib/billing/activate-plan";
import { getBillingProvider } from "@/lib/billing/provider";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  const event = await getBillingProvider().handleWebhook(rawBody, signature);

  if (event?.projectId && event?.planCode) {
    await activatePlan({
      projectId: event.projectId,
      planCode: event.planCode,
    });
  }

  return NextResponse.json({ received: true, event: event?.event ?? "unknown" });
}
