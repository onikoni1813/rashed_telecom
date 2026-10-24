import { describe, it, expect, vi } from "vitest";
import { executeWithIdempotency, computeRequestHash } from "@/lib/idempotency/service";
import { ConflictError } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    idempotencyKey: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe("Idempotency Service", () => {
  const shopId = "11111111-1111-1111-1111-111111111111";

  it("computes deterministic SHA-256 hash for identical payloads", () => {
    const payload = { amount: 1500, customerId: "cust-1" };
    const hash1 = computeRequestHash(payload);
    const hash2 = computeRequestHash({ ...payload });
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it("executes operation normally when idempotency key is not supplied", async () => {
    const op = vi.fn().mockResolvedValue({ statusCode: 200, data: { ok: true } });
    const result = await executeWithIdempotency({
      shopId,
      operation: op,
    });

    expect(op).toHaveBeenCalledTimes(1);
    expect(result.cached).toBe(false);
    expect(result.data).toEqual({ ok: true });
  });

  it("returns cached result without re-executing when key is already COMPLETED", async () => {
    const key = "idem-key-1";
    const payload = { amount: 500 };
    const hash = computeRequestHash(payload);

    vi.mocked(prisma.idempotencyKey.findUnique).mockResolvedValueOnce({
      id: "id-1",
      shopId,
      key,
      requestHash: hash,
      status: "COMPLETED",
      statusCode: 201,
      responseBody: { invoiceId: "inv-999" },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 100000),
    } as any);

    const op = vi.fn();
    const result = await executeWithIdempotency({
      shopId,
      idempotencyKey: key,
      payload,
      operation: op,
    });

    expect(op).not.toHaveBeenCalled();
    expect(result.cached).toBe(true);
    expect(result.statusCode).toBe(201);
    expect(result.data).toEqual({ invoiceId: "inv-999" });
  });

  it("throws ConflictError if same key is currently PENDING processing", async () => {
    const key = "idem-key-pending";
    const payload = { amount: 500 };
    const hash = computeRequestHash(payload);

    vi.mocked(prisma.idempotencyKey.findUnique).mockResolvedValueOnce({
      id: "id-2",
      shopId,
      key,
      requestHash: hash,
      status: "PENDING",
      statusCode: null,
      responseBody: null,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 100000),
    } as any);

    await expect(
      executeWithIdempotency({
        shopId,
        idempotencyKey: key,
        payload,
        operation: vi.fn(),
      })
    ).rejects.toThrow(ConflictError);
  });

  it("throws ConflictError if payload changes for the same key", async () => {
    const key = "idem-key-reused";

    vi.mocked(prisma.idempotencyKey.findUnique).mockResolvedValueOnce({
      id: "id-3",
      shopId,
      key,
      requestHash: "different-hash-value-12345",
      status: "COMPLETED",
      statusCode: 200,
      responseBody: {},
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 100000),
    } as any);

    await expect(
      executeWithIdempotency({
        shopId,
        idempotencyKey: key,
        payload: { amount: 999 },
        operation: vi.fn(),
      })
    ).rejects.toThrow(ConflictError);
  });
});
