import { prisma } from "@/lib/db/prisma";

export interface CreateAuditLogParams {
  shopId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  reason?: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /(^|_)pin($|_)/i,
  /device.*pin/i,
  /api[_-]?key/i,
  /service[_-]?role/i,
];

/**
 * Sanitizes object by redacting sensitive keys from audit history
 */
export function sanitizeAuditState(
  state: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!state) return null;
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(state)) {
    const isSensitive = SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));

    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = sanitizeAuditState(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Persists an authoritative audit log record for security, compliance, and tracing.
 */
export async function recordAuditLog(params: CreateAuditLogParams) {
  return await prisma.auditLog.create({
    data: {
      shopId: params.shopId,
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      reason: params.reason,
      beforeState: sanitizeAuditState(params.beforeState) as object,
      afterState: sanitizeAuditState(params.afterState) as object,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}

/**
 * Queries audit logs with shop isolation and pagination.
 */
export async function queryAuditLogs(params: {
  shopId: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  limit?: number;
  offset?: number;
}) {
  const { shopId, entityType, entityId, actorId, limit = 50, offset = 0 } = params;

  return await prisma.auditLog.findMany({
    where: {
      shopId,
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
      ...(actorId ? { actorId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
    include: {
      actor: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });
}
