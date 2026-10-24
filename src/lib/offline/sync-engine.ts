import { getOfflineDatabase } from "./db";
import {
  SyncOutboxItem,
  OutboxEntityType,
  SyncStatus,
  SyncResult,
} from "./types";

/**
 * Calculates exponential backoff in milliseconds:
 * 1s, 2s, 4s, 8s, 16s, max capped at 60s.
 */
export function calculateBackoffMs(retryCount: number): number {
  const base = 1000;
  const max = 60000;
  return Math.min(base * Math.pow(2, retryCount), max);
}

/**
 * Adds an operation to the local IndexedDB sync outbox.
 */
export async function queueOutboxItem(
  shopId: string,
  entityType: OutboxEntityType,
  payload: Record<string, unknown>
): Promise<SyncOutboxItem> {
  const db = getOfflineDatabase();
  const now = new Date().toISOString();

  const item: SyncOutboxItem = {
    id: crypto.randomUUID(),
    operationId: crypto.randomUUID(), // authoritative idempotency key
    shopId,
    entityType,
    schemaVersion: 1,
    payload,
    status: "PENDING",
    retryCount: 0,
    maxRetries: 5,
    createdAt: now,
    updatedAt: now,
  };

  await db.syncOutbox.add(item);
  return item;
}

/**
 * Fetches all pending or retryable outbox items.
 */
export async function getPendingOutboxItems(shopId?: string): Promise<SyncOutboxItem[]> {
  const db = getOfflineDatabase();
  const all = await db.syncOutbox.toArray();
  return all.filter((item) => {
    const matchesShop = !shopId || item.shopId === shopId;
    const isPendingOrRetryable =
      item.status === "PENDING" ||
      (item.status === "FAILED" && item.retryCount < item.maxRetries);
    return matchesShop && isPendingOrRetryable;
  });
}

/**
 * Fetches all items with CONFLICT status requiring user intervention.
 */
export async function getConflictOutboxItems(shopId?: string): Promise<SyncOutboxItem[]> {
  const db = getOfflineDatabase();
  const all = await db.syncOutbox.toArray();
  return all.filter((item) => {
    const matchesShop = !shopId || item.shopId === shopId;
    return matchesShop && item.status === "CONFLICT";
  });
}

/**
 * Processes the outbox by sending items to the authoritative server.
 * Uses the batch sync endpoint `/api/v1/sync/batch`.
 */
export async function processSyncOutbox(shopId: string): Promise<SyncResult> {
  const db = getOfflineDatabase();
  const pendingItems = await getPendingOutboxItems(shopId);

  const result: SyncResult = {
    totalProcessed: pendingItems.length,
    syncedCount: 0,
    conflictCount: 0,
    failedCount: 0,
    results: [],
  };

  if (pendingItems.length === 0) {
    return result;
  }

  // Mark all pending as SYNCING
  for (const item of pendingItems) {
    await db.syncOutbox.update(item.id, {
      status: "SYNCING",
      lastAttemptAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  try {
    const response = await fetch("/api/v1/sync/batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shopId,
        items: pendingItems.map((item) => ({
          outboxId: item.id,
          operationId: item.operationId,
          entityType: item.entityType,
          schemaVersion: item.schemaVersion,
          payload: item.payload,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const serverResults: Array<{
      outboxId: string;
      operationId: string;
      status: SyncStatus;
      serverEntityId?: string;
      error?: string;
    }> = data.data?.results || [];

    for (const res of serverResults) {
      const now = new Date().toISOString();
      if (res.status === "SYNCED") {
        await db.syncOutbox.update(res.outboxId, {
          status: "SYNCED",
          syncedAt: now,
          serverEntityId: res.serverEntityId || null,
          errorSummary: null,
          updatedAt: now,
        });
        result.syncedCount++;
      } else if (res.status === "CONFLICT") {
        await db.syncOutbox.update(res.outboxId, {
          status: "CONFLICT",
          errorSummary: res.error || "Conflict detected on server.",
          updatedAt: now,
        });
        result.conflictCount++;
      } else {
        const item = pendingItems.find((i) => i.id === res.outboxId);
        const newRetry = (item?.retryCount || 0) + 1;
        await db.syncOutbox.update(res.outboxId, {
          status: "FAILED",
          retryCount: newRetry,
          errorSummary: res.error || "Operation failed on server.",
          updatedAt: now,
        });
        result.failedCount++;
      }
      result.results.push(res);
    }
  } catch (networkError: any) {
    // Entire batch failed due to connectivity / network drop
    const now = new Date().toISOString();
    for (const item of pendingItems) {
      const newRetry = item.retryCount + 1;
      await db.syncOutbox.update(item.id, {
        status: newRetry >= item.maxRetries ? "FAILED" : "PENDING",
        retryCount: newRetry,
        errorSummary: networkError.message || "Network unreachable.",
        updatedAt: now,
      });
      result.failedCount++;
      result.results.push({
        outboxId: item.id,
        operationId: item.operationId,
        status: "FAILED",
        error: networkError.message,
      });
    }
  }

  return result;
}

/**
 * Resolves a conflicted outbox item:
 * - "DISCARD": Removes the conflicted item from IndexedDB.
 * - "RETRY": Resets status to PENDING with a new operationId and optional modified payload.
 */
export async function resolveConflict(
  outboxId: string,
  resolution: "DISCARD" | "RETRY",
  modifiedPayload?: Record<string, unknown>
): Promise<void> {
  const db = getOfflineDatabase();
  const existing = await db.syncOutbox.get(outboxId);
  if (!existing) return;

  if (resolution === "DISCARD") {
    await db.syncOutbox.delete(outboxId);
  } else {
    await db.syncOutbox.update(outboxId, {
      operationId: crypto.randomUUID(), // new idempotency key
      payload: modifiedPayload || existing.payload,
      status: "PENDING",
      retryCount: 0,
      errorSummary: null,
      updatedAt: new Date().toISOString(),
    });
  }
}

/**
 * Clears old acknowledged SYNCED items to prevent storage bloat.
 */
export async function clearSyncedItems(shopId?: string): Promise<number> {
  const db = getOfflineDatabase();
  const all = await db.syncOutbox.toArray();
  const toDelete = all.filter(
    (item) => (!shopId || item.shopId === shopId) && item.status === "SYNCED"
  );
  await db.syncOutbox.bulkDelete(toDelete.map((i) => i.id));
  return toDelete.length;
}
