/**
 * Audit log foundations
 * Defined in Master_plan.md Section 6.1
 */
export interface AuditLogEntry {
  id: string;
  shopId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  reason?: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  createdAt: string;
}
