import React from "react";
import { prisma } from "@/lib/db/prisma";
import { formatBDT } from "@/lib/i18n";
import { Receipt, DollarSign, TrendingUp, AlertCircle, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { SalesListView, SaleSummaryItem } from "@/features/sales/sales-list-view";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const defaultShopId = "11111111-1111-1111-1111-111111111111";

  const [fetchedLocation, rawSales] = await Promise.all([
    prisma.location.findFirst({
      where: { shopId: defaultShopId },
    }),
    prisma.sale.findMany({
      where: { shopId: defaultShopId },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
            serials: {
              include: { serialNumber: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  let location = fetchedLocation;
  if (!location) {
    location = await prisma.location.create({
      data: {
        shopId: defaultShopId,
        name: "Main Showroom",
        isDefault: true,
      },
    });
  }

  // Calculate Aggregates
  let totalRevenue = 0;
  let totalPaid = 0;
  let totalDue = 0;

  const sales: SaleSummaryItem[] = rawSales.map((s) => {
    const rev = Number(s.totalAmount);
    const paid = Number(s.paidAmount);
    const due = Number(s.dueAmount);

    totalRevenue += rev;
    totalPaid += paid;
    totalDue += due;

    return {
      id: s.id,
      invoiceNumber: s.invoiceNumber,
      createdAt: s.createdAt.toISOString(),
      customerName: s.customer ? s.customer.name : "নগদ ক্রেতা (Walk-in)",
      customerPhone: s.customer ? s.customer.phone : null,
      customerId: s.customerId,
      itemCount: s.items.reduce((sum, it) => sum + it.quantity, 0),
      subtotal: Number(s.subtotal),
      discount: Number(s.discount),
      totalAmount: rev,
      paidAmount: paid,
      dueAmount: due,
      paymentStatus: s.paymentStatus,
      items: s.items.map((it) => ({
        id: it.id,
        productName: it.product.name,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        subtotal: Number(it.subtotal),
        serials: it.serials.map((ser) => ser.serialNumber.imei1 || ser.serialNumber.id),
      })),
    };
  });

  return (
    <div className="space-y-6">
      {/* Header and KPI Cards wrapped in print:hidden */}
      <div className="print:hidden space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Receipt className="w-6 h-6 text-primary" />
              <span>বিক্রয় ও ইনভয়েস (Sales & Invoices)</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              দৈনিক বিক্রয়ের হিসাব, ক্যাশ মেমো এবং কাস্টমার বকেয়ার বিবরণ
            </p>
          </div>

          <Link
            href="/app/pos"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-xs hover:bg-primary/90 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>নতুন বিক্রয় (POS টার্মিনাল)</span>
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border bg-card shadow-2xs">
            <div className="text-xs text-muted-foreground">মোট বিক্রয় সংখ্যা</div>
            <div className="text-xl font-bold mt-1 text-foreground">{sales.length}</div>
          </div>

          <div className="p-4 rounded-xl border bg-card shadow-2xs">
            <div className="text-xs text-muted-foreground">মোট রাজস্ব (Total Sales)</div>
            <div className="text-xl font-bold mt-1 text-foreground">{formatBDT(totalRevenue)}</div>
          </div>

          <div className="p-4 rounded-xl border bg-card shadow-2xs">
            <div className="text-xs text-muted-foreground">আদায়কৃত অর্থ (Collected)</div>
            <div className="text-xl font-bold mt-1 text-emerald-600">{formatBDT(totalPaid)}</div>
          </div>

          <div className="p-4 rounded-xl border bg-card shadow-2xs">
            <div className="text-xs text-muted-foreground">গ্রাহক বকেয়া (Receivable)</div>
            <div className="text-xl font-bold mt-1 text-rose-600">{formatBDT(totalDue)}</div>
          </div>
        </div>
      </div>

      {/* Sales List Table */}
      <SalesListView sales={sales} shopId={defaultShopId} locationId={location.id} />
    </div>
  );
}
