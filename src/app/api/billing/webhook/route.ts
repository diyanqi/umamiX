import { NextRequest, NextResponse } from "next/server";
import { activatePlan } from "@/lib/billing/activate-plan";
import {
  getBillingProvider,
  type BillingProvider,
} from "@/lib/billing/provider";

type WebhookResult = Awaited<ReturnType<BillingProvider["handleWebhook"]>>;

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  const event = await getBillingProvider().handleWebhook(rawBody, signature);

  return respond(event);
}

export async function GET(request: NextRequest) {
  const rawBody = request.nextUrl.searchParams.toString();
  const event = await getBillingProvider().handleWebhook(rawBody, null);
  return respond(event);
}

async function respond(event: WebhookResult | null) {
  if (event?.projectId && event?.planCode) {
    await activatePlan({
      projectId: event.projectId,
      planCode: event.planCode,
    });
  }

  return NextResponse.json({ received: true, event: event?.event ?? "unknown" });
}
