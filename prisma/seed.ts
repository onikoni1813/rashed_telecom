import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";

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

export const STARTER_ACCOUNTS = [
  { code: "1000", name: "Cash on Hand", type: "ASSET" },
  { code: "1010", name: "Bank / MFS (bKash/Nagad)", type: "ASSET" },
  { code: "1100", name: "Accounts Receivable (Customer Dues)", type: "ASSET" },
  { code: "1200", name: "Inventory", type: "ASSET" },
  { code: "2000", name: "Accounts Payable (Supplier Payables)", type: "LIABILITY" },
  { code: "2100", name: "Customer Advances", type: "LIABILITY" },
  { code: "3000", name: "Owner Capital", type: "EQUITY" },
  { code: "3100", name: "Owner Drawings", type: "EQUITY" },
  { code: "4000", name: "Product Sales", type: "REVENUE" },
  { code: "4100", name: "Service Revenue", type: "REVENUE" },
  { code: "5000", name: "Cost of Goods Sold (COGS)", type: "EXPENSE" },
  { code: "5100", name: "Direct Service Costs", type: "EXPENSE" },
  { code: "6000", name: "Rent & Utilities", type: "EXPENSE" },
  { code: "6100", name: "Salaries & Commissions", type: "EXPENSE" },
  { code: "6200", name: "Other Operating Expenses", type: "EXPENSE" },
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
        receiptHeader: "রাশেদ টেলিকম\nমোবাইল ও সার্ভিসিং সেন্টার\nফোন: 01700000000",
      },
    },
  });

  console.log("Seeding demo admin user...");
  const adminUser = await prisma.user.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {
      email: "admin@rashedtelecom.local",
      fullName: "Rashed (Admin)",
      phone: "01700000000",
    },
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      email: "admin@rashedtelecom.local",
      fullName: "Rashed (Admin)",
      phone: "01700000000",
      isActive: true,
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
  const location = await prisma.location.upsert({
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
  const catPhone = await prisma.category.upsert({
    where: { shopId_name: { shopId: shop.id, name: "Smartphones" } },
    update: { type: "PHONE" },
    create: { shopId: shop.id, name: "Smartphones", type: "PHONE" },
  });

  const catAccessory = await prisma.category.upsert({
    where: { shopId_name: { shopId: shop.id, name: "Mobile Accessories" } },
    update: { type: "ACCESSORY" },
    create: { shopId: shop.id, name: "Mobile Accessories", type: "ACCESSORY" },
  });

  const catParts = await prisma.category.upsert({
    where: { shopId_name: { shopId: shop.id, name: "Spare Parts" } },
    update: { type: "PART" },
    create: { shopId: shop.id, name: "Spare Parts", type: "PART" },
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

  console.log("Seeding demo regular customer...");
  const customer = await prisma.customer.upsert({
    where: {
      shopId_phone: {
        shopId: shop.id,
        phone: "01712345678",
      },
    },
    update: {},
    create: {
      shopId: shop.id,
      name: "Md. Al-Amin",
      phone: "01712345678",
      email: "alamin@gmail.com",
      address: "Dhanmondi, Dhaka",
    },
  });

  console.log("Seeding sample verified supplier...");
  await prisma.supplier.upsert({
    where: {
      shopId_name: {
        shopId: shop.id,
        name: "Smart Technologies (BD) Ltd",
      },
    },
    update: {},
    create: {
      shopId: shop.id,
      name: "Smart Technologies (BD) Ltd",
      contactPerson: "Md. Karim",
      phone: "01811223344",
      email: "orders@smart-bd.com",
      address: "Dhaka, Bangladesh",
    },
  });

  console.log("Seeding verified stock items for POS checkout...");
  // 1. Samsung Galaxy A15
  const productPhone = await prisma.product.upsert({
    where: { shopId_sku: { shopId: shop.id, sku: "SAM-A15-128" } },
    update: {},
    create: {
      shopId: shop.id,
      categoryId: catPhone.id,
      name: "Samsung Galaxy A15 (6GB/128GB)",
      brand: "Samsung",
      sku: "SAM-A15-128",
      barcode: "8801234567890",
      modelNumber: "SM-A155F",
      isTrackStock: true,
      costPrice: new Prisma.Decimal(18500),
      sellingPrice: new Prisma.Decimal(21500),
      minStockAlert: 2,
    },
  });

  // 2. Anker Fast Charger 20W
  const productCharger = await prisma.product.upsert({
    where: { shopId_sku: { shopId: shop.id, sku: "ANK-20W-CHG" } },
    update: {},
    create: {
      shopId: shop.id,
      categoryId: catAccessory.id,
      name: "Anker PowerPort III 20W Fast Charger",
      brand: "Anker",
      sku: "ANK-20W-CHG",
      barcode: "194644021234",
      isTrackStock: true,
      costPrice: new Prisma.Decimal(950),
      sellingPrice: new Prisma.Decimal(1350),
      minStockAlert: 5,
    },
  });

  // 3. Samsung Galaxy A15 Replacement Display
  const productDisplay = await prisma.product.upsert({
    where: { shopId_sku: { shopId: shop.id, sku: "PART-DISP-SAM-A15" } },
    update: {},
    create: {
      shopId: shop.id,
      categoryId: catParts.id,
      name: "Original AMOLED Display for Samsung A15",
      brand: "Samsung",
      sku: "PART-DISP-SAM-A15",
      modelNumber: "SM-A155F",
      isTrackStock: true,
      costPrice: new Prisma.Decimal(1800),
      sellingPrice: new Prisma.Decimal(2800),
      minStockAlert: 3,
    },
  });

  // 4. Samsung Galaxy A15 Replacement Battery
  const productBattery = await prisma.product.upsert({
    where: { shopId_sku: { shopId: shop.id, sku: "PART-BAT-SAM-A15" } },
    update: {},
    create: {
      shopId: shop.id,
      categoryId: catParts.id,
      name: "5000mAh Battery for Samsung Galaxy A15",
      brand: "Samsung",
      sku: "PART-BAT-SAM-A15",
      modelNumber: "EB-BA156ABY",
      isTrackStock: true,
      costPrice: new Prisma.Decimal(850),
      sellingPrice: new Prisma.Decimal(1500),
      minStockAlert: 5,
    },
  });

  // Seed on-hand stock balances & historical movements
  const stockItems = [
    { product: productPhone, qty: 5, cost: 18500 },
    { product: productCharger, qty: 20, cost: 950 },
    { product: productDisplay, qty: 10, cost: 1800 },
    { product: productBattery, qty: 15, cost: 850 },
  ];

  for (const item of stockItems) {
    const existingBal = await prisma.stockBalance.findFirst({
      where: {
        shopId: shop.id,
        productId: item.product.id,
        locationId: location.id,
      },
    });

    if (!existingBal) {
      await prisma.stockBalance.create({
        data: {
          shopId: shop.id,
          productId: item.product.id,
          locationId: location.id,
          quantityOnHand: new Prisma.Decimal(item.qty),
          averageCost: new Prisma.Decimal(item.cost),
        },
      });

      await prisma.stockMovement.create({
        data: {
          shopId: shop.id,
          productId: item.product.id,
          locationId: location.id,
          movementType: "PURCHASE_RECEIPT",
          referenceType: "OpeningStock",
          quantity: new Prisma.Decimal(item.qty),
          unitCost: new Prisma.Decimal(item.cost),
          balanceAfter: new Prisma.Decimal(item.qty),
          reason: "Initial opening stock setup",
          actorId: adminUser.id,
        },
      });
    }
  }

  // Seed Serial/IMEI numbers for the Samsung Galaxy A15
  const sampleImeis = [
    { imei1: "354123456789011", imei2: "354123456789012" },
    { imei1: "354123456789021", imei2: "354123456789022" },
    { imei1: "354123456789031", imei2: "354123456789032" },
  ];

  for (const imei of sampleImeis) {
    const exists = await prisma.serialNumber.findFirst({
      where: { shopId: shop.id, imei1: imei.imei1 },
    });
    if (!exists) {
      await prisma.serialNumber.create({
        data: {
          shopId: shop.id,
          productId: productPhone.id,
          imei1: imei.imei1,
          imei2: imei.imei2,
          status: "IN_STOCK",
        },
      });
    }
  }

  // Seed Technician User
  const techUser = await prisma.user.upsert({
    where: { email: "tech@rashedtelecom.local" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      email: "tech@rashedtelecom.local",
      fullName: "Kamrul Hasan (Senior Tech)",
      phone: "01899001122",
      isActive: true,
    },
  });

  const techRole = await prisma.role.findFirst({
    where: { name: "TECHNICIAN", isSystem: true },
  });

  if (techRole) {
    await prisma.shopMember.upsert({
      where: {
        shopId_userId: {
          shopId: shop.id,
          userId: techUser.id,
        },
      },
      update: { roleId: techRole.id },
      create: {
        shopId: shop.id,
        userId: techUser.id,
        roleId: techRole.id,
        isActive: true,
      },
    });
  }

  // Seed Demo Service Job (JOB-000001)
  const existingJob = await prisma.serviceJob.findFirst({
    where: { shopId: shop.id, jobNumber: "JOB-000001" },
  });

  if (!existingJob) {
    const demoJob = await prisma.serviceJob.create({
      data: {
        shopId: shop.id,
        jobNumber: "JOB-000001",
        customerId: customer.id,
        deviceBrand: "Samsung",
        deviceModel: "Galaxy A15",
        deviceImei: "354123456789099",
        deviceColor: "Blue Black",
        intakeCondition: "Front glass shattered, touch unresponsive, frame lightly scratched",
        accessoriesReceived: "Phone with SIM tray only, no charger, no box",
        reportedIssue: "Display broken after drop, touch not responding",
        status: "DIAGNOSING",
        assignedTechnicianId: techUser.id,
        intakeCashierId: adminUser.id,
        estimatedCost: new Prisma.Decimal(3300),
        labourCost: new Prisma.Decimal(500),
        partsCost: new Prisma.Decimal(2800),
        totalAmount: new Prisma.Decimal(3300),
        paidAmount: new Prisma.Decimal(0),
        dueAmount: new Prisma.Decimal(3300),
        paymentStatus: "PENDING",
        notes: "Customer needs delivery by tomorrow evening",
        statusHistory: {
          create: [
            {
              fromStatus: "INTAKE",
              toStatus: "INTAKE",
              changedById: adminUser.id,
              notes: "Device received at counter",
            },
            {
              fromStatus: "INTAKE",
              toStatus: "DIAGNOSING",
              changedById: techUser.id,
              notes: "Device transferred to repair bench for diagnosis",
            },
          ],
        },
        diagnostics: {
          create: {
            technicianId: techUser.id,
            diagnosisFindings: "Display panel damaged. Motherboard and battery functioning normally. Requires display replacement.",
            estimatedLabour: new Prisma.Decimal(500),
            estimatedParts: new Prisma.Decimal(2800),
            customerApproved: true,
            approvedAt: new Date(),
            customerNotes: "Customer agreed on phone call for original display replacement",
          },
        },
      },
    });
  }

  // Open active cash session for cashier
  const activeSession = await prisma.cashSession.findFirst({
    where: { shopId: shop.id, status: "OPEN" },
  });

  if (!activeSession) {
    await prisma.cashSession.create({
      data: {
        shopId: shop.id,
        cashierId: adminUser.id,
        openingCash: new Prisma.Decimal(5000),
        status: "OPEN",
        notes: "Daily opening session for Rashed Telecom Main Register",
      },
    });
  }

  console.log(`Phase 1, 2, 3, & 4 Seed completed successfully!`);
  console.log(`- Shop: ${shop.name} (${shop.id})`);
  console.log(`- Technician: ${techUser.fullName} (${techUser.email})`);
  console.log(`- Active Demo Repair Job: JOB-000001 (Samsung Galaxy A15)`);
  console.log(`- Shop: ${shop.name} (${shop.id})`);
  console.log(`- Active Cash Session ready for POS checkout.`);
  console.log(`- Demo Customer: ${customer.name} (${customer.phone})`);
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
