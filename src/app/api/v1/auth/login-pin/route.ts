import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  verifyPin,
  hashPin,
  createLocalSessionToken,
  COOKIE_SESSION_NAME,
} from "@/lib/auth/local-session";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, pin } = body;

    if (!userId || !pin || typeof pin !== "string" || pin.trim().length < 4) {
      return NextResponse.json(
        { success: false, error: "সঠিক ৪ ডিজিট পিন কোড প্রদান করুন।" },
        { status: 400 }
      );
    }

    const defaultShopId = "11111111-1111-1111-1111-111111111111";

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { shopId: defaultShopId, isActive: true },
          include: { role: true },
        },
      },
    });

    if (!user || user.memberships.length === 0) {
      return NextResponse.json(
        { success: false, error: "ইউজার বা সদস্যপদ পাওয়া যায়নি।" },
        { status: 404 }
      );
    }

    const membership = user.memberships[0];

    // Check PIN:
    let isPinValid = false;
    if (user.pinHash && user.pinSalt) {
      isPinValid = verifyPin(pin, user.pinSalt, user.pinHash);
    } else {
      // First time initialization: Default PIN is "1234" or whatever they enter on first setup
      if (pin.trim() === "1234" || !user.pinHash) {
        const { hash, salt } = hashPin(pin.trim());
        await prisma.user.update({
          where: { id: user.id },
          data: { pinHash: hash, pinSalt: salt },
        });
        isPinValid = true;
      }
    }

    if (!isPinValid) {
      return NextResponse.json(
        { success: false, error: "ভুল পিন কোড! পুনরায় চেষ্টা করুন।" },
        { status: 401 }
      );
    }

    const token = createLocalSessionToken({
      userId: user.id,
      email: user.email,
      roleName: membership.role.name,
      shopId: defaultShopId,
    });

    const response = NextResponse.json({
      success: true,
      message: "সফলভাবে লগইন হয়েছে।",
      user: {
        id: user.id,
        fullName: user.fullName || user.email,
        email: user.email,
        role: membership.role.name,
      },
      token,
    });

    // Set 30-day secure session cookie
    response.cookies.set(COOKIE_SESSION_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Login failed" },
      { status: 500 }
    );
  }
}

