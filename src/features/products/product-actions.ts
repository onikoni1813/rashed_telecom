"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { createProduct, deleteProduct, toggleProductStatus } from "./product-service";

export interface CreateProductActionInput {
  shopId: string;
  categoryId: string;
  name: string;
  brand?: string | null;
  sku?: string | null;
  barcode?: string | null;
  modelNumber?: string | null;
  isTrackStock?: boolean;
  costPrice?: number;
  sellingPrice: number;
  initialStock?: number;
  minStockAlert?: number;
  locationId?: string;
}

export async function createProductAction(input: CreateProductActionInput) {
  try {
    const shopId = input.shopId || "11111111-1111-1111-1111-111111111111";
    const name = input.name?.trim();
    if (!name) {
      return { success: false, error: "পণ্যের নাম দেওয়া আবশ্যক।" };
    }
    if (!input.categoryId) {
      return { success: false, error: "ক্যাটাগরি নির্বাচন করা আবশ্যক।" };
    }

    // Auto-generate unique SKU if not provided
    let sku = input.sku?.trim();
    if (!sku) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      sku = `SKU-${Date.now().toString().slice(-4)}${randomSuffix}`;
    }

    const sellingPrice = Number(input.sellingPrice) || 0;
    const costPrice = Number(input.costPrice) || 0;
    const initialStock = Number(input.initialStock) || 0;
    const minStockAlert = input.minStockAlert !== undefined ? Number(input.minStockAlert) : 5;

    const product = await createProduct({
      shopId,
      categoryId: input.categoryId,
      name,
      brand: input.brand?.trim() || null,
      sku,
      barcode: input.barcode?.trim() || null,
      modelNumber: input.modelNumber?.trim() || null,
      isTrackStock: input.isTrackStock ?? true,
      costPrice,
      sellingPrice,
      initialStock,
      minStockAlert,
      locationId: input.locationId,
    });

    revalidatePath("/app/products");
    revalidatePath("/app/pos");
    revalidatePath("/app/inventory");

    return {
      success: true,
      product: {
        id: product.id,
        name: product.name,
        brand: product.brand,
        sku: product.sku,
        barcode: product.barcode,
        modelNumber: product.modelNumber,
        isTrackStock: product.isTrackStock,
        costPrice: Number(product.costPrice),
        sellingPrice: Number(product.sellingPrice),
        minStockAlert: product.minStockAlert,
        isActive: product.isActive,
        createdAt: product.createdAt.toISOString(),
        category: {
          id: product.category.id,
          name: product.category.name,
          type: product.category.type,
        },
        stockBalances: product.stockBalances.map((b) => ({
          id: b.id,
          quantityOnHand: Number(b.quantityOnHand),
          averageCost: Number(b.averageCost),
          location: {
            id: b.location?.id || b.locationId,
            name: b.location?.name || "প্রধান দোকান",
          },
        })),
      },
    };
  } catch (err: any) {
    console.error("createProductAction error:", err);
    return {
      success: false,
      error: err.message || "পণ্য যুক্ত করতে ব্যর্থ হয়েছে।",
    };
  }
}

export interface CreateCategoryActionInput {
  shopId: string;
  name: string;
  type?: string;
  parentId?: string | null;
}

export async function createCategoryAction(input: CreateCategoryActionInput) {
  try {
    const shopId = input.shopId || "11111111-1111-1111-1111-111111111111";
    const name = input.name?.trim();
    if (!name) {
      return { success: false, error: "ক্যাটাগরির নাম দেওয়া আবশ্যক।" };
    }

    const existing = await prisma.category.findUnique({
      where: {
        shopId_name: {
          shopId,
          name,
        },
      },
    });

    if (existing) {
      return {
        success: false,
        error: `"${name}" নামে একটি ক্যাটাগরি ইতিমধ্যে রয়েছে। ভিন্ন নাম দিন।`,
      };
    }

    const category = await prisma.category.create({
      data: {
        shopId,
        name,
        type: input.type || "ACCESSORY",
        parentId: input.parentId || null,
      },
    });

    revalidatePath("/app/products");
    revalidatePath("/app/pos");

    return {
      success: true,
      category: {
        id: category.id,
        name: category.name,
        type: category.type,
        parentId: category.parentId,
      },
    };
  } catch (err: any) {
    console.error("createCategoryAction error:", err);
    return {
      success: false,
      error: err.message || "ক্যাটাগরি তৈরি করতে ব্যর্থ হয়েছে।",
    };
  }
}

export async function deleteProductAction(productId: string, shopId: string) {
  try {
    const defaultShopId = shopId || "11111111-1111-1111-1111-111111111111";
    const res = await deleteProduct(productId, defaultShopId);

    revalidatePath("/app/products");
    revalidatePath("/app/pos");
    revalidatePath("/app/inventory");

    return res;
  } catch (err: any) {
    console.error("deleteProductAction error:", err);
    return {
      success: false,
      deleted: false,
      deactivated: false,
      error: err.message || "পণ্য ডিলিট করতে সমস্যা হয়েছে।",
    };
  }
}

export async function toggleProductStatusAction(
  productId: string,
  shopId: string,
  isActive: boolean
) {
  try {
    const defaultShopId = shopId || "11111111-1111-1111-1111-111111111111";
    const updated = await toggleProductStatus(productId, defaultShopId, isActive);

    revalidatePath("/app/products");
    revalidatePath("/app/pos");

    return {
      success: true,
      product: {
        id: updated.id,
        isActive: updated.isActive,
      },
    };
  } catch (err: any) {
    console.error("toggleProductStatusAction error:", err);
    return {
      success: false,
      error: err.message || "স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে।",
    };
  }
}
