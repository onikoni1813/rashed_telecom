import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPin } from "../src/lib/auth/local-session";

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
  { key: "staff.view", description: "View staff list, profiles, and attendance", module: "staff" },
  { key: "staff.manage", description: "Create, update, and manage staff members", module: "staff" },
  { key: "payroll.view", description: "View payroll and salary records", module: "payroll" },
  { key: "payroll.process", description: "Process and disburse monthly staff salaries", module: "payroll" },
  { key: "approvals.view", description: "View approval requests", module: "approvals" },
  { key: "approvals.review", description: "Approve or reject maker-checker approval requests", module: "approvals" },
  { key: "audit.view", description: "Search and inspect system audit logs", module: "audit" },
  { key: "data.export", description: "Export catalog, customer, and statement data", module: "operations" },
  { key: "data.import", description: "Import bulk data into system", module: "operations" },
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

export const STARTER_ACCOUNTS = [
  { code: "1000", name: "Cash on Hand", type: "ASSET" },
  { code: "1010", name: "Bank / MFS (bKash/Nagad)", type: "ASSET" },
  { code: "1100", name: "Accounts Receivable (Customer Dues)", type: "ASSET" },
  { code: "1200", name: "Inventory", type: "ASSET" },
  { code: "2000", name: "Accounts Payable (Supplier Payables)", type: "LIABILITY" },
  { code: "2100", name: "Customer Advances", type: "LIABILITY" },
  { code: "2200", name: "Loans Payable (Borrowings)", type: "LIABILITY" },
  { code: "3000", name: "Owner Capital", type: "EQUITY" },
  { code: "3100", name: "Owner Drawings", type: "EQUITY" },
  { code: "4000", name: "Product Sales", type: "REVENUE" },
  { code: "4100", name: "Service Revenue", type: "REVENUE" },
  { code: "5000", name: "Cost of Goods Sold (COGS)", type: "EXPENSE" },
  { code: "5100", name: "Direct Service Costs", type: "EXPENSE" },
  { code: "6000", name: "Rent & Utilities", type: "EXPENSE" },
  { code: "6100", name: "Salaries & Commissions", type: "EXPENSE" },
  { code: "6200", name: "Other Operating Expenses", type: "EXPENSE" },
  { code: "6300", name: "Interest Expense", type: "EXPENSE" },
];

