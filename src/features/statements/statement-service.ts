import { prisma } from "@/lib/db/prisma";
import { NotFoundError } from "@/lib/errors";

export interface StatementLine {
  id: string;
  date: string;
  type: "INVOICE" | "PAYMENT" | "RETURN" | "GOODS_RECEIPT";
  referenceNumber: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export async function getCustomerStatement(
  shopId: string,
  customerId: string,
  startDate?: Date,
  endDate?: Date
) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer || customer.shopId !== shopId) {
    throw new NotFoundError("Customer not found.");
  }

  // 1. Fetch Sales (Invoices)
  const sales = await prisma.sale.findMany({
    where: {
      shopId,
      customerId,
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  // 2. Fetch Payments
  const payments = await prisma.payment.findMany({
    where: {
      shopId,
      customerId,
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  // 3. Fetch Returns
  const returns = await prisma.salesReturn.findMany({
    where: {
      shopId,
      sale: { customerId },
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    },
    include: { sale: true },
    orderBy: { createdAt: "asc" },
  });

  // Combine and sort chronologically
  const rawEvents: Array<{
    date: Date;
    type: "INVOICE" | "PAYMENT" | "RETURN";
    ref: string;
    description: string;
    debit: number;
    credit: number;
  }> = [];

  for (const s of sales) {
    rawEvents.push({
      date: s.createdAt,
      type: "INVOICE",
      ref: s.invoiceNumber,
      description: `Sale Invoice (${s.paymentStatus})`,
      debit: Number(s.totalAmount),
      credit: 0,
    });
  }

  for (const p of payments) {
    rawEvents.push({
      date: p.createdAt,
      type: "PAYMENT",
      ref: p.paymentNumber,
      description: `Payment received via ${p.paymentMethod} ${p.referenceNumber ? `[${p.referenceNumber}]` : ""}`,
      debit: 0,
      credit: Number(p.amount),
    });
  }

  for (const r of returns) {
    rawEvents.push({
      date: r.createdAt,
      type: "RETURN",
      ref: r.returnNumber,
      description: `Sales Return for ${r.sale.invoiceNumber} (${r.returnReason || "Return"})`,
      debit: 0,
      credit: Number(r.refundAmount),
    });
  }

  rawEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

  let running = 0;
  let totalBilled = 0;
  let totalPaid = 0;

  const lines: StatementLine[] = rawEvents.map((evt, idx) => {
    running += evt.debit - evt.credit;
    totalBilled += evt.debit;
    totalPaid += evt.credit;

    return {
      id: `stmt-${idx + 1}`,
      date: evt.date.toISOString(),
      type: evt.type,
      referenceNumber: evt.ref,
      description: evt.description,
      debit: evt.debit,
      credit: evt.credit,
      runningBalance: running,
    };
  });

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      currentTotalDue: Number(customer.totalDue),
    },
    totalBilled,
    totalPaid,
    closingBalance: running,
    lines,
    startDate: startDate ? startDate.toISOString() : null,
    endDate: endDate ? endDate.toISOString() : new Date().toISOString(),
  };
}

export async function getSupplierStatement(
  shopId: string,
  supplierId: string,
  startDate?: Date,
  endDate?: Date
) {
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
  });

  if (!supplier || supplier.shopId !== shopId) {
    throw new NotFoundError("Supplier not found.");
  }

  // 1. Fetch Goods Receipts
  const receipts = await prisma.goodsReceipt.findMany({
    where: {
      shopId,
      purchaseOrder: { supplierId },
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    },
    include: { purchaseOrder: true },
    orderBy: { createdAt: "asc" },
  });

  // 2. Fetch Journal Lines on Supplier Account 2000
  const supplierAccount = await prisma.account.findUnique({
    where: { shopId_code: { shopId, code: "2000" } },
  });

  let rawEvents: Array<{
    date: Date;
    type: "GOODS_RECEIPT" | "PAYMENT" | "RETURN";
    ref: string;
    description: string;
    debit: number;
    credit: number;
  }> = [];

  for (const gr of receipts) {
    rawEvents.push({
      date: gr.createdAt,
      type: "GOODS_RECEIPT",
      ref: gr.grnNumber,
      description: `Goods Received on PO ${gr.purchaseOrder.poNumber}`,
      credit: Number(gr.purchaseOrder.totalAmount),
      debit: 0,
    });
  }

  rawEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

  let running = 0;
  const lines: StatementLine[] = rawEvents.map((evt, idx) => {
    running += evt.credit - evt.debit;
    return {
      id: `sup-stmt-${idx + 1}`,
      date: evt.date.toISOString(),
      type: evt.type,
      referenceNumber: evt.ref,
      description: evt.description,
      debit: evt.debit,
      credit: evt.credit,
      runningBalance: running,
    };
  });

  return {
    supplier: {
      id: supplier.id,
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      payableBalance: Number(supplier.payableBalance),
    },
    closingPayable: running,
    lines,
    startDate: startDate ? startDate.toISOString() : null,
    endDate: endDate ? endDate.toISOString() : new Date().toISOString(),
  };
}
