import Dexie, { Table } from "dexie";
import {
  SyncOutboxItem,
  DraftSale,
  DraftRepairJob,
  DraftAttendance,
} from "./types";

export class RashedTelecomDatabase extends Dexie {
  syncOutbox!: Table<SyncOutboxItem, string>;
  draftSales!: Table<DraftSale, string>;
  draftRepairs!: Table<DraftRepairJob, string>;
  draftAttendance!: Table<DraftAttendance, string>;

  constructor() {
    super("RashedTelecomOfflineDB");

    // Version 1 Schema
    this.version(1).stores({
      syncOutbox: "id, operationId, shopId, entityType, status, createdAt",
      draftSales: "id, shopId, status, createdAt",
      draftRepairs: "id, shopId, status, createdAt",
      draftAttendance: "id, shopId, syncStatus, date",
    });
  }
}

// Client-side singleton instance
let dbInstance: RashedTelecomDatabase | null = null;

export function getOfflineDatabase(): RashedTelecomDatabase {
  if (typeof window === "undefined") {
    // Return a dummy/mock instance for server-side evaluation if called during SSR
    return new RashedTelecomDatabase();
  }

  if (!dbInstance) {
    dbInstance = new RashedTelecomDatabase();
  }

  return dbInstance;
}
