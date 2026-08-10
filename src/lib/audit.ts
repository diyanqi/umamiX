import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export type AuditInput = {
  tenantId: string;
  userId: string;
  projectId?: string | null;
  organizationId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
};

export async function logAudit(input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      projectId: input.projectId ?? null,
      organizationId: input.organizationId ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}

export function getRequestMeta(request: NextRequest) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent") ?? null,
  };
}
