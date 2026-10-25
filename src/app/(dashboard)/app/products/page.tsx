import React from "react";
import { prisma } from "@/lib/db/prisma";
import { ProductCatalogView, SerializedProduct, SerializedCategory, SerializedLocation } from "@/features/products/product-catalog-view";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const defaultShopId = "11111111-1111-1111-1111-111111111111";

  // 1. Fetch products with relations
  const rawProducts = await prisma.product.findMany({
    where: { shopId: defaultShopId },
    include: {
      category: true,
      stockBalances: {
        include: { location: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 2. Fetch categories
  const rawCategories = await prisma.category.findMany({
    where: { shopId: defaultShopId },
    orderBy: { name: "asc" },
  });

  // 3. Fetch locations
  let rawLocations = await prisma.location.findMany({
    where: { shopId: defaultShopId },
    orderBy: { isDefault: "desc" },
  });

  if (rawLocations.length === 0) {
    const newLoc = await prisma.location.create({
      data: {
        shopId: defaultShopId,
        name: "প্রধান দোকান (Main Floor)",
        isDefault: true,
      },
    });
    rawLocations = [newLoc];
  }

  // 4. Serialize Decimal types for client component boundary
  const initialProducts: SerializedProduct[] = rawProducts.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    sku: p.sku,
    barcode: p.barcode,
    modelNumber: p.modelNumber,
    isTrackStock: p.isTrackStock,
    costPrice: Number(p.costPrice),
    sellingPrice: Number(p.sellingPrice),
    minStockAlert: p.minStockAlert,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
    category: {
      id: p.category.id,
      name: p.category.name,
      type: p.category.type,
    },
    stockBalances: p.stockBalances.map((b) => ({
      id: b.id,
      quantityOnHand: Number(b.quantityOnHand),
      averageCost: Number(b.averageCost),
      location: {
        id: b.location?.id || b.locationId,
        name: b.location?.name || "প্রধান দোকান",
      },
    })),
  }));

  const initialCategories: SerializedCategory[] = rawCategories.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    parentId: c.parentId,
  }));

  const locations: SerializedLocation[] = rawLocations.map((l) => ({
    id: l.id,
    name: l.name,
    isDefault: l.isDefault,
  }));

  return (
    <ProductCatalogView
      shopId={defaultShopId}
      initialProducts={initialProducts}
      initialCategories={initialCategories}
      locations={locations}
    />
  );
}
