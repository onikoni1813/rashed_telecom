import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ValidationError, NotFoundError } from "@/lib/errors";

export interface StockMovementParams {
  shopId: string;
  productId: string;
  variantId?: string | null;
  locationId: string;
  movementType:
    | "PURCHASE_RECEIPT"
    | "SALE"
    | "SERVICE_CONSUMPTION"
    | "ADJUSTMENT_IN"
    | "ADJUSTMENT_OUT"
    | "PURCHASE_RETURN"
    | "SALES_RETURN";
  referenceType?: string;
  referenceId?: string;
  quantity: number | Prisma.Decimal;
  unitCost: number | Prisma.Decimal;
  reason?: string;
  actorId?: string;
}

export interface StockReconciliationResult {
  shopId: string;
  productId: string;
  variantId?: string | null;
  locationId: string;
  balanceOnHand: number;
  movementSum: number;
  discrepancy: number;
  isReconciled: boolean;
}

/**
 * Calculates weighted average unit cost on incoming inventory
 */
export function calculateWeightedAverageCost(
  currentQty: number,
  currentAvgCost: number,
  incomingQty: number,
  incomingUnitCost: number
): number {
  if (incomingQty <= 0) return currentAvgCost;
  const newTotalQty = currentQty + incomingQty;
  if (newTotalQty <= 0) return incomingUnitCost;

  const currentTotalVal = Math.max(0, currentQty) * currentAvgCost;
  const incomingTotalVal = incomingQty * incomingUnitCost;
  const weighted = (currentTotalVal + incomingTotalVal) / newTotalQty;
  return Math.round(weighted * 100) / 100;
}

/**
 * Authoritative transactional stock movement writer
 * Mutates StockBalance performance projection and writes historical StockMovement ledger atomically.
 */
export async function recordStockMovement(
  params: StockMovementParams,
  txPrisma: Prisma.TransactionClient | PrismaClient = prisma
) {
  const qtyDecimal = new Prisma.Decimal(params.quantity);
  const qtyNum = Number(qtyDecimal);
  const costDecimal = new Prisma.Decimal(params.unitCost);
  const costNum = Number(costDecimal);

  // 1. Fetch current product and verify stock tracking policy
  const product = await txPrisma.product.findUnique({
    where: { id: params.productId },
  });

  if (!product || product.shopId !== params.shopId) {
    throw new NotFoundError("Product not found or does not belong to this shop.");
  }

  // 2. Fetch current stock balance
  const existingBalance = await txPrisma.stockBalance.findFirst({
    where: {
      shopId: params.shopId,
      productId: params.productId,
      variantId: params.variantId || null,
      locationId: params.locationId,
    },
  });

  const currentQtyNum = existingBalance ? Number(existingBalance.quantityOnHand) : 0;
  const currentAvgCostNum = existingBalance ? Number(existingBalance.averageCost) : 0;
  const newQtyNum = currentQtyNum + qtyNum;

  // 3. Prevent negative stock on tracked physical goods
  if (product.isTrackStock && newQtyNum < 0) {
    throw new ValidationError(
      `Insufficient stock on hand for '${product.name}'. Current: ${currentQtyNum}, Requested: ${Math.abs(qtyNum)}`
    );
  }

  // 4. Calculate updated weighted average cost on positive stock additions
  let updatedAvgCost = currentAvgCostNum;
  if (qtyNum > 0) {
    updatedAvgCost = calculateWeightedAverageCost(
      currentQtyNum,
      currentAvgCostNum,
      qtyNum,
      costNum
    );
  }

  const newQtyDecimal = new Prisma.Decimal(newQtyNum);
  const newAvgCostDecimal = new Prisma.Decimal(updatedAvgCost);

  // 5. Upsert StockBalance projection
  if (existingBalance) {
    await txPrisma.stockBalance.update({
      where: { id: existingBalance.id },
      data: {
        quantityOnHand: newQtyDecimal,
        averageCost: newAvgCostDecimal,
      },
    });
  } else {
    await txPrisma.stockBalance.create({
      data: {
        shopId: params.shopId,
        productId: params.productId,
        variantId: params.variantId || null,
        locationId: params.locationId,
        quantityOnHand: newQtyDecimal,
        averageCost: newAvgCostDecimal,
      },
    });
  }

  // 6. Record immutable historical StockMovement ledger entry
  const movement = await txPrisma.stockMovement.create({
    data: {
      shopId: params.shopId,
      productId: params.productId,
      variantId: params.variantId || null,
      locationId: params.locationId,
      movementType: params.movementType,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      quantity: qtyDecimal,
      unitCost: costDecimal,
      balanceAfter: newQtyDecimal,
      reason: params.reason,
      actorId: params.actorId,
    },
  });

  return {
    movement,
    quantityOnHand: newQtyNum,
    averageCost: updatedAvgCost,
  };
}

/**
 * Reconciles the stock balance projection against the historical sum of stock movements.
 * Enforces Master Plan Section 2 rule 8 & Section 16 rule.
 */
export async function reconcileStockBalance(params: {
  shopId: string;
  productId: string;
  variantId?: string | null;
  locationId: string;
}): Promise<StockReconciliationResult> {
  const balance = await prisma.stockBalance.findFirst({
    where: {
      shopId: params.shopId,
      productId: params.productId,
      variantId: params.variantId || null,
      locationId: params.locationId,
    },
  });

  const movementsAggregate = await prisma.stockMovement.aggregate({
    where: {
      shopId: params.shopId,
      productId: params.productId,
      variantId: params.variantId || null,
      locationId: params.locationId,
    },
    _sum: {
      quantity: true,
    },
  });

  const balanceOnHand = balance ? Number(balance.quantityOnHand) : 0;
  const movementSum = movementsAggregate._sum.quantity
    ? Number(movementsAggregate._sum.quantity)
    : 0;
  const discrepancy = Math.round((balanceOnHand - movementSum) * 100) / 100;

  return {
    shopId: params.shopId,
    productId: params.productId,
    variantId: params.variantId,
    locationId: params.locationId,
    balanceOnHand,
    movementSum,
    discrepancy,
    isReconciled: Math.abs(discrepancy) < 0.001,
  };
}
