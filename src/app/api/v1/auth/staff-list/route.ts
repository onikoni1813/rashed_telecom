import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const defaultShopId = "11111111-1111-1111-1111-111111111111";

    const members = await prisma.shopMember.findMany({
      where: {
        shopId: defaultShopId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            pinHash: true,
            credentials: {
              select: { id: true, deviceName: true },
            },
          },
        },
        role: {
          select: {
            name: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const staffList = members.map((m) => ({
      userId: m.user.id,
      name: m.user.fullName || m.user.email || "দোকান কর্মী",
      email: m.user.email,
      phone: m.user.phone,
      roleName: m.role.name,
      roleDescription: m.role.description,
      hasPin: !!m.user.pinHash,
      hasBiometrics: m.user.credentials.length > 0,
      biometricCount: m.user.credentials.length,
    }));

    return NextResponse.json({
      success: true,
      shopId: defaultShopId,
      staff: staffList,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load staff list" },
      { status: 500 }
    );
  }
}
