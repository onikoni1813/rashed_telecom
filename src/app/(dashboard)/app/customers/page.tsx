import React from "react";
import { prisma } from "@/lib/db/prisma";
import { CustomersView, SerializedCustomer } from "@/features/customers/customers-view";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const defaultShopId = "11111111-1111-1111-1111-111111111111";

  const rawCustomers = await prisma.customer.findMany({
    where: { shopId: defaultShopId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const customers: SerializedCustomer[] = rawCustomers.map((c: any) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    address: c.address,
    totalDue: Number(c.totalDue),
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      <CustomersView shopId={defaultShopId} initialCustomers={customers} />
    </div>
  );
}
