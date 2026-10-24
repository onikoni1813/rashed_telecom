import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateBackoffMs,
  queueOutboxItem,
  getPendingOutboxItems,
  getConflictOutboxItems,
  resolveConflict,
  clearSyncedItems,
} from "@/lib/offline/sync-engine";
import { getOfflineDatabase } from "@/lib/offline/db";

const mockTable = {
  add: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  toArray: vi.fn(),
  bulkDelete: vi.fn(),
};

vi.mock("@/lib/offline/db", () => ({
  getOfflineDatabase: vi.fn(() => ({
    syncOutbox: mockTable,
    draftSales: mockTable,
    draftRepairs: mockTable,
    draftAttendance: mockTable,
  })),
}));

describe("Offline Sync Engine Unit Tests", () => {
  const shopId = "11111111-1111-1111-1111-111111111111";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("calculateBackoffMs", () => {
    it("calculates correct exponential backoff bounded at 60s", () => {
      expect(calculateBackoffMs(0)).toBe(1000);  // 1s
      expect(calculateBackoffMs(1)).toBe(2000);  // 2s
      expect(calculateBackoffMs(2)).toBe(4000);  // 4s
      expect(calculateBackoffMs(3)).toBe(8000);  // 8s
      expect(calculateBackoffMs(4)).toBe(16000); // 16s
      expect(calculateBackoffMs(5)).toBe(32000); // 32s
      expect(calculateBackoffMs(6)).toBe(60000); // capped at 60s
      expect(calculateBackoffMs(10)).toBe(60000); // capped at 60s
    });
  });

  describe("queueOutboxItem", () => {
    it("creates an outbox item with unique operationId, schemaVersion 1 and PENDING status", async () => {
      mockTable.add.mockResolvedValueOnce("item-1");

      const item = await queueOutboxItem(shopId, "SALE", {
        customerId: "cust-1",
        items: [{ productId: "prod-1", quantity: 1, unitPrice: 1500 }],
      });

      expect(item.shopId).toBe(shopId);
      expect(item.entityType).toBe("SALE");
      expect(item.schemaVersion).toBe(1);
      expect(item.status).toBe("PENDING");
      expect(item.retryCount).toBe(0);
      expect(item.maxRetries).toBe(5);
      expect(item.operationId).toBeDefined();
      expect(item.id).toBeDefined();
      expect(mockTable.add).toHaveBeenCalledWith(item);
    });
  });

  describe("getPendingOutboxItems & getConflictOutboxItems", () => {
    it("filters pending and conflict items correctly", async () => {
      mockTable.toArray.mockResolvedValueOnce([
        { id: "1", shopId, status: "PENDING", retryCount: 0, maxRetries: 5 },
        { id: "2", shopId, status: "SYNCED", retryCount: 0, maxRetries: 5 },
        { id: "3", shopId, status: "CONFLICT", retryCount: 1, maxRetries: 5 },
        { id: "4", shopId, status: "FAILED", retryCount: 2, maxRetries: 5 },
        { id: "5", shopId, status: "FAILED", retryCount: 5, maxRetries: 5 }, // maxed out
      ]);

      const pending = await getPendingOutboxItems(shopId);
      expect(pending).toHaveLength(2); // items 1 and 4

      mockTable.toArray.mockResolvedValueOnce([
        { id: "1", shopId, status: "PENDING" },
        { id: "2", shopId, status: "CONFLICT" },
      ]);

      const conflicts = await getConflictOutboxItems(shopId);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].id).toBe("2");
    });
  });

  describe("resolveConflict", () => {
    it("deletes the outbox item on DISCARD resolution", async () => {
      mockTable.get.mockResolvedValueOnce({ id: "conflict-1", status: "CONFLICT" });

      await resolveConflict("conflict-1", "DISCARD");

      expect(mockTable.delete).toHaveBeenCalledWith("conflict-1");
    });

    it("resets status to PENDING with a new operationId on RETRY resolution", async () => {
      mockTable.get.mockResolvedValueOnce({
        id: "conflict-1",
        operationId: "old-op-id",
        status: "CONFLICT",
        payload: { amount: 100 },
      });

      await resolveConflict("conflict-1", "RETRY", { amount: 120 });

      expect(mockTable.update).toHaveBeenCalledWith(
        "conflict-1",
        expect.objectContaining({
          status: "PENDING",
          retryCount: 0,
          payload: { amount: 120 },
        })
      );
    });
  });

  describe("clearSyncedItems", () => {
    it("deletes all acknowledged SYNCED items for the shop", async () => {
      mockTable.toArray.mockResolvedValueOnce([
        { id: "sync-1", shopId, status: "SYNCED" },
        { id: "sync-2", shopId, status: "SYNCED" },
        { id: "pending-1", shopId, status: "PENDING" },
      ]);

      const count = await clearSyncedItems(shopId);

      expect(count).toBe(2);
      expect(mockTable.bulkDelete).toHaveBeenCalledWith(["sync-1", "sync-2"]);
    });
  });
});
