"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import {
  createPurchaseOrder,
  receiveGoods,
  CreatePOItemInput,
  ReceiveItemInput,
} from "./purchasing-service";

export interface CreatePOActionInput {
  shopId: string;
  supplierId: string;
  expectedAt?: string | null;
  notes?: string | null;
  items: CreatePOItemInput[];
}

export async function createPurchaseOrderAction(input: CreatePOActionInput) {
  try {
    const shopId = input.shopId || "11111111-1111-1111-1111-111111111111";
    if (!input.supplierId) {
      return { success: false, error: "সরবরাহকারী (Supplier) নির্বাচন করা আবশ্যক।" };
    }
    if (!input.items || input.items.length === 0) {
      return { success: false, error: "কমপক্ষে একটি পণ্য যোগ করা আবশ্যক।" };
    }

    for (const it of input.items) {
      if (!it.productId) {
        return { success: false, error: "পণ্য নির্বাচন করুন।" };
      }
      if (!it.quantity || it.quantity <= 0) {
        return { success: false, error: "পণ্যের সঠিক পরিমাণ (১ বা তার বেশি) দিন।" };
      }
      if (it.unitCost === undefined || it.unitCost < 0) {
        return { success: false, error: "সঠিক ক্রয় মূল্য নির্ধারণ করুন।" };
      }
    }

    const actorId = "00000000-0000-0000-0000-000000000001";
    const po = await createPurchaseOrder({
      shopId,
      supplierId: input.supplierId,
      expectedAt: input.expectedAt ? new Date(input.expectedAt) : null,
      notes: input.notes?.trim() || null,
      items: input.items,
      actorId,
    });

    revalidatePath("/app/purchases");
    revalidatePath("/app/inventory");

    return {
      success: true,
      order: {
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
      },
    };
  } catch (err: any) {
    console.error("createPurchaseOrderAction error:", err);
    return {
      success: false,
      error: err.message || "পারচেজ অর্ডার তৈরি করতে ব্যর্থ হয়েছে।",
    };
  }
}

export interface ReceiveGoodsActionInput {
  shopId: string;
  purchaseOrderId: string;
  locationId: string;
  notes?: string | null;
  receivedItems: ReceiveItemInput[];
}

export async function receiveGoodsAction(input: ReceiveGoodsActionInput) {
  try {
    const shopId = input.shopId || "11111111-1111-1111-1111-111111111111";
    if (!input.purchaseOrderId) {
      return { success: false, error: "পারচেজ অর্ডার আইডি আবশ্যক।" };
    }
    if (!input.locationId) {
      return { success: false, error: "স্টোরেজ লোকেশন নির্বাচন করুন।" };
    }
    if (!input.receivedItems || input.receivedItems.length === 0) {
      return { success: false, error: "কমপক্ষে একটি রিসিভ আইটেম নির্বাচন করুন।" };
    }

    const actorId = "00000000-0000-0000-0000-000000000001";
    const result = await receiveGoods({
      shopId,
      purchaseOrderId: input.purchaseOrderId,
      locationId: input.locationId,
      notes: input.notes?.trim() || null,
      receivedItems: input.receivedItems,
      actorId,
    });

    revalidatePath("/app/purchases");
    revalidatePath("/app/inventory");
    revalidatePath("/app/products");
    revalidatePath("/app/pos");

    return {
      success: true,
      result: {
        grnNumber: result.grnNumber,
        newStatus: result.poStatus,
        totalReceivedValue: result.totalReceivedValue,
      },
    };
  } catch (err: any) {
    console.error("receiveGoodsAction error:", err);
    return {
      success: false,
      error: err.message || "পণ্য রিসিভ সম্পন্ন করতে ব্যর্থ হয়েছে।",
    };
  }
}

export interface CreateSupplierActionInput {
  shopId: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export async function createSupplierAction(input: CreateSupplierActionInput) {
  try {
    const shopId = input.shopId || "11111111-1111-1111-1111-111111111111";
    const name = input.name?.trim();
    if (!name) {
      return { success: false, error: "সরবরাহকারীর নাম আবশ্যক।" };
    }

    const existing = await prisma.supplier.findUnique({
      where: {
        shopId_name: {
          shopId,
          name,
        },
      },
    });

    if (existing) {
      return {
        success: false,
        error: `"${name}" নামে ইতিমধ্যে একজন সরবরাহকারী বিদ্যমান রয়েছে।`,
      };
    }

    const supplier = await prisma.supplier.create({
      data: {
        shopId,
        name,
        contactPerson: input.contactPerson?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        payableBalance: 0,
        isActive: true,
      },
    });

    revalidatePath("/app/purchases");
    revalidatePath("/app/suppliers");

    return {
      success: true,
      supplier: {
        id: supplier.id,
        name: supplier.name,
        phone: supplier.phone,
        contactPerson: supplier.contactPerson,
        payableBalance: Number(supplier.payableBalance),
      },
    };
  } catch (err: any) {
    console.error("createSupplierAction error:", err);
    return {
      success: false,
      error: err.message || "সাপ্লায়ার তৈরি করতে সমস্যা হয়েছে।",
    };
  }
}
