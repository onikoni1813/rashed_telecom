"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { recordStockMovement } from "./stock-service";
import { recordAuditLog } from "@/lib/audit/service";

export interface StockAdjustmentInput {
  shopId: string;
  productId: string;
  locationId: string;
  quantity: number; // positive for addition, negative for deduction
  reason: string;
  unitCost?: number;
}

export async function createStockAdjustmentAction(input: StockAdjustmentInput) {
  try {
    const shopId = input.shopId || "11111111-1111-1111-1111-111111111111";
    if (!input.productId) {
      return { success: false, error: "পণ্য নির্বাচন করা আবশ্যক।" };
    }
    if (!input.locationId) {
      return { success: false, error: "লোকেশন নির্বাচন করা আবশ্যক।" };
    }
    const qty = Number(input.quantity);
    if (!qty || qty === 0) {
      return { success: false, error: "সমন্বয়ের পরিমাণ ০ হতে পারে না।" };
    }
    const reason = input.reason?.trim();
    if (!reason || reason.length < 3) {
      return { success: false, error: "সমন্বয়ের সঠিক কারণ (কমপক্ষে ৩ অক্ষর) লিখুন।" };
    }

    const product = await prisma.product.findUnique({
      where: { id: input.productId },
    });
    if (!product || product.shopId !== shopId) {
      return { success: false, error: "পণ্যটি পাওয়া যায়নি।" };
    }

    const unitCost = input.unitCost !== undefined ? Number(input.unitCost) : Number(product.costPrice);
    const movementType = qty > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT";
    const actorId = "00000000-0000-0000-0000-000000000001";

    const result = await recordStockMovement({
      shopId,
      productId: input.productId,
      locationId: input.locationId,
      movementType,
      referenceType: "ManualAdjustment",
      quantity: qty,
      unitCost,
      reason,
      actorId,
    });

    await recordAuditLog({
      shopId,
      actorId,
      action: "inventory.adjust",
      entityType: "StockMovement",
      entityId: result.movement.id,
      reason,
      afterState: {
        productId: input.productId,
        adjustmentQuantity: qty,
        newBalanceOnHand: result.quantityOnHand,
      },
    });

    revalidatePath("/app/inventory");
    revalidatePath("/app/products");
    revalidatePath("/app/pos");

    return {
      success: true,
      movement: {
        id: result.movement.id,
        createdAt: result.movement.createdAt.toISOString(),
        movementType,
        quantity: qty,
        unitCost,
        balanceAfter: result.quantityOnHand,
        reason,
        referenceType: "ManualAdjustment",
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
        },
      },
      updatedBalance: {
        productId: input.productId,
        quantityOnHand: result.quantityOnHand,
        averageCost: result.averageCost,
      },
    };
  } catch (err: any) {
    console.error("createStockAdjustmentAction error:", err);
    return {
      success: false,
      error: err.message || "স্টক সমন্বয় করতে সমস্যা হয়েছে।",
    };
  }
}
