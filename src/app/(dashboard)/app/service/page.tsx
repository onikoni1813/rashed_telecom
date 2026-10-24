import React from "react";
import { prisma } from "@/lib/db/prisma";
import { formatBDT } from "@/lib/i18n";
import { Wrench, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { RepairBoard, SerializedJob } from "@/features/repairs/repair-board";

export const dynamic = "force-dynamic";

export default async function ServicePage() {
  const defaultShopId = "11111111-1111-1111-1111-111111111111";
  const defaultUserId = "00000000-0000-0000-0000-000000000001";

  // Location
  let location = await prisma.location.findFirst({
    where: { shopId: defaultShopId },
  });

  if (!location) {
    location = await prisma.location.create({
      data: {
        shopId: defaultShopId,
        name: "Main Showroom",
        isDefault: true,
      },
    });
  }

  // Fetch Service Jobs
  const rawJobs = await prisma.serviceJob.findMany({
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
  });

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

  // Fetch Customers
  const dbCustomers = await prisma.customer.findMany({
    where: { shopId: defaultShopId },
    select: { id: true, name: true, phone: true },
    orderBy: { name: "asc" },
  });

  // Fetch Technicians
  const dbTechnicians = await prisma.user.findMany({
    where: {
      memberships: {
        some: {
          shopId: defaultShopId,
          role: { name: "TECHNICIAN" },
        },
      },
    },
    select: { id: true, fullName: true, email: true },
  });

  // Fetch Spare Parts from Inventory
  const dbSpareParts = await prisma.product.findMany({
    where: {
      shopId: defaultShopId,
      isActive: true,
      category: { type: "PART" },
    },
    include: {
      stockBalances: {
        where: { locationId: location.id },
      },
    },
    orderBy: { name: "asc" },
  });

  const spareParts = dbSpareParts.map((sp) => ({
    id: sp.id,
    name: sp.name,
    sku: sp.sku,
    sellingPrice: Number(sp.sellingPrice),
    quantityOnHand: sp.stockBalances[0] ? Number(sp.stockBalances[0].quantityOnHand) : 0,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Wrench className="w-6 h-6 text-primary" />
            <span>মোবাইল সার্ভিসিং ও মেরামত (Repair Servicing)</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ডিভাইস গ্রহণ, টেকনিশিয়ান অ্যাসাইন, পার্টস কনজাম্পশন এবং ডেলিভারি হিসাব
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border bg-card shadow-2xs">
          <div className="text-xs text-muted-foreground">মোট সার্ভিস জব</div>
          <div className="text-xl font-bold mt-1 text-foreground">{jobs.length}</div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-2xs">
          <div className="text-xs text-muted-foreground">চলমান মেরামত (In-Repair)</div>
          <div className="text-xl font-bold mt-1 text-blue-600">{activeRepairsCount}</div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-2xs">
          <div className="text-xs text-muted-foreground">ডেলিভারির জন্য প্রস্তুত</div>
          <div className="text-xl font-bold mt-1 text-purple-600">{readyCount}</div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-2xs">
          <div className="text-xs text-muted-foreground">সার্ভিস রাজস্ব (Collected)</div>
          <div className="text-xl font-bold mt-1 text-emerald-600">{formatBDT(totalServiceRevenue)}</div>
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
