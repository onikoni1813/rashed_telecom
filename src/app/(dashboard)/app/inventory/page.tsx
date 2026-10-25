import React from "react";
import { prisma } from "@/lib/db/prisma";
import {
  InventoryView,
  SerializedBalance,
  SerializedMovement,
  SerializedShopLocation,
} from "@/features/inventory/inventory-view";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const defaultShopId = "11111111-1111-1111-1111-111111111111";

  // 1. Fetch stock balances with products and location
  const rawBalances = await prisma.stockBalance.findMany({
    where: { shopId: defaultShopId },
    include: {
      product: {
        include: { category: true },
      },
      location: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  // 2. Fetch historical movements
  const rawMovements = await prisma.stockMovement.findMany({
    where: { shopId: defaultShopId },
    include: {
      product: true,
      location: true,
      actor: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // 3. Fetch locations
  let rawLocations = await prisma.location.findMany({
    where: { shopId: defaultShopId },
    orderBy: { isDefault: "desc" },
  });

  if (rawLocations.length === 0) {
    const defaultLoc = await prisma.location.create({
      data: {
        shopId: defaultShopId,
        name: "প্রধান দোকান (Main Floor)",
        isDefault: true,
      },
    });
    rawLocations = [defaultLoc];
  }

  // 4. Serialize for client boundary
  const initialBalances: SerializedBalance[] = rawBalances.map((b) => ({
    id: b.id,
    quantityOnHand: Number(b.quantityOnHand),
    averageCost: Number(b.averageCost),
    updatedAt: b.updatedAt.toISOString(),
    location: {
      id: b.location.id,
      name: b.location.name,
    },
    product: {
      id: b.product.id,
      name: b.product.name,
      sku: b.product.sku,
      costPrice: Number(b.product.costPrice),
      sellingPrice: Number(b.product.sellingPrice),
      category: b.product.category ? { name: b.product.category.name } : null,
    },
  }));

  const initialMovements: SerializedMovement[] = rawMovements.map((m) => ({
    id: m.id,
    createdAt: m.createdAt.toISOString(),
    movementType: m.movementType,
    quantity: Number(m.quantity),
    unitCost: Number(m.unitCost),
    balanceAfter: Number(m.balanceAfter),
    reason: m.reason,
    referenceType: m.referenceType,
    product: {
      id: m.product.id,
      name: m.product.name,
      sku: m.product.sku,
    },
    location: m.location ? { name: m.location.name } : null,
  }));

  const locations: SerializedShopLocation[] = rawLocations.map((l) => ({
    id: l.id,
    name: l.name,
    isDefault: l.isDefault,
  }));

  return (
    <InventoryView
      shopId={defaultShopId}
      initialBalances={initialBalances}
      initialMovements={initialMovements}
      locations={locations}
    />
  );
}
