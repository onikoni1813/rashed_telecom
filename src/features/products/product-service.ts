import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ValidationError, NotFoundError, ConflictError } from "@/lib/errors";

export interface CreateProductInput {
  shopId: string;
  categoryId: string;
  name: string;
  brand?: string | null;
  sku: string;
  barcode?: string | null;
  modelNumber?: string | null;
  isTrackStock?: boolean;
  costPrice?: number;
  sellingPrice?: number;
  initialStock?: number;
  minStockAlert?: number;
  locationId?: string;
}

export interface UpdateProductInput {
  categoryId?: string;
  name?: string;
  brand?: string | null;
  barcode?: string | null;
  modelNumber?: string | null;
  isTrackStock?: boolean;
  costPrice?: number;
  sellingPrice?: number;
  minStockAlert?: number;
  isActive?: boolean;
}

export async function createProduct(input: CreateProductInput) {
  // 1. Verify category belongs to shop
  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
  });
  if (!category || category.shopId !== input.shopId) {
    throw new NotFoundError("Category not found or does not belong to this shop.");
  }

  // 2. Check SKU uniqueness within shop
  const existingSku = await prisma.product.findUnique({
    where: {
      shopId_sku: {
        shopId: input.shopId,
        sku: input.sku.trim(),
      },
    },
  });
  if (existingSku) {
    throw new ConflictError(`Product SKU '${input.sku}' is already in use in this shop.`);
  }

  const initialQty = Number(input.initialStock) || 0;
  const isTrackStock = input.isTrackStock ?? true;

  const product = await prisma.product.create({
    data: {
      shopId: input.shopId,
      categoryId: input.categoryId,
      name: input.name.trim(),
      brand: input.brand?.trim() || null,
      sku: input.sku.trim(),
      barcode: input.barcode?.trim() || null,
      modelNumber: input.modelNumber?.trim() || null,
      isTrackStock,
      costPrice: input.costPrice ?? 0,
      sellingPrice: input.sellingPrice ?? 0,
      minStockAlert: input.minStockAlert ?? 5,
    },
    include: {
      category: true,
      stockBalances: {
        include: { location: true },
      },
    },
  });

  if (isTrackStock && initialQty > 0) {
    let locId = input.locationId;
    if (!locId && prisma.location?.findFirst) {
      const defaultLoc = await prisma.location.findFirst({
        where: { shopId: input.shopId },
        orderBy: { isDefault: "desc" },
      });
      locId = defaultLoc?.id;
    }

    if (locId && prisma.stockBalance?.create) {
      await prisma.stockBalance.create({
        data: {
          shopId: input.shopId,
          productId: product.id,
          locationId: locId,
          quantityOnHand: initialQty,
          averageCost: input.costPrice ?? 0,
        },
      });

      if (prisma.stockMovement?.create) {
        await prisma.stockMovement.create({
          data: {
            shopId: input.shopId,
            productId: product.id,
            locationId: locId,
            movementType: "OPENING_BALANCE",
            referenceType: "INITIAL_STOCK",
            referenceId: product.id,
            quantity: initialQty,
            unitCost: input.costPrice ?? 0,
            balanceAfter: initialQty,
            reason: "Initial stock upon product creation",
          },
        });
      }
    }
  }

  return product;
}

export async function updateProduct(
  id: string,
  shopId: string,
  input: UpdateProductInput
) {
  const existing = await prisma.product.findUnique({
    where: { id },
  });
  if (!existing || existing.shopId !== shopId) {
    throw new NotFoundError("Product not found or does not belong to this shop.");
  }

  return await prisma.product.update({
    where: { id },
    data: {
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.brand !== undefined ? { brand: input.brand?.trim() || null } : {}),
      ...(input.barcode !== undefined ? { barcode: input.barcode?.trim() || null } : {}),
      ...(input.modelNumber !== undefined ? { modelNumber: input.modelNumber?.trim() || null } : {}),
      ...(input.isTrackStock !== undefined ? { isTrackStock: input.isTrackStock } : {}),
      ...(input.costPrice !== undefined ? { costPrice: input.costPrice } : {}),
      ...(input.sellingPrice !== undefined ? { sellingPrice: input.sellingPrice } : {}),
      ...(input.minStockAlert !== undefined ? { minStockAlert: input.minStockAlert } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    include: {
      category: true,
      stockBalances: true,
    },
  });
}

export async function getProducts(params: {
  shopId: string;
  categoryId?: string;
  search?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}) {
  const { shopId, categoryId, search, isActive = true, limit = 50, offset = 0 } = params;

  return await prisma.product.findMany({
    where: {
      shopId,
      ...(categoryId ? { categoryId } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
              { barcode: { contains: search, mode: "insensitive" } },
              { brand: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      category: true,
      stockBalances: {
        include: {
          location: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

export async function deleteProduct(id: string, shopId: string) {
  const existing = await prisma.product.findUnique({
    where: { id },
  });
  if (!existing || existing.shopId !== shopId) {
    throw new NotFoundError("পণ্যটি পাওয়া যায়নি বা এই দোকানের অন্তর্ভুক্ত নয়।");
  }

  // Check if product has historical transactions (Sales, Purchases, Serials, Repairs)
  const [salesCount, purchasesCount, serialsCount, serviceCount] = await Promise.all([
    prisma.saleItem?.count ? prisma.saleItem.count({ where: { productId: id } }) : 0,
    prisma.goodsReceiptItem?.count ? prisma.goodsReceiptItem.count({ where: { productId: id } }) : 0,
    prisma.serialNumber?.count ? prisma.serialNumber.count({ where: { productId: id } }) : 0,
    prisma.servicePart?.count ? prisma.servicePart.count({ where: { productId: id } }) : 0,
  ]);

  const hasHistory = salesCount > 0 || purchasesCount > 0 || serialsCount > 0 || serviceCount > 0;

  if (hasHistory) {
    // If it has business transactions, deactivate (soft-delete) to preserve accounting and ledger integrity
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
    return {
      success: true,
      deleted: false,
      deactivated: true,
      message: "পণ্যটির অতীত বিক্রয় ও আর্থিক হিসেব সুরক্ষিত রাখতে এটিকে স্থায়ীভাবে না মুছে 'নিষ্ক্রিয়' করা হয়েছে। এটি আর বিক্রয় তালিকায় আসবে না।",
    };
  }

  // If no transactions exist, safe to permanently delete
  if (prisma.stockMovement?.deleteMany) {
    await prisma.stockMovement.deleteMany({ where: { productId: id } });
  }
  if (prisma.stockBalance?.deleteMany) {
    await prisma.stockBalance.deleteMany({ where: { productId: id } });
  }
  if (prisma.productVariant?.deleteMany) {
    await prisma.productVariant.deleteMany({ where: { productId: id } });
  }

  await prisma.product.delete({ where: { id } });

  return {
    success: true,
    deleted: true,
    deactivated: false,
    message: "পণ্যটি স্থায়ীভাবে মুছে ফেলা হয়েছে।",
  };
}

export async function toggleProductStatus(id: string, shopId: string, isActive: boolean) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing || existing.shopId !== shopId) {
    throw new NotFoundError("পণ্যটি পাওয়া যায়নি।");
  }

  return await prisma.product.update({
    where: { id },
    data: { isActive },
    include: { category: true },
  });
}
