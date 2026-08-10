import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { getActivePlan } from "./plans";

export async function authenticateApiKey(
  request: NextRequest,
  requiredScopes: string[] = ["ANALYTICS_READ"],
): Promise<{ userId: string; projectId: string; scopes: string[] } | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;

  const secret = header.slice("Bearer ".length).trim();
  if (!secret.startsWith("ivf_")) return null;

  const keyHash = createHash("sha256").update(secret).digest("hex");
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      scopes: true,
      expiresAt: true,
      revokedAt: true,
      projectId: true,
      project: { select: { userId: true } },
    },
  });

  if (!apiKey || apiKey.revokedAt) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  const scopes = apiKey.scopes as string[];
  if (!requiredScopes.every((scope) => scopes.includes(scope))) return null;

  const { limits } = await getActivePlan(apiKey.projectId);
  if (!limits.apiAccess) return null;

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    userId: apiKey.project.userId,
    projectId: apiKey.projectId,
    scopes,
  };
}
