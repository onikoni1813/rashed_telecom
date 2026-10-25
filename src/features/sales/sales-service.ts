import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { recordStockMovement } from "@/features/inventory/stock-service";
import { postJournalEntry } from "./accounting-posting";
import { recordAuditLog } from "@/lib/audit/service";

export interface SaleItemInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
  requestedPrice?: number;
  serialNumberIds?: string[];
}

export interface PaymentSplitInput {
  method: "CASH" | "BANK" | "BKASH" | "NAGAD" | "ROCKET";
  amount: number;
  referenceNumber?: string;
}

export interface CreateSaleInput {
  shopId: string;
  customerId?: string | null;
  cashierId: string;
  locationId: string;
  items: SaleItemInput[];
  discount?: number;
  payments?: PaymentSplitInput[];
  notes?: string | null;
}

export async function createSale(input: CreateSaleInput) {
  if (!input.items || input.items.length === 0) {
    throw new ValidationError("Cannot create a sale without items.");
  }

  return await prisma.$transaction(async (tx: any) => {
    // 1. Check or fetch active open CashSession for cashier
    const cashSession = await tx.cashSession.findFirst({
      where: {
        shopId: input.shopId,
        status: "OPEN",
      },
      orderBy: { openingTime: "desc" },
    });

    // 2. Fetch customer if provided
    let customer: any = null;
    if (input.customerId) {
      customer = await tx.customer.findUnique({
        where: { id: input.customerId },
      });
      if (!customer || customer.shopId !== input.shopId) {
        throw new NotFoundError("Customer not found or does not belong to this shop.");
      }
    }

    // 3. Resolve Authoritative Product Pricing & Inventory
    const productIds = input.items.map((it) => it.productId);
    const products: any[] = await tx.product.findMany({
      where: {
        shopId: input.shopId,
        id: { in: productIds },
        isActive: true,
      },
    });

    const productMap = new Map<string, any>(products.map((p: any) => [p.id, p]));

    let calculatedSubtotal = 0;
    let totalCostOfGoodsSold = 0;

    const validatedItems: Array<{
      product: any;
      variantId?: string | null;
      quantity: number;
      unitPrice: number;
      unitCost: number;
      subtotal: number;
      serialNumberIds?: string[];
    }> = [];

    for (const itemInput of input.items) {
      const product = productMap.get(itemInput.productId);
      if (!product) {
        throw new NotFoundError(`Product '${itemInput.productId}' not found or inactive.`);
      }

      if (itemInput.quantity <= 0) {
        throw new ValidationError("Item quantity must be greater than zero.");
      }

      // Authoritative selling price & cost price
      const unitPrice = itemInput.requestedPrice !== undefined
        ? itemInput.requestedPrice
        : Number(product.sellingPrice);
      const unitCost = Number(product.costPrice);
      const itemSubtotal = itemInput.quantity * unitPrice;

      calculatedSubtotal += itemSubtotal;
      totalCostOfGoodsSold += itemInput.quantity * unitCost;

      // Verify Serial / IMEI numbers if applicable
      if (itemInput.serialNumberIds && itemInput.serialNumberIds.length > 0) {
        if (itemInput.serialNumberIds.length !== itemInput.quantity) {
          throw new ValidationError(
            `Serial/IMEI count (${itemInput.serialNumberIds.length}) must match item quantity (${itemInput.quantity}).`
          );
        }

        const serials = await tx.serialNumber.findMany({
          where: {
            id: { in: itemInput.serialNumberIds },
            shopId: input.shopId,
            productId: product.id,
            status: "IN_STOCK",
          },
        });

        if (serials.length !== itemInput.serialNumberIds.length) {
          throw new ValidationError(
            `One or more selected serial/IMEI numbers are not available or already sold.`
          );
        }
      }

      validatedItems.push({
        product,
        variantId: itemInput.variantId,
        quantity: itemInput.quantity,
        unitPrice,
        unitCost,
        subtotal: itemSubtotal,
        serialNumberIds: itemInput.serialNumberIds,
      });
    }

    // 4. Calculate Authoritative Totals
    const discountAmount = Math.max(0, Number(input.discount || 0));
    if (discountAmount > calculatedSubtotal) {
      throw new ValidationError("Discount cannot exceed the total invoice subtotal.");
    }

    const calculatedTotal = calculatedSubtotal - discountAmount;

    // 5. Calculate Paid Amount & Due Amount
    let totalCashPaid = 0;
    let totalDigitalPaid = 0;

    if (input.payments && input.payments.length > 0) {
      for (const p of input.payments) {
        if (p.amount < 0) {
          throw new ValidationError("Payment amount cannot be negative.");
        }
        if (p.method === "CASH") {
          totalCashPaid += p.amount;
        } else {
          totalDigitalPaid += p.amount;
        }
      }
    }

    const totalPaidAmount = totalCashPaid + totalDigitalPaid;
    if (totalPaidAmount > calculatedTotal) {
      throw new ValidationError(
        `পরিশোধের পরিমাণ (৳${totalPaidAmount}) মোট বিলের (৳${calculatedTotal}) চেয়ে বেশি হতে পারে না। অতিরিক্ত ক্যাশ প্রাপ্তি থাকলে কাস্টমার ক্যাশ দিল (Tendered) হিসেবে হিসাব করুন।`
      );
    }
    const dueAmount = Math.max(0, calculatedTotal - totalPaidAmount);

    if (dueAmount > 0 && !customer) {
      throw new ValidationError(
        "Credit sale with due amount requires a registered customer. Walk-in sales must be paid in full."
      );
    }

    const paymentStatus: "PAID" | "PARTIALLY_PAID" | "DUE" =
      dueAmount === 0
        ? "PAID"
        : totalPaidAmount > 0
        ? "PARTIALLY_PAID"
        : "DUE";

    // 6. Generate Invoice Number
    const count = await tx.sale.count({ where: { shopId: input.shopId } });
    const invoiceNumber = `INV-${String(count + 1).padStart(6, "0")}`;

    // 7. Create Sale Record
    const sale = await tx.sale.create({
      data: {
        shopId: input.shopId,
        customerId: customer?.id || null,
        cashierId: input.cashierId,
        cashSessionId: cashSession?.id || null,
        invoiceNumber,
        subtotal: calculatedSubtotal,
        discount: discountAmount,
        totalAmount: calculatedTotal,
        paidAmount: totalPaidAmount,
        dueAmount: dueAmount,
        paymentStatus,
        notes: input.notes,
        items: {
          create: validatedItems.map((vi) => ({
            productId: vi.product.id,
            variantId: vi.variantId || null,
            quantity: vi.quantity,
            unitPrice: vi.unitPrice,
            unitCost: vi.unitCost,
            subtotal: vi.subtotal,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // 8. Process Serial Numbers and Stock Deductions
    for (let i = 0; i < validatedItems.length; i++) {
      const vi = validatedItems[i];
      const createdItem = sale.items[i];

      // Mark serials as SOLD and link to sale item
      if (vi.serialNumberIds && vi.serialNumberIds.length > 0) {
        for (const serialId of vi.serialNumberIds) {
          await tx.serialNumber.update({
            where: { id: serialId },
            data: { status: "SOLD" },
          });

          await tx.saleItemSerial.create({
            data: {
              saleItemId: createdItem.id,
              serialNumberId: serialId,
            },
          });
        }
      }

      // Deduct stock via authoritative StockMovement
      await recordStockMovement(
        {
          shopId: input.shopId,
          productId: vi.product.id,
          variantId: vi.variantId || null,
          locationId: input.locationId,
          movementType: "SALE",
          referenceType: "Sale",
          referenceId: sale.id,
          quantity: -vi.quantity, // Negative for sale deduction
          unitCost: vi.unitCost,
          reason: `Sale ${invoiceNumber}`,
          actorId: input.cashierId,
        },
        tx
      );
    }

    // 9. Process Payments and Allocations
    if (input.payments && input.payments.length > 0) {
      for (const p of input.payments) {
        if (p.amount > 0) {
          const payCount = await tx.payment.count({ where: { shopId: input.shopId } });
          const paymentNumber = `PAY-${String(payCount + 1).padStart(6, "0")}`;

          const payment = await tx.payment.create({
            data: {
              shopId: input.shopId,
              paymentNumber,
              customerId: customer?.id || null,
              amount: p.amount,
              paymentMethod: p.method,
              referenceNumber: p.referenceNumber,
              receivedBy: input.cashierId,
              allocations: {
                create: {
                  saleId: sale.id,
                  amount: p.amount,
                },
              },
            },
          });
        }
      }
    }

    // 10. Update Customer Due Balance
    if (dueAmount > 0 && customer) {
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          totalDue: {
            increment: dueAmount,
          },
        },
      });
    }

    // 11. Balanced Double-Entry Journal Posting
    // Rule:
    // Debit Cash (1000) for cash payments
    // Debit Bank/MFS (1010) for digital payments
    // Debit Accounts Receivable (1100) for customer due amount
    // Credit Product Sales (4000) for total net revenue (subtotal - discount)
    // AND
    // Debit COGS (5000) for totalCostOfGoodsSold
    // Credit Inventory (1200) for totalCostOfGoodsSold
    const journalLines: Array<{ accountCode: string; debit?: number; credit?: number; description?: string }> = [];

    if (totalCashPaid > 0) {
      journalLines.push({
        accountCode: "1000", // Cash on Hand
        debit: totalCashPaid,
        description: `Cash received for ${invoiceNumber}`,
      });
    }

    if (totalDigitalPaid > 0) {
      journalLines.push({
        accountCode: "1010", // Bank / MFS
        debit: totalDigitalPaid,
        description: `MFS/Bank received for ${invoiceNumber}`,
      });
    }

    if (dueAmount > 0) {
      journalLines.push({
        accountCode: "1100", // Accounts Receivable
        debit: dueAmount,
        description: `Customer receivable for ${invoiceNumber}`,
      });
    }

    // Credit revenue
    journalLines.push({
      accountCode: "4000", // Product Sales
      credit: calculatedTotal,
      description: `Sales revenue for ${invoiceNumber}`,
    });

    // Cost of goods sold entries (if inventory has cost)
    if (totalCostOfGoodsSold > 0) {
      journalLines.push({
        accountCode: "5000", // COGS
        debit: totalCostOfGoodsSold,
        description: `Cost of goods sold for ${invoiceNumber}`,
      });
      journalLines.push({
        accountCode: "1200", // Inventory
        credit: totalCostOfGoodsSold,
        description: `Inventory reduction for ${invoiceNumber}`,
      });
    }

    await postJournalEntry(
      {
        shopId: input.shopId,
        sourceType: "SALE",
        sourceId: sale.id,
        description: `POS Sale ${invoiceNumber}`,
        lines: journalLines,
      },
      tx
    );

    // 12. Audit Trail
    await recordAuditLog({
      shopId: input.shopId,
      actorId: input.cashierId,
      action: "sale.create",
      entityType: "Sale",
      entityId: sale.id,
      reason: `POS sale checkout ${invoiceNumber}`,
      afterState: {
        invoiceNumber,
        totalAmount: calculatedTotal,
        paidAmount: totalPaidAmount,
        dueAmount,
        itemCount: validatedItems.length,
      },
    });

    return {
      saleId: sale.id,
      invoiceNumber,
      subtotal: calculatedSubtotal,
      discount: discountAmount,
      totalAmount: calculatedTotal,
      paidAmount: totalPaidAmount,
      dueAmount,
      paymentStatus,
      itemCount: validatedItems.length,
    };
  });
}

export interface ProcessReturnItemInput {
  saleItemId: string;
  quantity: number;
  condition?: "GOOD" | "DEFECTIVE";
  serialNumberIds?: string[];
  reason?: string;
}

export interface ProcessReturnInput {
  shopId: string;
  saleId: string;
  returnedBy: string;
  locationId: string;
  refundMethod: "CASH" | "BANK" | "ADJUST_DUE";
  items: ProcessReturnItemInput[];
  returnReason?: string;
}

export async function processSaleReturn(input: ProcessReturnInput) {
  if (!input.items || input.items.length === 0) {
    throw new ValidationError("Cannot process return without items.");
  }

  return await prisma.$transaction(async (tx: any) => {
    // 1. Fetch sale
    const sale: any = await tx.sale.findUnique({
      where: { id: input.saleId },
      include: {
        items: {
          include: {
            serials: true,
            returnItems: true,
          },
        },
        customer: true,
      },
    });

    if (!sale || sale.shopId !== input.shopId) {
      throw new NotFoundError("Sale not found or does not belong to this shop.");
    }

    const saleItemMap = new Map<string, any>((sale.items || []).map((it: any) => [it.id, it]));

    let totalRefundAmount = 0;
    let totalCostOfReturnedGoods = 0;

    const validatedReturnItems: Array<{
      saleItem: any;
      quantity: number;
      condition: "GOOD" | "DEFECTIVE";
      unitPrice: number;
      unitCost: number;
      itemRefund: number;
      serialNumberIds?: string[];
    }> = [];

    for (const retInput of input.items) {
      const saleItem = saleItemMap.get(retInput.saleItemId);
      if (!saleItem) {
        throw new NotFoundError(`Sale item '${retInput.saleItemId}' not found in invoice ${sale.invoiceNumber}.`);
      }

      if (retInput.quantity <= 0) {
        throw new ValidationError("Return quantity must be greater than zero.");
      }

      // Check previously returned quantity
      const previouslyReturned = (saleItem.returnItems || []).reduce((sum: number, ri: any) => sum + ri.quantity, 0);
      const remainingReturnable = saleItem.quantity - previouslyReturned;

      if (retInput.quantity > remainingReturnable) {
        throw new ValidationError(
          `Cannot return ${retInput.quantity} units of product; only ${remainingReturnable} remaining returnable.`
        );
      }

      const unitPrice = Number(saleItem.unitPrice);
      const unitCost = Number(saleItem.unitCost);
      const itemRefund = retInput.quantity * unitPrice;

      totalRefundAmount += itemRefund;
      totalCostOfReturnedGoods += retInput.quantity * unitCost;

      // Validate serials if passed
      if (retInput.serialNumberIds && retInput.serialNumberIds.length > 0) {
        if (retInput.serialNumberIds.length !== retInput.quantity) {
          throw new ValidationError(
            `Serial/IMEI count (${retInput.serialNumberIds.length}) must match return quantity (${retInput.quantity}).`
          );
        }

        const validSerialIds = new Set((saleItem.serials || []).map((s: any) => s.serialNumberId));
        for (const sid of retInput.serialNumberIds) {
          if (!validSerialIds.has(sid)) {
            throw new ValidationError(
              `Serial ID '${sid}' was not part of original sale item.`
            );
          }
        }
      }

      validatedReturnItems.push({
        saleItem,
        quantity: retInput.quantity,
        condition: retInput.condition || "GOOD",
        unitPrice,
        unitCost,
        itemRefund,
        serialNumberIds: retInput.serialNumberIds,
      });
    }

    // Generate Return Number
    const returnCount = await tx.salesReturn.count({ where: { shopId: input.shopId } });
    const returnNumber = `RET-${String(returnCount + 1).padStart(6, "0")}`;

    // Create SalesReturn record
    const salesReturn = await tx.salesReturn.create({
      data: {
        shopId: input.shopId,
        saleId: sale.id,
        customerId: sale.customerId,
        returnNumber,
        refundAmount: totalRefundAmount,
        returnReason: input.returnReason || null,
        createdBy: input.returnedBy,
        items: {
          create: validatedReturnItems.map((vi) => ({
            saleItemId: vi.saleItem.id,
            productId: vi.saleItem.productId,
            variantId: vi.saleItem.variantId,
            quantity: vi.quantity,
            refundUnitPrice: vi.unitPrice,
            condition: vi.condition,
          })),
        },
      },
    });

    // Revert stock and serial status
    for (const vi of validatedReturnItems) {
      if (vi.serialNumberIds && vi.serialNumberIds.length > 0) {
        for (const sid of vi.serialNumberIds) {
          await tx.serialNumber.update({
            where: { id: sid },
            data: { status: vi.condition === "DEFECTIVE" ? "DEFECTIVE" : "IN_STOCK" },
          });
        }
      }

      await recordStockMovement(
        {
          shopId: input.shopId,
          productId: vi.saleItem.productId,
          variantId: vi.saleItem.variantId || null,
          locationId: input.locationId,
          movementType: "SALES_RETURN",
          referenceType: "SalesReturn",
          referenceId: salesReturn.id,
          quantity: vi.quantity, // Positive incoming stock
          unitCost: vi.unitCost,
          reason: `Customer return ${returnNumber} for ${sale.invoiceNumber}`,
          actorId: input.returnedBy,
        },
        tx
      );
    }

    // Handle refund or due adjustment
    let adjustedDue = 0;
    if (input.refundMethod === "ADJUST_DUE") {
      if (sale.customer && Number(sale.dueAmount) > 0) {
        adjustedDue = Math.min(totalRefundAmount, Number(sale.dueAmount));
        await tx.sale.update({
          where: { id: sale.id },
          data: {
            dueAmount: {
              decrement: adjustedDue,
            },
            paymentStatus: Number(sale.dueAmount) - adjustedDue === 0 ? "PAID" : "PARTIALLY_PAID",
          },
        });

        await tx.customer.update({
          where: { id: sale.customer.id },
          data: {
            totalDue: {
              decrement: adjustedDue,
            },
          },
        });
      }
    }

    // Journal Entry Posting
    // Debit 4000 (Product Sales) for totalRefundAmount
    // Credit 1000/1010/1100 depending on refundMethod
    const journalLines: Array<{ accountCode: string; debit?: number; credit?: number; description?: string }> = [];

    journalLines.push({
      accountCode: "4000",
      debit: totalRefundAmount,
      description: `Sales return refund for ${sale.invoiceNumber} (${returnNumber})`,
    });

    if (input.refundMethod === "CASH") {
      journalLines.push({
        accountCode: "1000",
        credit: totalRefundAmount,
        description: `Cash refunded for return ${returnNumber}`,
      });
    } else if (input.refundMethod === "BANK") {
      journalLines.push({
        accountCode: "1010",
        credit: totalRefundAmount,
        description: `Bank/MFS refunded for return ${returnNumber}`,
      });
    } else {
      // ADJUST_DUE
      journalLines.push({
        accountCode: "1100",
        credit: totalRefundAmount,
        description: `Receivable reduction for return ${returnNumber}`,
      });
    }

    // COGS reversal
    if (totalCostOfReturnedGoods > 0) {
      journalLines.push({
        accountCode: "1200", // Inventory back
        debit: totalCostOfReturnedGoods,
        description: `Inventory reinstated for return ${returnNumber}`,
      });
      journalLines.push({
        accountCode: "5000", // COGS reversal
        credit: totalCostOfReturnedGoods,
        description: `COGS reversed for return ${returnNumber}`,
      });
    }

    await postJournalEntry(
      {
        shopId: input.shopId,
        sourceType: "SALES_RETURN",
        sourceId: salesReturn.id,
        description: `Sales Return ${returnNumber}`,
        lines: journalLines,
      },
      tx
    );

    // Audit Log
    await recordAuditLog({
      shopId: input.shopId,
      actorId: input.returnedBy,
      action: "sale.return",
      entityType: "SalesReturn",
      entityId: salesReturn.id,
      reason: input.returnReason || `Sales return ${returnNumber}`,
      afterState: {
        returnNumber,
        refundAmount: totalRefundAmount,
        refundMethod: input.refundMethod,
        adjustedDue,
      },
    });

    return {
      returnId: salesReturn.id,
      returnNumber,
      refundAmount: totalRefundAmount,
      refundMethod: input.refundMethod,
      adjustedDue,
    };
  });
}

