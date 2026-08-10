import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type NotificationInput = {
  tenantId: string;
  userId: string;
  projectId?: string | null;
  kind:
    | "TRAFFIC_ANOMALY"
    | "DAILY_STATS"
    | "WEEKLY_REPORT"
    | "QUOTA_WARNING"
    | "SECURITY_EVENT";
  title: string;
  body: string;
  payload?: Record<string, unknown>;
};

export interface NotificationProvider {
  send(input: NotificationInput): Promise<boolean>;
}

export class ClawdBotProvider implements NotificationProvider {
  async send(input: NotificationInput) {
    const endpoint = process.env.CLAWDBOT_WEBHOOK_URL;
    if (!endpoint) {
      throw new Error("CLAWDBOT_WEBHOOK_URL is not configured");
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: input.kind,
        title: input.title,
        body: input.body,
        payload: input.payload ?? {},
      }),
    });
    return response.ok;
  }
}

const providers: Record<string, NotificationProvider> = {
  clawdbot: new ClawdBotProvider(),
};

export async function dispatchNotification(input: NotificationInput) {
  const settings = await prisma.notificationSetting.findFirst({
    where: {
      userId: input.userId,
      enabled: true,
      projectId: input.projectId ?? null,
      eventKinds: { has: input.kind },
    },
  });

  if (!settings) {
    return;
  }

  const provider = providers[settings.provider] ?? providers.clawdbot;
  const record = await prisma.notification.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      projectId: input.projectId,
      kind: input.kind,
      provider: settings.provider,
      channel: (settings.config as { channel?: string } | null)?.channel ?? "clawdbot",
      title: input.title,
      body: input.body,
      payload: input.payload as Prisma.InputJsonValue | undefined,
      status: "PENDING",
    },
  });

  try {
    await provider.send(input);
    await prisma.notification.update({
      where: { id: record.id },
      data: { status: "SENT", sentAt: new Date() },
    });
  } catch (error) {
    await prisma.notification.update({
      where: { id: record.id },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message.slice(0, 500) : "unknown",
      },
    });
  }
}
