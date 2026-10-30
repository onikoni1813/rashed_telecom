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

