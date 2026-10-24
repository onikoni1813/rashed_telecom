import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { ConflictError } from "@/lib/errors";

export interface IdempotencyExecutionOptions<T> {
  shopId: string;
  idempotencyKey?: string | null;
  payload?: unknown;
  ttlMinutes?: number;
  operation: () => Promise<{ statusCode: number; data: T }>;
}

export interface IdempotencyResult<T> {
  statusCode: number;
  data: T;
  cached: boolean;
}

export function computeRequestHash(payload: unknown): string {
  const serialized = JSON.stringify(payload ?? "");
  return crypto.createHash("sha256").update(serialized).digest("hex");
}

/**
 * Wraps any mutating operation with strict idempotency verification.
 * If idempotencyKey is omitted, executes operation directly.
 */
export async function executeWithIdempotency<T>({
  shopId,
  idempotencyKey,
  payload,
  ttlMinutes = 60 * 24, // 24 hours default
  operation,
}: IdempotencyExecutionOptions<T>): Promise<IdempotencyResult<T>> {
  if (!idempotencyKey) {
    const result = await operation();
    return { ...result, cached: false };
  }

  const requestHash = computeRequestHash(payload);
  const existing = await prisma.idempotencyKey.findUnique({
    where: {
      shopId_key: {
        shopId,
        key: idempotencyKey,
      },
    },
  });

  if (existing) {
    if (existing.requestHash !== requestHash) {
      throw new ConflictError(
        "Idempotency key mismatch: The key was previously used with a different request payload."
      );
    }

    if (existing.status === "PENDING") {
      throw new ConflictError(
        "A request with this idempotency key is currently processing. Please wait."
      );
    }

    if (existing.status === "COMPLETED" && existing.responseBody) {
      return {
        statusCode: existing.statusCode ?? 200,
        data: existing.responseBody as T,
        cached: true,
      };
    }
  }

  // Create PENDING key
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  await prisma.idempotencyKey.upsert({
    where: {
      shopId_key: {
        shopId,
        key: idempotencyKey,
      },
    },
    update: {
      status: "PENDING",
      requestHash,
      expiresAt,
    },
    create: {
      shopId,
      key: idempotencyKey,
      requestHash,
      status: "PENDING",
      expiresAt,
    },
  });

  try {
    const result = await operation();

    // Mark COMPLETED and cache response
    await prisma.idempotencyKey.update({
      where: {
        shopId_key: {
          shopId,
          key: idempotencyKey,
        },
      },
      data: {
        status: "COMPLETED",
        statusCode: result.statusCode,
        responseBody: result.data as object,
      },
    });

    return { ...result, cached: false };
  } catch (error) {
    // Delete or mark FAILED on error so clients can retry safely
    await prisma.idempotencyKey.delete({
      where: {
        shopId_key: {
          shopId,
          key: idempotencyKey,
        },
      },
    }).catch(() => {});

    throw error;
  }
}
