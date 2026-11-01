import React from "react";
import { prisma } from "@/lib/db/prisma";
import { PosTerminal } from "@/features/sales/pos-terminal";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const defaultShopId = "11111111-1111-1111-1111-111111111111";
  const defaultCashierId = "00000000-0000-0000-0000-000000000001";

  // Parallel fetch location, products, and customers
  const [fetchedLocation, dbProducts, dbCustomers] = await Promise.all([
    prisma.location.findFirst({
      where: { shopId: defaultShopId },
    }),
    prisma.product.findMany({
      where: {
        shopId: defaultShopId,
        isActive: true,
      },
      include: {
        category: {
          select: { name: true },
        },
        stockBalances: {
          select: {
            quantityOnHand: true,
            locationId: true,
          },
        },
        serialNumbers: {
          where: { status: "IN_STOCK" },
          select: {
            id: true,
            imei1: true,
            imei2: true,
            status: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      where: { shopId: defaultShopId },
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

  // Serialize Decimal types for client component
  const products = dbProducts.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    sku: p.sku,
    barcode: p.barcode,
    sellingPrice: Number(p.sellingPrice),
    category: { name: p.category.name },
    stockBalances: p.stockBalances.map((sb) => ({
      quantityOnHand: Number(sb.quantityOnHand),
      locationId: sb.locationId,
    })),
    serialNumbers: p.serialNumbers.map((s) => ({
      id: s.id,
      imei1: s.imei1,
      imei2: s.imei2,
      status: s.status,
    })),
  }));

  const customers = dbCustomers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    totalDue: Number(c.totalDue),
  }));

  return (
    <div className="space-y-4">
      <PosTerminal
        shopId={defaultShopId}
        locationId={location.id}
        cashierId={defaultCashierId}
        products={products}
        customers={customers}
      />
    </div>
  );
}
