import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");
    const accountCode = searchParams.get("accountCode") || undefined;
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    if (!shopId) {
      throw new ValidationError("Missing required query parameter: 'shopId'");
    }

    await requirePermission(authUser.id, shopId, "accounts.view_ledger");

    const [accounts, entries, totalEntries] = await Promise.all([
      prisma.account.findMany({
        where: { shopId, isActive: true },
        orderBy: { code: "asc" },
      }),
      prisma.journalEntry.findMany({
        where: {
          shopId,
          ...(accountCode
            ? {
                lines: {
                  some: {
                    account: { code: accountCode },
                  },
                },
              }
            : {}),
        },
        include: {
          lines: {
            include: {
              account: true,
            },
          },
        },
        orderBy: { entryDate: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.journalEntry.count({
        where: {
          shopId,
          ...(accountCode
            ? {
                lines: {
                  some: {
                    account: { code: accountCode },
                  },
                },
              }
            : {}),
        },
      }),
    ]);

    const response: ApiSuccessResponse<{
      accounts: typeof accounts;
      entries: typeof entries;
      totalEntries: number;
    }> = {
      data: { accounts, entries, totalEntries },
      meta: { requestId },
    };

    return NextResponse.json(response);
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}
