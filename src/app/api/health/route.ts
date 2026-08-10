import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  try {
    await redis.ping();
    checks.redis = "ok";
  } catch {
    checks.redis = "error";
  }

  const healthy = Object.values(checks).every((status) => status === "ok");
  return NextResponse.json(
    {
      ok: healthy,
      service: "infvar-analytics",
      time: new Date().toISOString(),
      checks,
    },
    { status: healthy ? 200 : 503 },
  );
}
