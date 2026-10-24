import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ValidationError } from "@/lib/errors";
import { recordAuditLog } from "@/lib/audit/service";

// ==============================================================================
// 1. AUDIT LOG SEARCH & INSPECTION
// ==============================================================================

export interface SearchAuditLogsInput {
  shopId: string;
  entityType?: string;
  action?: string;
  actorId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export async function searchAuditLogs(input: SearchAuditLogsInput) {
  const limit = input.limit || 50;
  const offset = input.offset || 0;

  const where: Prisma.AuditLogWhereInput = {
    shopId: input.shopId,
    ...(input.entityType ? { entityType: input.entityType } : {}),
    ...(input.action ? { action: input.action } : {}),
    ...(input.actorId ? { actorId: input.actorId } : {}),
    ...(input.startDate || input.endDate
      ? {
          createdAt: {
            ...(input.startDate ? { gte: input.startDate } : {}),
            ...(input.endDate ? { lte: input.endDate } : {}),
          },
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, limit, offset };
}

// ==============================================================================
// 2. DATA IMPORT & EXPORT
// ==============================================================================

export async function exportProducts(shopId: string) {
  const products = await prisma.product.findMany({
    where: { shopId, isActive: true },
    include: {
      category: { select: { name: true } },
      stockBalances: { select: { quantityOnHand: true } },
    },
    orderBy: { name: "asc" },
  });

  return products.map((p: any) => {
    const totalQty = p.stockBalances.reduce((sum: number, sb: any) => sum + Number(sb.quantityOnHand), 0);
    return {
      id: p.id,
      sku: p.sku,
      barcode: p.barcode || "",
      name: p.name,
      category: p.category.name,
      brand: p.brand || "",
      costPrice: Number(p.costPrice),
      sellingPrice: Number(p.sellingPrice),
      quantityOnHand: totalQty,
      minStockAlert: p.minStockAlert,
    };
  });
}

export interface ImportProductRow {
  name: string;
  sku: string;
  categoryName: string;
  costPrice: number;
  sellingPrice: number;
  brand?: string;
  barcode?: string;
  minStockAlert?: number;
}

export async function importProducts(
  shopId: string,
  rows: ImportProductRow[],
  actorId: string
) {
  if (!rows || rows.length === 0) {
    throw new ValidationError("No products provided for import.");
  }

  let importedCount = 0;
  let updatedCount = 0;

  await prisma.$transaction(async (tx: any) => {
    // Cache categories for the shop
    const categories = await tx.category.findMany({ where: { shopId } });
    const categoryMap = new Map<string, string>();
    for (const cat of categories) {
      categoryMap.set(cat.name.toLowerCase().trim(), cat.id);
    }

    for (const row of rows) {
      if (!row.name || !row.sku || row.sellingPrice === undefined) {
        throw new ValidationError(
          `Invalid product row: SKU and Name are required for every row.`
        );
      }

      // Find or create category
      const catKey = (row.categoryName || "General").toLowerCase().trim();
      let categoryId = categoryMap.get(catKey);

      if (!categoryId) {
        const newCat = await tx.category.create({
          data: {
            shopId,
            name: row.categoryName || "General",
          },
        });
        categoryId = newCat.id;
        categoryMap.set(catKey, newCat.id);
      }

      const existing = await tx.product.findUnique({
        where: { shopId_sku: { shopId, sku: row.sku } },
      });

      if (existing) {
        await tx.product.update({
          where: { id: existing.id },
          data: {
            name: row.name,
            costPrice: row.costPrice || 0,
            sellingPrice: row.sellingPrice,
            brand: row.brand || existing.brand,
            barcode: row.barcode || existing.barcode,
          },
        });
        updatedCount++;
      } else {
        await tx.product.create({
          data: {
            shopId,
            categoryId,
            sku: row.sku,
            name: row.name,
            costPrice: row.costPrice || 0,
            sellingPrice: row.sellingPrice,
            brand: row.brand || null,
            barcode: row.barcode || null,
            minStockAlert: row.minStockAlert || 5,
            isTrackStock: true,
            isActive: true,
          },
        });
        importedCount++;
      }
    }

    await recordAuditLog({
      shopId,
      actorId,
      action: "products.import",
      entityType: "Product",
      entityId: shopId,
      reason: `Bulk imported ${importedCount} new products, updated ${updatedCount} products`,
      afterState: { importedCount, updatedCount },
    });
  });

  return { importedCount, updatedCount, totalProcessed: rows.length };
}

export async function exportCustomers(shopId: string) {
  const customers = await prisma.customer.findMany({
    where: { shopId },
    orderBy: { name: "asc" },
  });

  return customers.map((c: any) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    address: c.address || "",
    totalDue: Number(c.totalDue),
    createdAt: c.createdAt.toISOString(),
  }));
}
