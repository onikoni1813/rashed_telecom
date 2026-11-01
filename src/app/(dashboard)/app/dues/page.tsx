import React, { Suspense } from "react";
import { prisma } from "@/lib/db/prisma";
import { DuesView, SerializedCustomerDue } from "@/features/accounting/dues-view";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export const dynamic = "force-dynamic";

export default function DuesPage() {
  return (
    <Suspense
      fallback={
        <PageSkeleton
          title="বাকি খাতা ও বকেয়া কালেকশন"
          badge="Due Recovery"
          cardsCount={4}
          showFilters={true}
        />
      }
    >
      <DuesDataLoader />
    </Suspense>
  );
}

async function DuesDataLoader() {
  const defaultShopId = "11111111-1111-1111-1111-111111111111";

  // Fetch customers with totalDue > 0
  const rawCustomers = await prisma.customer.findMany({
    where: {
      shopId: defaultShopId,
      totalDue: { gt: 0 },
    },
    orderBy: { totalDue: "desc" },
    take: 100,
  });

  const customersWithDue: SerializedCustomerDue[] = rawCustomers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    address: c.address,
    totalDue: Number(c.totalDue),
  }));

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      <DuesView shopId={defaultShopId} customersWithDue={customersWithDue} />
    </div>
  );
}
