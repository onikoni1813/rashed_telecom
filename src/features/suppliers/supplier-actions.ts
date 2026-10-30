"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { paySupplier } from "@/features/accounting/accounting-service";

export interface CreateSupplierInput {
  shopId: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export async function createSupplierAction(input: CreateSupplierInput) {
  try {
    const shopId = input.shopId || "11111111-1111-1111-1111-111111111111";
    const name = input.name?.trim();
    if (!name) {
      return { success: false, error: "সরবরাহকারী বা প্রতিষ্ঠানের নাম পূরণ করা আবশ্যক।" };
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

    revalidatePath("/app/suppliers");
    revalidatePath("/app/purchases");
    revalidatePath("/app/statements");

    return {
      success: true,
      supplier: {
        id: supplier.id,
        name: supplier.name,
        contactPerson: supplier.contactPerson,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        payableBalance: Number(supplier.payableBalance),
        isActive: supplier.isActive,
        createdAt: supplier.createdAt.toISOString(),
      },
    };
  } catch (err: any) {
    console.error("createSupplierAction error:", err);
    return {
      success: false,
      error: err.message || "সরবরাহকারী যোগ করতে সমস্যা হয়েছে।",
    };
  }
}

export interface UpdateSupplierInput {
  shopId: string;
  supplierId: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive?: boolean;
}

export async function updateSupplierAction(input: UpdateSupplierInput) {
  try {
    const shopId = input.shopId || "11111111-1111-1111-1111-111111111111";
    const name = input.name?.trim();
    if (!name) {
      return { success: false, error: "সরবরাহকারীর নাম আবশ্যক।" };
    }

    const existing = await prisma.supplier.findFirst({
      where: {
        shopId,
        name,
        id: { not: input.supplierId },
      },
    });

    if (existing) {
      return {
        success: false,
        error: `"${name}" নামে অন্য একজন সরবরাহকারী ইতিমধ্যে বিদ্যমান।`,
      };
    }

    const updated = await prisma.supplier.update({
      where: { id: input.supplierId },
      data: {
        name,
        contactPerson: input.contactPerson?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        isActive: input.isActive !== undefined ? input.isActive : true,
      },
    });

    revalidatePath("/app/suppliers");
    revalidatePath("/app/purchases");
    revalidatePath("/app/statements");

    return {
      success: true,
      supplier: {
        id: updated.id,
        name: updated.name,
        contactPerson: updated.contactPerson,
        phone: updated.phone,
        email: updated.email,
        address: updated.address,
        payableBalance: Number(updated.payableBalance),
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString(),
      },
    };
  } catch (err: any) {
    console.error("updateSupplierAction error:", err);
    return {
      success: false,
      error: err.message || "সরবরাহকারীর তথ্য আপডেট করতে সমস্যা হয়েছে।",
    };
  }
}

export interface PaySupplierActionInput {
  shopId: string;
  supplierId: string;
  amount: number;
  paymentMethod: "CASH" | "BANK" | "BKASH" | "NAGAD";
  referenceNumber?: string | null;
  notes?: string | null;
}

export async function paySupplierDueAction(input: PaySupplierActionInput) {
  try {
    const shopId = input.shopId || "11111111-1111-1111-1111-111111111111";
    const actorId = "00000000-0000-0000-0000-000000000001";

    const result = await paySupplier({
      shopId,
      supplierId: input.supplierId,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      referenceNumber: input.referenceNumber,
      notes: input.notes,
      paidById: actorId,
    });

    revalidatePath("/app/suppliers");
    revalidatePath("/app/purchases");
    revalidatePath("/app/statements");
    revalidatePath("/app/accounts");

    return {
      success: true,
      result: {
        newPayableBalance: result.remainingPayable,
      },
    };
  } catch (err: any) {
    console.error("paySupplierDueAction error:", err);
    return {
      success: false,
      error: err.message || "সাপ্লায়ার পেমেন্ট সম্পন্ন করতে সমস্যা হয়েছে।",
    };
  }
}
