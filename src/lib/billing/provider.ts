import { createHmac, timingSafeEqual } from "node:crypto";

export type CheckoutInput = {
  tenantId: string;
  userId: string;
  organizationId: string;
  projectId: string;
  planCode: string;
  planName: string;
  priceMonthly: number;
  currency: string;
};

export type CheckoutResult = {
  simulated?: boolean;
  url?: string;
  sessionId?: string;
};

export type BillingEvent = {
  event?: string;
  projectId?: string;
  planCode?: string;
};

export interface BillingProvider {
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  handleWebhook(rawBody: string, signature: string | null): Promise<BillingEvent | null>;
}

class MockBillingProvider implements BillingProvider {
  async createCheckout() {
    return { simulated: true };
  }

  async handleWebhook() {
    return null;
  }
}

class StripeBillingProvider implements BillingProvider {
  private readonly key = process.env.STRIPE_SECRET_KEY;
  private readonly webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    if (!this.key) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const body = new URLSearchParams({
      mode: "subscription",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": (input.currency || "cny").toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(input.priceMonthly),
      "line_items[0][price_data][product_data][name]": `Infvar Analytics ${input.planName}`,
      "line_items[0][price_data][recurring][interval]": "month",
      "metadata[projectId]": input.projectId,
      "metadata[planCode]": input.planCode,
      success_url: `${appUrl}/dashboard/settings?billing=success`,
      cancel_url: `${appUrl}/dashboard/settings?billing=cancelled`,
    });

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`Stripe checkout failed: ${response.status}`);
    }

    const data = (await response.json()) as { url?: string; id?: string };
    return { url: data.url, sessionId: data.id };
  }

  async handleWebhook(rawBody: string, signature: string | null): Promise<BillingEvent | null> {
    if (!this.webhookSecret || !signature) {
      return null;
    }

    const parts = Object.fromEntries(
      signature.split(",").map((part) => {
        const separator = part.indexOf("=");
        return [part.slice(0, separator), part.slice(separator + 1)];
      }),
    );

    const expected = createHmac("sha256", this.webhookSecret)
      .update(`${parts.t}.${rawBody}`)
      .digest("hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    const givenBuffer = Buffer.from(String(parts.v1 ?? ""), "hex");

    if (
      givenBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(givenBuffer, expectedBuffer)
    ) {
      return null;
    }

    const event = JSON.parse(rawBody) as {
      type?: string;
      data?: { object?: { metadata?: Record<string, string> } };
    };
    if (event.type === "checkout.session.completed") {
      return {
        event: event.type,
        projectId: event.data?.object?.metadata?.projectId,
        planCode: event.data?.object?.metadata?.planCode,
      };
    }
    return { event: event.type };
  }
}

export function getBillingProvider(): BillingProvider {
  const mode = process.env.BILLING_PROVIDER ?? "mock";
  return mode === "stripe" ? new StripeBillingProvider() : new MockBillingProvider();
}
