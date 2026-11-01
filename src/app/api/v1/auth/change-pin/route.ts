import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyPin, hashPin } from "@/lib/auth/local-session";
import { requireAuth } from "@/lib/auth/guards";
import { recordAuditLog } from "@/lib/audit/service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { currentPin, newPin, confirmPin, userId: providedUserId } = body;

    // 1. Determine user ID either from authenticated local session or provided ID
    let userId: string | null = null;
    try {
      const auth = await requireAuth(req);
      userId = auth.id;
    } catch {
      if (providedUserId && typeof providedUserId === "string") {
        userId = providedUserId;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "ইউজার শনাক্ত করা যায়নি। অনুগ্রহ করে লগইন করুন।" },
        { status: 401 }
      );
    }

    // 2. Validate new PIN format (4 digits)
    if (!newPin || typeof newPin !== "string" || !/^\d{4}$/.test(newPin.trim())) {
      return NextResponse.json(
        { success: false, error: "নতুন পিন কোড অবশ্যই ঠিক ৪ ডিজিটের সংখ্যা হতে হবে (যেমন: ৫৭৮৯)।" },
        { status: 400 }
      );
    }

    // 3. Confirm PIN match
    if (newPin.trim() !== (confirmPin || "").trim()) {
      return NextResponse.json(
        { success: false, error: "নতুন পিন এবং পুনরায় দেওয়া পিন দুটি মিলছে না।" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "ইউজার রেকর্ড পাওয়া যায়নি।" },
        { status: 404 }
      );
    }

    // 4. Verify current PIN
    let isCurrentPinValid = false;
    if (user.pinHash && user.pinSalt) {
      isCurrentPinValid = verifyPin(currentPin || "", user.pinSalt, user.pinHash);
    } else {
      isCurrentPinValid = (currentPin || "").trim() === "1234";
    }

    if (!isCurrentPinValid) {
      return NextResponse.json(
        { success: false, error: "বর্তমান পিন কোডটি সঠিক নয়। অনুগ্রহ করে সঠিক পিন দিন।" },
        { status: 400 }
      );
    }

    // 5. Hash and update new PIN
    const { hash, salt } = hashPin(newPin.trim());

    await prisma.user.update({
      where: { id: user.id },
      data: {
        pinHash: hash,
        pinSalt: salt,
      },
    });

    try {
      await recordAuditLog({
        shopId: "11111111-1111-1111-1111-111111111111",
        actorId: user.id,
        action: "security.pin_change",
        entityType: "User",
        entityId: user.id,
        reason: "User updated terminal PIN code",
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      message: "আপনার পিন কোড সফলভাবে পরিবর্তন করা হয়েছে!",
    });
  } catch (error: any) {
    console.error("Change PIN API error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "পিন পরিবর্তন করতে ব্যর্থ হয়েছে।" },
      { status: 500 }
    );
  }
}

