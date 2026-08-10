import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { redis } from "@/lib/redis";

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

function md5(value: string) {
  return createHash("md5").update(value).digest("hex");
}

export function signYipayParams(
  params: Record<string, string>,
  key: string,
  mode: "sorted" | "fixed" = "sorted",
) {
  if (mode === "fixed") {
    const { pid, out_trade_no, type, name, money, notify_url, return_url } = params;
    return md5(`${pid}${out_trade_no}${type}${name}${money}${notify_url}${return_url}${key}`);
  }
  const sorted = Object.keys(params)
    .sort()
    .map((name) => `${name}=${params[name]}`)
    .join("&");
  return md5(`${sorted}${key}`);
}

class YipayBillingProvider implements BillingProvider {
  private readonly gateway = process.env.YIPAY_GATEWAY_URL;
  private readonly pid = process.env.YIPAY_PID;
  private readonly key = process.env.YIPAY_KEY;
  private readonly payType = process.env.YIPAY_TYPE ?? "wxpay";
  private readonly signMode = (process.env.YIPAY_SIGN_MODE ?? "sorted") as "sorted" | "fixed";

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    if (!this.gateway || !this.pid || !this.key) {
      throw new Error("YIPAY_GATEWAY_URL, YIPAY_PID and YIPAY_KEY are required");
    }

    const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const outTradeNo = `ivf${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
    const money = (input.priceMonthly / 100).toFixed(2);

    await redis.set(
      `yipay:order:${outTradeNo}`,
      JSON.stringify({
        projectId: input.projectId,
        planCode: input.planCode,
        userId: input.userId,
      }),
      "EX",
      3600,
    );

    const params: Record<string, string> = {
      pid: this.pid,
      type: this.payType,
      out_trade_no: outTradeNo,
      notify_url: `${appUrl}/api/billing/webhook`,
      return_url: `${appUrl}/dashboard/settings?billing=success`,
      name: `Infvar Analytics ${input.planName}`,
      money,
      sitename: "Infvar Analytics",
      sign_type: "MD5",
    };
    params.sign = signYipayParams(params, this.key, this.signMode);

    const url = `${this.gateway}?${new URLSearchParams(params).toString()}`;
    return { url, sessionId: outTradeNo };
  }

  async handleWebhook(rawBody: string): Promise<BillingEvent | null> {
    if (!this.key) return null;

    const params = Object.fromEntries(new URLSearchParams(rawBody));
    const outTradeNo = params.out_trade_no;
    const receivedSign = params.sign;
    if (!outTradeNo || !receivedSign) return null;

    const signParams = { ...params };
    delete signParams.sign;
    delete signParams.sign_type;
    const sortedSign = signYipayParams(signParams, this.key, "sorted");
    const fixedSign = signYipayParams(signParams, this.key, "fixed");
    if (receivedSign !== sortedSign && receivedSign !== fixedSign) {
      return null;
    }

    const success =
      ["TRADE_SUCCESS", "success", "1", "completed"].includes(
        String(params.trade_status ?? ""),
      ) || String(params.trade_status ?? "").toLowerCase() === "success";
    if (!success) {
      return { event: "yipay.failed" };
    }

    const orderRaw = await redis.get(`yipay:order:${outTradeNo}`);
    if (!orderRaw) {
      return { event: "yipay.unknown_order" };
    }

    await redis.del(`yipay:order:${outTradeNo}`);
    const order = JSON.parse(orderRaw) as {
      projectId: string;
      planCode: string;
      userId: string;
    };
    return {
      event: "yipay.success",
      projectId: order.projectId,
      planCode: order.planCode,
    };
  }
}

export function getBillingProvider(): BillingProvider {
  const mode = process.env.BILLING_PROVIDER ?? "yipay";
  if (mode === "stripe") return new StripeBillingProvider();
  if (mode === "yipay") return new YipayBillingProvider();
  return new MockBillingProvider();
}
