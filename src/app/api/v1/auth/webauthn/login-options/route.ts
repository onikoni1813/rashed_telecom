import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId } = body;

    const challenge = crypto.randomBytes(32).toString("base64url");

    let credentials: Array<{ credentialId: string }> = [];
    if (userId) {
      credentials = await prisma.userCredential.findMany({
        where: { userId },
        select: { credentialId: true },
      });

      if (credentials.length === 0) {
        return NextResponse.json({
          success: false,
          error:
            "আপনার অ্যাকাউন্টে এখনও ফিঙ্গারপ্রিন্ট যুক্ত করা হয়নি। অনুগ্রহ করে প্রথমে পিন কোড দিয়ে ড্যাশবোর্ডে প্রবেশ করে উপরে ডানপাশের প্রোফাইল মেনু থেকে 'ফিঙ্গারপ্রিন্ট যোগ করুন' অপশনে গিয়ে আঙুল স্ক্যান করে নিন।",
        });
      }
    } else {
      credentials = await prisma.userCredential.findMany({
        select: { credentialId: true },
        take: 20,
      });
    }

    const allowCredentials = credentials.map((c) => ({
      id: c.credentialId,
      type: "public-key",
      transports: ["internal", "hybrid", "usb"],
    }));

    return NextResponse.json({
      success: true,
      options: {
        challenge,
        timeout: 60000,
        userVerification: "preferred",
        allowCredentials,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to generate login options" },
      { status: 500 }
    );
  }
}

