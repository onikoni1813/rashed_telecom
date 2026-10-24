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
  minStockAlert?: number;
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

  return await prisma.product.create({
    data: {
      shopId: input.shopId,
      categoryId: input.categoryId,
      name: input.name.trim(),
      brand: input.brand?.trim() || null,
      sku: input.sku.trim(),
      barcode: input.barcode?.trim() || null,
      modelNumber: input.modelNumber?.trim() || null,
      isTrackStock: input.isTrackStock ?? true,
      costPrice: new Prisma.Decimal(input.costPrice ?? 0),
      sellingPrice: new Prisma.Decimal(input.sellingPrice ?? 0),
      minStockAlert: input.minStockAlert ?? 5,
    },
    include: {
      category: true,
      stockBalances: true,
    },
  });
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
      ...(input.costPrice !== undefined ? { costPrice: new Prisma.Decimal(input.costPrice) } : {}),
      ...(input.sellingPrice !== undefined ? { sellingPrice: new Prisma.Decimal(input.sellingPrice) } : {}),
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
