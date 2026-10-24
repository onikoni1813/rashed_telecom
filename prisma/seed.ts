import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const DEFAULT_PERMISSIONS = [
  { key: "dashboard.view", description: "View shop dashboard overview", module: "dashboard" },
  { key: "products.view", description: "View product catalogue", module: "products" },
  { key: "products.create", description: "Create new products and variants", module: "products" },
  { key: "products.update", description: "Update existing product details and pricing", module: "products" },
  { key: "inventory.view", description: "View stock balances and inventory", module: "inventory" },
  { key: "inventory.adjust", description: "Perform manual stock adjustments", module: "inventory" },
  { key: "purchases.view", description: "View purchase orders and goods receipts", module: "purchases" },
  { key: "purchases.create", description: "Create purchase orders", module: "purchases" },
  { key: "purchases.receive", description: "Receive goods into inventory from purchases", module: "purchases" },
  { key: "sales.view", description: "View sales and invoices", module: "sales" },
  { key: "sales.create", description: "Create sales and process POS checkouts", module: "sales" },
  { key: "sales.refund", description: "Process sales returns and refunds", module: "sales" },
  { key: "service.view", description: "View service repair jobs", module: "service" },
  { key: "service.create", description: "Create new device repair intake jobs", module: "service" },
  { key: "service.update", description: "Update repair job status and diagnostics", module: "service" },
  { key: "service.approve_estimate", description: "Approve customer repair estimates", module: "service" },
  { key: "service.consume_parts", description: "Allocate and consume inventory parts for repair", module: "service" },
  { key: "service.deliver", description: "Mark repair job as delivered to customer", module: "service" },
  { key: "expenses.view", description: "View expense records", module: "expenses" },
  { key: "expenses.create", description: "Record shop expenses", module: "expenses" },
  { key: "accounts.view_ledger", description: "View general ledger and chart of accounts", module: "accounting" },
  { key: "reports.view_profit", description: "View profit and loss financial reports", module: "reports" },
  { key: "reports.view_stock", description: "View inventory valuation and movement reports", module: "reports" },
  { key: "sync.push", description: "Push offline drafts to authoritative server", module: "sync" },
  { key: "sync.pull", description: "Pull synchronized state from server", module: "sync" },
  { key: "settings.view", description: "View shop settings", module: "settings" },
  { key: "settings.manage", description: "Manage shop settings, roles, and members", module: "settings" },
];

export const SYSTEM_ROLES: Record<string, { description: string; permissions: string[] }> = {
  OWNER: {
    description: "Shop Owner / Super Administrator with full permissions",
    permissions: DEFAULT_PERMISSIONS.map((p) => p.key),
  },
  MANAGER: {
    description: "Shop Manager with operational and reporting permissions",
    permissions: [
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
      "service.view",
      "service.create",
      "service.update",
      "service.approve_estimate",
      "service.consume_parts",
      "service.deliver",
      "expenses.view",
      "expenses.create",
      "reports.view_profit",
      "reports.view_stock",
      "sync.push",
      "sync.pull",
      "settings.view",
    ],
  },
  CASHIER: {
    description: "Sales representative and POS cashier",
    permissions: [
      "dashboard.view",
      "products.view",
      "inventory.view",
      "sales.view",
      "sales.create",
      "sync.push",
      "sync.pull",
    ],
  },
  TECHNICIAN: {
    description: "Mobile servicing technician managing repairs and parts consumption",
    permissions: [
      "dashboard.view",
      "products.view",
      "inventory.view",
      "service.view",
      "service.create",
      "service.update",
      "service.approve_estimate",
      "service.consume_parts",
      "service.deliver",
      "sync.push",
      "sync.pull",
    ],
  },
  ACCOUNTANT: {
    description: "Accountant managing expenses, ledger, and financial statements",
    permissions: [
      "dashboard.view",
      "sales.view",
      "purchases.view",
      "expenses.view",
      "expenses.create",
      "accounts.view_ledger",
      "reports.view_profit",
      "reports.view_stock",
      "sync.push",
      "sync.pull",
    ],
  },
};

export async function main() {
  console.log("Seeding system permissions...");
  const permissionMap = new Map<string, string>();

  for (const perm of DEFAULT_PERMISSIONS) {
    const created = await prisma.permission.upsert({
      where: { key: perm.key },
      update: { description: perm.description, module: perm.module },
      create: {
        key: perm.key,
        description: perm.description,
        module: perm.module,
      },
    });
    permissionMap.set(perm.key, created.id);
  }

  console.log("Seeding system roles & role-permissions...");
  for (const [roleName, roleData] of Object.entries(SYSTEM_ROLES)) {
    // System roles have null shopId
    const role = await prisma.role.upsert({
      where: {
        shopId_name: {
          shopId: null as unknown as string,
          name: roleName,
        },
      },
      update: { description: roleData.description, isSystem: true },
      create: {
        name: roleName,
        description: roleData.description,
        isSystem: true,
      },
    });

    for (const permKey of roleData.permissions) {
      const permissionId = permissionMap.get(permKey);
      if (permissionId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId,
          },
        });
      }
    }
  }

  console.log("Seeding default demo shop (Rashed Telecom)...");
  const shop = await prisma.shop.upsert({
    where: { id: "11111111-1111-1111-1111-111111111111" },
    update: {},
    create: {
      id: "11111111-1111-1111-1111-111111111111",
      name: "Rashed Telecom",
      currency: "BDT",
      timezone: "Asia/Dhaka",
      settings: {
        offlineSyncEnabled: true,
        receiptHeader: "রাশেদ টেলিকম\nমোবাইল ও সার্ভিসিং সেন্টার",
      },
    },
  });

  console.log(`Phase 1 Seed completed successfully. Default shop ID: ${shop.id}`);
}

if (process.env.NODE_ENV !== "test") {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
