import React from "react";
import { prisma } from "@/lib/db/prisma";
import {
  StatementsView,
  StatementCustomer,
  StatementSupplier,
} from "@/features/statements/statements-view";

export const dynamic = "force-dynamic";

export default async function StatementsPage() {
  const defaultShopId = "11111111-1111-1111-1111-111111111111";

  const [rawCustomers, rawSuppliers] = await Promise.all([
    prisma.customer.findMany({
      where: { shopId: defaultShopId },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({
      where: { shopId: defaultShopId },
      orderBy: { name: "asc" },
    }),
  ]);

  const customers: StatementCustomer[] = rawCustomers.map((c: any) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    address: c.address,
    totalDue: Number(c.totalDue),
  }));

  const suppliers: StatementSupplier[] = rawSuppliers.map((s: any) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    contactPerson: s.contactPerson,
    totalPayable: Number(s.payableBalance),
  }));

  return (
    <StatementsView
      shopId={defaultShopId}
      customers={customers}
      suppliers={suppliers}
    />
  );
}
