import React from "react";
import { prisma } from "@/lib/db/prisma";
import { SuppliersView, SerializedSupplier } from "@/features/suppliers/suppliers-view";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const defaultShopId = "11111111-1111-1111-1111-111111111111";

  const rawSuppliers = await prisma.supplier.findMany({
    where: { shopId: defaultShopId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const suppliers: SerializedSupplier[] = rawSuppliers.map((s: any) => ({
    id: s.id,
    name: s.name,
    contactPerson: s.contactPerson,
    phone: s.phone,
    email: s.email,
    address: s.address,
    payableBalance: Number(s.payableBalance),
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      <SuppliersView shopId={defaultShopId} initialSuppliers={suppliers} />
    </div>
  );
}
