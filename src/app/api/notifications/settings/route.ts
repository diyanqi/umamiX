import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSettingsSchema = z.object({
  provider: z.string().min(1).max(60).default("clawdbot"),
  projectId: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  eventKinds: z
    .array(z.enum(["TRAFFIC_ANOMALY", "DAILY_STATS", "WEEKLY_REPORT", "QUOTA_WARNING", "SECURITY_EVENT"]))
    .optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const settings = await prisma.notificationSetting.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { provider, projectId, enabled, config, eventKinds } = parsed.data;
  const uniqueKey = {
    userId_provider_projectId: {
      userId: session.user.id,
      provider,
      projectId: projectId ?? "",
    },
  };

  const setting = await prisma.notificationSetting.upsert({
    where: uniqueKey,
    create: {
      tenantId:
        (session.user as unknown as { tenantId?: string }).tenantId ??
        `tnt_${session.user.id.slice(0, 10)}`,
      userId: session.user.id,
      provider,
      projectId: projectId ?? "",
      config: (config ?? {}) as Prisma.InputJsonValue,
      enabled: enabled ?? true,
      eventKinds: eventKinds ?? ["TRAFFIC_ANOMALY", "QUOTA_WARNING"],
    },
    update: {
      enabled: enabled ?? undefined,
      config: config as Prisma.InputJsonValue | undefined,
      eventKinds: eventKinds ?? undefined,
    },
  });

  return NextResponse.json({ setting });
}
