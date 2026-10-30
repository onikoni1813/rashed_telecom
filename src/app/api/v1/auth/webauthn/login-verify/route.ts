import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  createLocalSessionToken,
  COOKIE_SESSION_NAME,
} from "@/lib/auth/local-session";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, rawId, response } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "বায়োমেট্রিক ক্রিডেনশিয়াল অনুপস্থিত" },
        { status: 400 }
      );
    }

    const defaultShopId = "11111111-1111-1111-1111-111111111111";

    // Find the user holding this biometric credential
    const credential = await prisma.userCredential.findUnique({
      where: { credentialId: id },
      include: {
        user: {
          include: {
            memberships: {
              where: { shopId: defaultShopId, isActive: true },
              include: { role: true },
            },
          },
        },
      },
    });

    if (!credential || !credential.user || credential.user.memberships.length === 0) {
      return NextResponse.json(
        { success: false, error: "ফিঙ্গারপ্রিন্ট কোনো সক্রিয় ইউজারের সাথে মেলেনি।" },
        { status: 404 }
      );
    }

    // Update credential last used timestamp
    await prisma.userCredential.update({
      where: { id: credential.id },
      data: { lastUsedAt: new Date() },
    });

    const user = credential.user;
    const membership = user.memberships[0];

    const token = createLocalSessionToken({
      userId: user.id,
      email: user.email,
      roleName: membership.role.name,
      shopId: defaultShopId,
    });

    const res = NextResponse.json({
      success: true,
      message: "বায়োমেট্রিক যাচাইকরণ সফল হয়েছে!",
      user: {
        id: user.id,
        fullName: user.fullName || user.email,
        email: user.email,
        role: membership.role.name,
      },
      token,
    });

    // Set 30-day cookie
    res.cookies.set(COOKIE_SESSION_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "বায়োমেট্রিক লগইন ব্যর্থ হয়েছে" },
      { status: 500 }
    );
  }
}

