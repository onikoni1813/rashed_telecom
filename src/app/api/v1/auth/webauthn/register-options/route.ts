import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: Request) {
  try {
    const authUser = await requireAuth(req);
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { credentials: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "ইউজার পাওয়া যায়নি" }, { status: 404 });
    }

    const challenge = crypto.randomBytes(32).toString("base64url");

    // Exclude already registered credentials
    const excludeCredentials = user.credentials.map((cred) => ({
      id: cred.credentialId,
      type: "public-key",
      transports: ["internal", "hybrid", "usb"],
    }));

    return NextResponse.json({
      success: true,
      options: {
        challenge,
        rp: {
          name: "Rashed Telecom",
        },
        user: {
          id: Buffer.from(user.id).toString("base64url"),
          name: user.email || user.fullName || "User",
          displayName: user.fullName || "স্টাফ মেম্বার",
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256
          { alg: -257, type: "public-key" }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform", // Direct device biometric: Windows Hello, Fingerprint, Touch ID
          userVerification: "preferred",
          residentKey: "preferred",
        },
        timeout: 60000,
        attestation: "none",
        excludeCredentials,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to generate biometric registration options" },
      { status: 500 }
    );
  }
}
