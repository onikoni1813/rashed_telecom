import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { recordStockMovement } from "@/features/inventory/stock-service";
import { recordAuditLog } from "@/lib/audit/service";

export interface CreatePOItemInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitCost: number;
}

export interface CreatePOInput {
  shopId: string;
  supplierId: string;
  items: CreatePOItemInput[];
  expectedAt?: Date | null;
  notes?: string | null;
  actorId?: string;
}

export interface ReceiveItemInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitCost: number;
  serials?: Array<{
    imei1?: string;
    imei2?: string;
    serialNumber?: string;
  }>;
}

export interface ReceiveGoodsInput {
  shopId: string;
  purchaseOrderId: string;
  locationId: string;
  receivedItems: ReceiveItemInput[];
  notes?: string | null;
  actorId?: string;
}

/**
 * Creates a purchase order.
 * CRITICAL RULE: A purchase order does NOT increase stock on hand until goods are received!
 */
export async function createPurchaseOrder(input: CreatePOInput) {
  if (!input.items || input.items.length === 0) {
    throw new ValidationError("Purchase order must have at least one line item.");
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id: input.supplierId },
  });

  if (!supplier || supplier.shopId !== input.shopId) {
    throw new NotFoundError("Supplier not found or does not belong to this shop.");
  }

  // Generate sequential PO Number
  const count = await prisma.purchaseOrder.count({
    where: { shopId: input.shopId },
  });
  const poNumber = `PO-${String(count + 1).padStart(5, "0")}`;

  let totalAmountNum = 0;
  for (const item of input.items) {
    if (item.quantity <= 0) {
      throw new ValidationError("Item quantity must be greater than zero.");
    }
    if (item.unitCost < 0) {
      throw new ValidationError("Item unit cost cannot be negative.");
    }
    totalAmountNum += item.quantity * item.unitCost;
  }

  const po = await prisma.purchaseOrder.create({
    data: {
      shopId: input.shopId,
      supplierId: input.supplierId,
      poNumber,
      status: "ORDERED",
      totalAmount: new Prisma.Decimal(totalAmountNum),
      expectedAt: input.expectedAt,
      notes: input.notes,
      items: {
        create: input.items.map((it) => ({
          productId: it.productId,
          variantId: it.variantId || null,
          quantity: it.quantity,
          unitCost: new Prisma.Decimal(it.unitCost),
          receivedQuantity: 0,
        })),
      },
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      supplier: true,
    },
  });

  if (input.actorId) {
    await recordAuditLog({
      shopId: input.shopId,
      actorId: input.actorId,
      action: "purchase_order.create",
      entityType: "PurchaseOrder",
      entityId: po.id,
      reason: `Created PO ${po.poNumber} for supplier ${supplier.name}`,
      afterState: {
        poNumber: po.poNumber,
        totalAmount: totalAmountNum,
        itemCount: input.items.length,
      },
    });
  }

  return po;
}

/**
 * Authoritative goods receiving service.
 * Executed in a single atomic PostgreSQL transaction:
 * 1. Creates GoodsReceipt & GoodsReceiptItems.
 * 2. Writes StockMovement and updates StockBalance.
 * 3. Registers serial/IMEI identifiers.
 * 4. Increments PO received quantities and updates PO status.
 * 5. Updates Supplier payable balance.
 * 6. Logs audit trail.
 */
