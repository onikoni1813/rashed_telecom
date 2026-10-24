/**
 * Offline Sync & Draft Engine Stubs
 * Implementation scheduled for Phase 7
 */
export type SyncStatus =
  | "LOCAL_ONLY"
  | "PENDING"
  | "SYNCING"
  | "SYNCED"
  | "CONFLICT"
  | "FAILED";

export interface OfflineDraft<T = unknown> {
  operationId: string;
  entityType: string;
  schemaVersion: number;
  localId: string;
  payload: T;
  createdAt: string;
  status: SyncStatus;
  retryCount: number;
  lastError?: string;
}
