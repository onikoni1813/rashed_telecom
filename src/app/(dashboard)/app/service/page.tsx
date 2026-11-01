import React from "react";
import { prisma } from "@/lib/db/prisma";
import { formatBDT } from "@/lib/i18n";
import { Wrench, CheckCircle2, Clock, AlertCircle, Sparkles, ShieldCheck, DollarSign, Activity } from "lucide-react";
import { RepairBoard, SerializedJob } from "@/features/repairs/repair-board";

export const dynamic = "force-dynamic";

export default async function ServicePage() {
  const defaultShopId = "11111111-1111-1111-1111-111111111111";
  const defaultUserId = "00000000-0000-0000-0000-000000000001";

  // Parallel fetch location, service jobs, customers, technicians, and spare parts
  const [fetchedLocation, rawJobs, dbCustomers, dbTechnicians, rawSpareParts] = await Promise.all([
    prisma.location.findFirst({
      where: { shopId: defaultShopId },
    }),
    prisma.serviceJob.findMany({
      where: { shopId: defaultShopId },
      include: {
        customer: true,
        assignedTechnician: {
          select: { id: true, fullName: true, email: true },
        },
        diagnostics: {
          orderBy: { createdAt: "desc" },
        },
        parts: {
          include: {
            product: {
              select: { name: true, sku: true },
            },
          },
        },
        warranties: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.customer.findMany({
      where: { shopId: defaultShopId },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
      take: 100,
    }),
    prisma.user.findMany({
      where: {
        memberships: {
          some: {
            shopId: defaultShopId,
            role: { name: "TECHNICIAN" },
          },
        },
      },
      select: { id: true, fullName: true, email: true },
    }),
    prisma.product.findMany({
      where: {
        shopId: defaultShopId,
        isActive: true,
        category: { type: "PART" },
      },
      include: {
        stockBalances: true,
      },
      orderBy: { name: "asc" },
      take: 100,
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
  let activeRepairsCount = 0;
  let readyCount = 0;
  let totalServiceRevenue = 0;

  const jobs: SerializedJob[] = rawJobs.map((j) => {
    if (j.status === "DIAGNOSING" || j.status === "IN_REPAIR" || j.status === "ESTIMATE_APPROVED") {
      activeRepairsCount++;
    }
    if (j.status === "READY_FOR_DELIVERY") {
      readyCount++;
    }
    if (j.status === "DELIVERED") {
      totalServiceRevenue += Number(j.paidAmount);
    }

    return {
      id: j.id,
      jobNumber: j.jobNumber,
      deviceBrand: j.deviceBrand,
      deviceModel: j.deviceModel,
      deviceImei: j.deviceImei,
      deviceColor: j.deviceColor,
      intakeCondition: j.intakeCondition,
      accessoriesReceived: j.accessoriesReceived,
      reportedIssue: j.reportedIssue,
      screenLockType: (j as any).screenLockType || "NONE",
      devicePasscode: (j as any).devicePasscode || null,
      status: j.status,
      estimatedCost: Number(j.estimatedCost),
      labourCost: Number(j.labourCost),
      partsCost: Number(j.partsCost),
      totalAmount: Number(j.totalAmount),
      paidAmount: Number(j.paidAmount),
      dueAmount: Number(j.dueAmount),
      paymentStatus: j.paymentStatus,
      promisedDate: j.promisedDate ? j.promisedDate.toISOString() : null,
      deliveryDate: j.deliveryDate ? j.deliveryDate.toISOString() : null,
      createdAt: j.createdAt.toISOString(),
      customer: {
        id: j.customer.id,
        name: j.customer.name,
        phone: j.customer.phone,
      },
      assignedTechnician: j.assignedTechnician,
      diagnostics: j.diagnostics.map((d) => ({
        id: d.id,
        diagnosisFindings: d.diagnosisFindings,
        estimatedLabour: Number(d.estimatedLabour),
        estimatedParts: Number(d.estimatedParts),
        customerApproved: d.customerApproved,
      })),
      parts: j.parts.map((p) => ({
        id: p.id,
        product: p.product,
        quantity: p.quantity,
        sellingPrice: Number(p.sellingPrice),
        subtotal: Number(p.subtotal),
      })),
      warranties: j.warranties.map((w) => ({
        id: w.id,
        warrantyDays: w.warrantyDays,
        warrantyTerms: w.warrantyTerms,
        endDate: w.endDate.toISOString(),
      })),
    };
  });

  const spareParts = rawSpareParts.map((sp) => {
    const locBalance = sp.stockBalances.find((sb) => sb.locationId === location.id) || sp.stockBalances[0];
    return {
      id: sp.id,
      name: sp.name,
      sku: sp.sku,
      sellingPrice: Number(sp.sellingPrice),
      quantityOnHand: locBalance ? Number(locBalance.quantityOnHand) : 0,
    };
  });

  return (
    <div className="space-y-6">
      {/* Elevated Servicing Command Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-r from-card/90 via-card/60 to-card/90 p-6 sm:p-7 backdrop-blur-xl shadow-xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-20 h-56 w-56 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/25 ring-2 ring-white/10 shrink-0">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  মোবাইল সার্ভিসিং ও টেকনিক্যাল ওয়ার্কবেঞ্চ
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400">
                  <Sparkles className="w-3 h-3" />
                  Live Repair Queue
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                ডিভাইস ইনটেক, টেকনিশিয়ান অ্যাসাইন, পার্টস কনজাম্পশন এবং ডেলিভারি ট্র্যাকিং
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Warranty & IMEI Tracked</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 sm:p-5 rounded-2xl border border-border/50 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">মোট সার্ভিস জব</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground">{jobs.length}</div>
          <div className="text-[11px] text-muted-foreground mt-1 font-medium">নিবন্ধিত সর্বমোট রিপেয়ার</div>
        </div>

        <div className="glass-card p-4 sm:p-5 rounded-2xl border border-border/50 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">চলমান মেরামত (Active)</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 font-mono">
            {activeRepairsCount}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 font-medium">টেবিল ও বেঞ্চে চিকিৎসাধীন</div>
        </div>

        <div className="glass-card p-4 sm:p-5 rounded-2xl border border-border/50 hover:border-purple-500/40 hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">ডেলিভারির জন্য প্রস্তুত</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 font-mono">
            {readyCount}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 font-medium">গ্রাহক পিকআপের অপেক্ষায়</div>
        </div>

        <div className="glass-card p-4 sm:p-5 rounded-2xl border border-border/50 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">সার্ভিস রাজস্ব (Collected)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {formatBDT(totalServiceRevenue)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 font-medium">পরিশোধিত মোট সার্ভিস ফি</div>
        </div>
      </div>

      {/* Interactive Repair Board */}
      <RepairBoard
        shopId={defaultShopId}
        locationId={location.id}
        currentUserId={defaultUserId}
        jobs={jobs}
        customers={dbCustomers}
        technicians={dbTechnicians}
        spareParts={spareParts}
      />
    </div>
  );
}