export async function receiveGoods(input: ReceiveGoodsInput) {
  if (!input.receivedItems || input.receivedItems.length === 0) {
    throw new ValidationError("Goods receipt must contain at least one received item.");
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch PO and verify
    const po = await tx.purchaseOrder.findUnique({
      where: { id: input.purchaseOrderId },
      include: {
        items: true,
        supplier: true,
      },
    });

    if (!po || po.shopId !== input.shopId) {
      throw new NotFoundError("Purchase order not found or does not belong to this shop.");
    }

    if (po.status === "RECEIVED") {
      throw new ValidationError("Purchase order has already been fully received.");
    }
    if (po.status === "CANCELLED") {
      throw new ValidationError("Cannot receive goods for a cancelled purchase order.");
    }

    // 2. Generate GRN number
    const grnCount = await tx.goodsReceipt.count({
      where: { shopId: input.shopId },
    });
    const grnNumber = `GRN-${String(grnCount + 1).padStart(5, "0")}`;

    // 3. Create GoodsReceipt
    const goodsReceipt = await tx.goodsReceipt.create({
      data: {
        shopId: input.shopId,
        purchaseOrderId: po.id,
        grnNumber,
        notes: input.notes,
        receivedBy: input.actorId,
      },
    });

    let totalReceivedValue = 0;

    // 4. Process each received item
    for (const item of input.receivedItems) {
      if (item.quantity <= 0) {
        throw new ValidationError("Received quantity must be greater than zero.");
      }

      // Check matching PO item
      const poItem = po.items.find(
        (it) =>
          it.productId === item.productId &&
          (it.variantId || null) === (item.variantId || null)
      );

      if (!poItem) {
        throw new ValidationError(
          `Received product ${item.productId} was not found on purchase order ${po.poNumber}.`
        );
      }

      const remainingAllowed = poItem.quantity - poItem.receivedQuantity;
      if (item.quantity > remainingAllowed) {
        throw new ValidationError(
          `Received quantity (${item.quantity}) exceeds pending quantity (${remainingAllowed}) for product ${item.productId}.`
        );
      }

      // Create GoodsReceiptItem
      await tx.goodsReceiptItem.create({
        data: {
          goodsReceiptId: goodsReceipt.id,
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: item.quantity,
          unitCost: new Prisma.Decimal(item.unitCost),
        },
      });

      // Update PO item received quantity
      await tx.purchaseOrderItem.update({
        where: { id: poItem.id },
        data: {
          receivedQuantity: {
            increment: item.quantity,
          },
        },
      });

      // Atomically record stock movement and update stock balance
      await recordStockMovement(
        {
          shopId: input.shopId,
          productId: item.productId,
          variantId: item.variantId || null,
          locationId: input.locationId,
          movementType: "PURCHASE_RECEIPT",
          referenceType: "GoodsReceipt",
          referenceId: goodsReceipt.id,
          quantity: item.quantity,
          unitCost: item.unitCost,
          reason: `Goods receipt ${grnNumber} for ${po.poNumber}`,
          actorId: input.actorId,
        },
        tx
      );

      // Register Serial / IMEI numbers if applicable
      if (item.serials && item.serials.length > 0) {
        if (item.serials.length !== item.quantity) {
          throw new ValidationError(
            `Serial/IMEI count (${item.serials.length}) must match received quantity (${item.quantity}).`
          );
        }

        for (const serial of item.serials) {
          await tx.serialNumber.create({
            data: {
              shopId: input.shopId,
              productId: item.productId,
              variantId: item.variantId || null,
              imei1: serial.imei1 || null,
              imei2: serial.imei2 || null,
              serialNumber: serial.serialNumber || null,
              status: "IN_STOCK",
              purchaseOrderId: po.id,
            },
          });
        }
      }

      totalReceivedValue += item.quantity * item.unitCost;
    }

    // 5. Update PO status: check if all items are fully received
    const updatedPoItems = await tx.purchaseOrderItem.findMany({
      where: { purchaseOrderId: po.id },
    });
    const allReceived = updatedPoItems.every(
      (it) => it.receivedQuantity >= it.quantity
    );
    const newPoStatus = allReceived ? "RECEIVED" : "PARTIALLY_RECEIVED";

    await tx.purchaseOrder.update({
      where: { id: po.id },
      data: { status: newPoStatus },
    });

    // 6. Update Supplier payable balance
    await tx.supplier.update({
      where: { id: po.supplierId },
      data: {
        payableBalance: {
          increment: new Prisma.Decimal(totalReceivedValue),
        },
      },
    });

    // 7. Record Audit Trail
    if (input.actorId) {
      await recordAuditLog({
        shopId: input.shopId,
        actorId: input.actorId,
        action: "goods_receipt.create",
        entityType: "GoodsReceipt",
        entityId: goodsReceipt.id,
        reason: `Received goods for ${po.poNumber}. Total value: ৳${totalReceivedValue}`,
        afterState: {
          grnNumber,
          poNumber: po.poNumber,
          newPoStatus,
          totalReceivedValue,
        },
      });
    }

    return {
      goodsReceiptId: goodsReceipt.id,
      grnNumber,
      poStatus: newPoStatus,
      totalReceivedValue,
    };
  });
}
