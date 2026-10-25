import React from "react";
import { prisma } from "@/lib/db/prisma";
import {
  PurchasingView,
  SerializedPurchaseOrder,
  SerializedSupplier,
  SerializedProductOption,
  SerializedLocationOption,
} from "@/features/purchases/purchasing-view";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const defaultShopId = "11111111-1111-1111-1111-111111111111";

  // 1. Fetch Purchase Orders
  const rawOrders = await prisma.purchaseOrder.findMany({
    where: { shopId: defaultShopId },
    include: {
      supplier: true,
      items: {
        include: { product: true },
      },
      goodsReceipts: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // 2. Fetch Suppliers
  const rawSuppliers = await prisma.supplier.findMany({
    where: { shopId: defaultShopId },
    orderBy: { name: "asc" },
  });

  // 3. Fetch Active Products for PO item builder
  const rawProducts = await prisma.product.findMany({
    where: { shopId: defaultShopId, isActive: true },
    select: {
      id: true,
      name: true,
      sku: true,
      costPrice: true,
    },
    orderBy: { name: "asc" },
  });

  // 4. Fetch Locations
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

  // 5. Serialize for client boundary
  const initialOrders: SerializedPurchaseOrder[] = rawOrders.map((po) => ({
    id: po.id,
    poNumber: po.poNumber,
    status: po.status,
    totalAmount: Number(po.totalAmount),
    orderedAt: po.orderedAt.toISOString(),
    expectedAt: po.expectedAt ? po.expectedAt.toISOString() : null,
    notes: po.notes,
    supplier: {
      id: po.supplier.id,
      name: po.supplier.name,
      phone: po.supplier.phone,
    },
    items: po.items.map((it) => ({
      id: it.id,
      quantity: it.quantity,
      receivedQuantity: it.receivedQuantity,
      unitCost: Number(it.unitCost),
      product: {
        id: it.product.id,
        name: it.product.name,
        sku: it.product.sku,
      },
    })),
  }));

  const initialSuppliers: SerializedSupplier[] = rawSuppliers.map((s) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    contactPerson: s.contactPerson,
    payableBalance: Number(s.payableBalance),
  }));

  const products: SerializedProductOption[] = rawProducts.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    costPrice: Number(p.costPrice),
  }));

  const locations: SerializedLocationOption[] = rawLocations.map((l) => ({
    id: l.id,
    name: l.name,
    isDefault: l.isDefault,
  }));

  return (
    <PurchasingView
      shopId={defaultShopId}
      initialOrders={initialOrders}
      initialSuppliers={initialSuppliers}
      products={products}
      locations={locations}
    />
  );
}
