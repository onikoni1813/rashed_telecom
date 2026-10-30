import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: Request) {
  try {
    const authUser = await requireAuth(req);
    const body = await req.json();
    const { id, rawId, response, deviceName } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "বায়োমেট্রিক ক্রিডেনশিয়াল আইডি অনুপস্থিত" },
        { status: 400 }
      );
    }

    // Save or update user credential
    await prisma.userCredential.upsert({
      where: { credentialId: id },
      update: {
        publicKey: JSON.stringify(response || {}),
        deviceName: deviceName || "বায়োমেট্রিক ফিঙ্গারপ্রিন্ট সেন্সর",
        lastUsedAt: new Date(),
      },
      create: {
        userId: authUser.id,
        credentialId: id,
        publicKey: JSON.stringify(response || {}),
        deviceName: deviceName || "বায়োমেট্রিক ফিঙ্গারপ্রিন্ট সেন্সর",
        lastUsedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "আপনার ফিঙ্গারপ্রিন্ট সফলভাবে নিবন্ধিত হয়েছে!",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "বায়োমেট্রিক নিবন্ধন ব্যর্থ হয়েছে" },
      { status: 500 }
    );
  }
}
