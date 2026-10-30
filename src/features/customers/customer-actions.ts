"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { collectCustomerDue } from "@/features/accounting/accounting-service";

export interface CreateCustomerInput {
  shopId: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
}

export async function createCustomerAction(input: CreateCustomerInput) {
  try {
    const shopId = input.shopId || "11111111-1111-1111-1111-111111111111";
    const name = input.name?.trim();
    const phone = input.phone?.trim();

    if (!name) {
      return { success: false, error: "গ্রাহকের নাম পূরণ করা আবশ্যক।" };
    }
    if (!phone || phone.length < 6) {
      return { success: false, error: "সঠিক মোবাইল নম্বর (কমপক্ষে ৬ ডিজিট) প্রদান করুন।" };
    }

    // Check unique phone within shop
    const existing = await prisma.customer.findUnique({
      where: {
        shopId_phone: {
          shopId,
          phone,
        },
      },
    });

    if (existing) {
      return {
        success: false,
        error: `মোবাইল নম্বর '${phone}' দিয়ে ইতিমধ্যে "${existing.name}" নামে গ্রাহক নিবন্ধিত আছেন।`,
      };
    }

    const customer = await prisma.customer.create({
      data: {
        shopId,
        name,
        phone,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        totalDue: 0,
      },
    });

    revalidatePath("/app/customers");
    revalidatePath("/app/pos");
    revalidatePath("/app/service");
    revalidatePath("/app/statements");

    return {
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        totalDue: Number(customer.totalDue),
        createdAt: customer.createdAt.toISOString(),
      },
    };
  } catch (err: any) {
    console.error("createCustomerAction error:", err);
    return {
      success: false,
      error: err.message || "গ্রাহক তৈরি করতে সমস্যা হয়েছে।",
    };
  }
}

export interface UpdateCustomerInput {
  shopId: string;
  customerId: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
}

export async function updateCustomerAction(input: UpdateCustomerInput) {
  try {
    const shopId = input.shopId || "11111111-1111-1111-1111-111111111111";
    const name = input.name?.trim();
    const phone = input.phone?.trim();

    if (!name) {
      return { success: false, error: "গ্রাহকের নাম আবশ্যক।" };
    }
    if (!phone || phone.length < 6) {
      return { success: false, error: "সঠিক মোবাইল নম্বর প্রদান করুন।" };
    }

    // Check duplicate phone for another customer
    const existing = await prisma.customer.findFirst({
      where: {
        shopId,
        phone,
        id: { not: input.customerId },
      },
    });

    if (existing) {
      return {
        success: false,
        error: `মোবাইল নম্বর '${phone}' দিয়ে অন্য একজন গ্রাহক (${existing.name}) ইতিমধ্যে রয়েছেন।`,
      };
    }

    const updated = await prisma.customer.update({
      where: { id: input.customerId },
      data: {
        name,
        phone,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
      },
    });

    revalidatePath("/app/customers");
    revalidatePath("/app/pos");
    revalidatePath("/app/statements");

    return {
      success: true,
      customer: {
        id: updated.id,
        name: updated.name,
        phone: updated.phone,
        email: updated.email,
        address: updated.address,
        totalDue: Number(updated.totalDue),
        createdAt: updated.createdAt.toISOString(),
      },
    };
  } catch (err: any) {
    console.error("updateCustomerAction error:", err);
    return {
      success: false,
      error: err.message || "গ্রাহকের তথ্য পরিবর্তন করতে সমস্যা হয়েছে।",
    };
  }
}

export interface CollectDueActionInput {
  shopId: string;
  customerId: string;
  amount: number;
  paymentMethod: "CASH" | "BANK" | "BKASH" | "NAGAD";
  referenceNumber?: string | null;
  notes?: string | null;
}

export async function collectCustomerDueAction(input: CollectDueActionInput) {
  try {
    const shopId = input.shopId || "11111111-1111-1111-1111-111111111111";
    const actorId = "00000000-0000-0000-0000-000000000001";

    const result = await collectCustomerDue({
      shopId,
      customerId: input.customerId,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      referenceNumber: input.referenceNumber,
      notes: input.notes,
      collectedById: actorId,
    });

    revalidatePath("/app/customers");
    revalidatePath("/app/dues");
    revalidatePath("/app/statements");
    revalidatePath("/app/accounts");

    return {
      success: true,
      payment: {
        id: result.payment.id,
        paymentNumber: result.payment.paymentNumber,
        newDueBalance: result.remainingDue,
      },
    };
  } catch (err: any) {
    console.error("collectCustomerDueAction error:", err);
    return {
      success: false,
      error: err.message || "বকেয়া আদায় সংরক্ষণ করতে ব্যর্থ হয়েছে।",
    };
  }
}
