import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { recordAuditLog } from "@/lib/audit/service";

export interface ShopSettingsConfig {
  phone?: string;
  address?: string;
  email?: string;
  taxNumber?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  receiptPaperSize?: "80mm" | "58mm";
  showReceiptQr?: boolean;
  lowStockThresholdDefault?: number;
  serviceWarrantyDays?: number;
  serviceTermsNote?: string;
  discountApprovalThreshold?: number;
  offlineSyncEnabled?: boolean;
  minDiagnosticFee?: number;
}

export interface SerializedShopSettings {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  settings: ShopSettingsConfig;
  createdAt: string;
  updatedAt: string;
  members: Array<{
    id: string;
    userId: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    roleName: string;
    isActive: boolean;
  }>;
  roles: Array<{
    id: string;
    name: string;
    description: string | null;
    permissionCount: number;
  }>;
  stats: {
    totalProducts: number;
    totalCustomers: number;
    totalStaff: number;
    totalSales: number;
  };
}

export interface UpdateShopSettingsInput {
  name?: string;
  currency?: string;
  timezone?: string;
  settings?: Partial<ShopSettingsConfig>;
}

const DEFAULT_SETTINGS_CONFIG: ShopSettingsConfig = {
  phone: "01700000000",
  address: "সেন্ট্রাল বাসস্ট্যান্ড রোড, কালীগঞ্জ, ঝিনাইদহ",
  email: "rashed@telecom.bd",
  taxNumber: "BIN-9812456712",
  receiptHeader: "রাশেদ টেলিকম\nমোবাইল সেলস ও অত্যাধুনিক সার্ভিসিং সেন্টার\nফোন: 01700000000",
  receiptFooter: "বিক্রিত পণ্য ৭ দিনের মধ্যে মেমোসহ ফেরতযোগ্য।\nডিসপ্লে ও ব্যাটারিতে ৩০ দিনের সার্ভিস ওয়ারেন্টি।\nআমাদের সেবায় আস্থা রাখার জন্য ধন্যবাদ!",
  receiptPaperSize: "80mm",
  showReceiptQr: true,
  lowStockThresholdDefault: 5,
  serviceWarrantyDays: 30,
  serviceTermsNote: "কাস্টমার কর্তৃক প্রদত্ত পাসওয়ার্ড/প্যাটার্ন লক সংরক্ষণ করা হবে না। সার্ভিসিং গ্রহণের সময় কাস্টমার কপি মেমো প্রদর্শন আবশ্যক।",
  discountApprovalThreshold: 500,
  offlineSyncEnabled: true,
  minDiagnosticFee: 100,
};

export async function getShopSettings(shopId: string): Promise<SerializedShopSettings> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: {
      members: {
        include: {
          user: true,
          role: true,
        },
      },
      roles: {
        include: {
          rolePermissions: true,
        },
      },
      _count: {
        select: {
          products: true,
          customers: true,
          staffProfiles: true,
          sales: true,
        },
      },
    },
  });

  if (!shop) {
    throw new NotFoundError(`Shop with ID '${shopId}' not found.`);
  }

  const storedSettings = (shop.settings as ShopSettingsConfig) || {};
  const mergedSettings: ShopSettingsConfig = {
    ...DEFAULT_SETTINGS_CONFIG,
    ...storedSettings,
  };

  return {
    id: shop.id,
    name: shop.name,
    currency: shop.currency,
    timezone: shop.timezone,
    settings: mergedSettings,
    createdAt: shop.createdAt.toISOString(),
    updatedAt: shop.updatedAt.toISOString(),
    members: shop.members.map((m: any) => ({
      id: m.id,
      userId: m.userId,
      fullName: m.user.fullName || "User",
      email: m.user.email,
      phone: m.user.phone,
      roleName: m.role?.name || "STAFF",
      isActive: m.isActive,
    })),
    roles: shop.roles.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      permissionCount: r.rolePermissions?.length || 0,
    })),
    stats: {
      totalProducts: shop._count.products,
      totalCustomers: shop._count.customers,
      totalStaff: shop._count.staffProfiles,
      totalSales: shop._count.sales,
    },
  };
}

export async function updateShopSettings(
  shopId: string,
  actorId: string,
  input: UpdateShopSettingsInput
): Promise<SerializedShopSettings> {
  const existingShop = await prisma.shop.findUnique({
    where: { id: shopId },
  });

  if (!existingShop) {
    throw new NotFoundError(`Shop with ID '${shopId}' not found.`);
  }

  if (input.name !== undefined && input.name.trim().length === 0) {
    throw new ValidationError("Shop name cannot be empty.");
  }

  const currentSettings = (existingShop.settings as Record<string, unknown>) || {};
  const newSettings = input.settings
    ? { ...currentSettings, ...input.settings }
    : currentSettings;

  const updatedShop = await prisma.shop.update({
    where: { id: shopId },
    data: {
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.currency ? { currency: input.currency.trim().toUpperCase() } : {}),
      ...(input.timezone ? { timezone: input.timezone.trim() } : {}),
      settings: newSettings as any,
    },
  });

  await recordAuditLog({
    shopId,
    actorId,
    action: "settings.update",
    entityType: "Shop",
    entityId: shopId,
    reason: "Updated shop profile and system configuration",
    beforeState: {
      name: existingShop.name,
      currency: existingShop.currency,
      timezone: existingShop.timezone,
      settings: currentSettings,
    },
    afterState: {
      name: updatedShop.name,
      currency: updatedShop.currency,
      timezone: updatedShop.timezone,
      settings: newSettings,
    },
  });

  return getShopSettings(shopId);
}
