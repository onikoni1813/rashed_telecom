import React, { Suspense } from "react";
import { prisma } from "@/lib/db/prisma";
import {
  StatementsView,
  StatementCustomer,
  StatementSupplier,
} from "@/features/statements/statements-view";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export const dynamic = "force-dynamic";

async function StatementsDataLoader() {
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

export default function StatementsPage() {
  return (
    <Suspense
      fallback={
        <PageSkeleton
          title="গ্রাহক ও সাপ্লায়ার স্টেটমেন্ট"
          subtitle="লেনদেন বিবরণী ও লেজার তালিকা লোড হচ্ছে..."
          cardsCount={2}
          showFilter={true}
          rowsCount={6}
        />
      }
    >
      <StatementsDataLoader />
    </Suspense>
  );
}