export const STANDARD_EXPENSE_CATEGORIES = [
  { name: "দোকান ভাড়া", code: "EXP-RENT" },
  { name: "বিদ্যুৎ ও ইউটিলিটি", code: "EXP-UTIL" },
  { name: "কর্মী বেতন ও কমিশন", code: "EXP-SALARY" },
  { name: "চা, নাস্তা ও মেহমানদারি", code: "EXP-ENT" },
  { name: "যন্ত্রপাতি ও টুলস ক্রয়", code: "EXP-TOOLS" },
  { name: "পরিবহন ও কুরিয়ার", code: "EXP-TRANS" },
  { name: "অন্যান্য বিবিধ খরচ", code: "EXP-MISC" },
];

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
  const roleMap = new Map<string, string>();

  for (const [roleName, roleData] of Object.entries(SYSTEM_ROLES)) {
    let role = await prisma.role.findFirst({
      where: { name: roleName, isSystem: true },
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          name: roleName,
          description: roleData.description,
          isSystem: true,
        },
      });
    } else {
      role = await prisma.role.update({
        where: { id: role.id },
        data: { description: roleData.description },
      });
    }

    roleMap.set(roleName, role.id);

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

  console.log("Seeding shop profile (Rashed Telecom)...");
  const shop = await prisma.shop.upsert({
    where: { id: "11111111-1111-1111-1111-111111111111" },
    update: {
      name: "Rashed Telecom",
      currency: "BDT",
      timezone: "Asia/Dhaka",
    },
    create: {
      id: "11111111-1111-1111-1111-111111111111",
      name: "Rashed Telecom",
      currency: "BDT",
      timezone: "Asia/Dhaka",
      settings: {
        offlineSyncEnabled: true,
        receiptHeader: "রাশেদ টেলিকম\nমোবাইল বিক্রয় ও সার্ভিসিং সেন্টার\nফোন: 01700000000",
      },
    },
  });

  console.log("Seeding admin/owner user with default PIN...");
  const defaultPin = hashPin("1234");
  const adminUser = await prisma.user.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {
      email: "rashedsarkarofficial@gmail.com",
      fullName: "Rashed Sarkar",
      phone: "01521378476",
    },
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      email: "rashedsarkarofficial@gmail.com",
      fullName: "Rashed Sarkar",
      phone: "01521378476",
      isActive: true,
      pinHash: defaultPin.hash,
      pinSalt: defaultPin.salt,
    },
  });

  const ownerRoleId = roleMap.get("OWNER");
  if (ownerRoleId) {
    await prisma.shopMember.upsert({
      where: {
        shopId_userId: {
          shopId: shop.id,
          userId: adminUser.id,
        },
      },
      update: {
        roleId: ownerRoleId,
        isActive: true,
      },
      create: {
        shopId: shop.id,
        userId: adminUser.id,
        roleId: ownerRoleId,
        isActive: true,
      },
    });
  }

  console.log("Seeding default stock location...");
  await prisma.location.upsert({
    where: {
      shopId_name: {
        shopId: shop.id,
        name: "Main Shop Floor",
      },
    },
    update: {},
    create: {
      shopId: shop.id,
      name: "Main Shop Floor",
      isDefault: true,
    },
  });

  console.log("Seeding standard categories...");
  await prisma.category.upsert({
    where: { shopId_name: { shopId: shop.id, name: "স্মার্টফোন" } },
    update: { type: "PHONE" },
    create: { shopId: shop.id, name: "স্মার্টফোন", type: "PHONE" },
  });

  await prisma.category.upsert({
    where: { shopId_name: { shopId: shop.id, name: "মোবাইল এক্সেসরিজ" } },
    update: { type: "ACCESSORY" },
    create: { shopId: shop.id, name: "মোবাইল এক্সেসরিজ", type: "ACCESSORY" },
  });

  await prisma.category.upsert({
    where: { shopId_name: { shopId: shop.id, name: "স্পেয়ার পার্টস" } },
    update: { type: "PART" },
    create: { shopId: shop.id, name: "স্পেয়ার পার্টস", type: "PART" },
  });

  console.log("Seeding chart of accounts...");
  for (const acc of STARTER_ACCOUNTS) {
    await prisma.account.upsert({
      where: {
        shopId_code: {
          shopId: shop.id,
          code: acc.code,
        },
      },
      update: { name: acc.name, type: acc.type },
      create: {
        shopId: shop.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
      },
    });
  }

  console.log("Seeding standard expense categories...");
  for (const expCat of STANDARD_EXPENSE_CATEGORIES) {
    await prisma.expenseCategory.upsert({
      where: {
        shopId_name: {
          shopId: shop.id,
          name: expCat.name,
        },
      },
      update: { code: expCat.code },
      create: {
        shopId: shop.id,
        name: expCat.name,
        code: expCat.code,
      },
    });
  }

  console.log("Seeding owner staff profile...");
  await prisma.staffProfile.upsert({
    where: { shopId_employeeCode: { shopId: shop.id, employeeCode: "EMP-001" } },
    update: {
      designation: "মালিক ও প্রধান পরিচালক",
      baseSalary: 0,
      compensationType: "SALARY",
    },
    create: {
      shopId: shop.id,
      userId: adminUser.id,
      employeeCode: "EMP-001",
      designation: "মালিক ও প্রধান পরিচালক",
      department: "Management",
      joiningDate: new Date(),
      compensationType: "SALARY",
      baseSalary: 0,
      isActive: true,
    },
  });

  console.log(`\n======================================================`);
  console.log(`Production Clean Seed completed successfully!`);
  console.log(`- Shop: ${shop.name} (${shop.id})`);
  console.log(`- Admin/Owner: ${adminUser.fullName} (PIN: 1234)`);
  console.log(`- Zero demo technicians, zero dummy products, zero fake stock`);
  console.log(`======================================================\n`);
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
