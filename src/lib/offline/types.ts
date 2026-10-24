// Types for Dexie IndexedDB Offline Drafts and Sync Outbox
// Architecture defined in Master_plan.md (Section 10)

export type SyncStatus =
  | "LOCAL_ONLY"
  | "PENDING"
  | "SYNCING"
  | "SYNCED"
  | "CONFLICT"
  | "FAILED";

export type OutboxEntityType =
  | "SALE"
  | "REPAIR"
  | "ATTENDANCE"
  | "EXPENSE"
  | "STOCK_ADJUSTMENT";

export interface SyncOutboxItem {
  id: string; // Local primary key (UUID)
  operationId: string; // Idempotency key sent to server
  shopId: string;
  entityType: OutboxEntityType;
  schemaVersion: number;
  payload: Record<string, unknown>;
  status: SyncStatus;
  retryCount: number;
  maxRetries: number;
  lastAttemptAt?: string | null;
  errorSummary?: string | null;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string | null;
  serverEntityId?: string | null;
}

export interface DraftSale {
  id: string; // Local draft UUID
  shopId: string;
  cashierId: string;
  customerPhone?: string | null;
  customerName?: string | null;
  items: Array<{
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    serialNumber?: string | null;
  }>;
  totalAmount: number;
  paidAmount: number;
  paymentMethod: "CASH" | "BANK" | "BKASH" | "NAGAD";
  notes?: string | null;
  status: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DraftRepairJob {
  id: string; // Local draft UUID
  shopId: string;
  customerName: string;
  customerPhone: string;
  deviceBrand: string;
  deviceModel: string;
  reportedIssue: string;
  estimatedCost?: number | null;
  advancePaid?: number | null;
  status: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DraftAttendance {
  id: string;
  shopId: string;
  staffProfileId: string;
  staffName: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
  checkInTime: string;
  syncStatus: SyncStatus;
  createdAt: string;
}

export interface SyncResult {
  totalProcessed: number;
  syncedCount: number;
  conflictCount: number;
  failedCount: number;
  results: Array<{
    outboxId: string;
    operationId: string;
    status: SyncStatus;
    serverEntityId?: string;
    error?: string;
  }>;
}
