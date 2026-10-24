/**
 * Role & Permission Foundation
 * Defined in Master_plan.md Section 12
 */
export const PERMISSIONS = [
  "dashboard.view",
  "products.view",
  "products.create",
  "products.update",
  "inventory.view",
  "inventory.adjust",
  "purchases.view",
  "purchases.create",
  "purchases.receive",
  "sales.view",
  "sales.create",
  "sales.refund",
  "service.view",
  "service.create",
  "service.update",
  "service.approve_estimate",
  "service.consume_parts",
  "service.deliver",
  "expenses.view",
  "expenses.create",
  "accounts.view_ledger",
  "reports.view_profit",
  "reports.view_stock",
  "staff.view",
  "staff.manage",
  "payroll.view",
  "payroll.process",
  "approvals.view",
  "approvals.review",
  "audit.view",
  "data.export",
  "data.import",
  "sync.push",
  "sync.pull",
  "settings.view",
  "settings.manage",
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number];
