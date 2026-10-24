import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import {
  createAccountingPeriod,
  closeAccountingPeriod,
  getAccountingPeriods,
} from "@/features/accounting/accounting-service";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

const periodActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("CREATE"),
    shopId: z.string().uuid(),
    periodName: z.string().min(1).max(100),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }),
  z.object({
    action: z.literal("CLOSE"),
    shopId: z.string().uuid(),
    periodId: z.string().uuid(),
  }),
]);

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");

    if (!shopId) {
      throw new ValidationError("Missing required query parameter: 'shopId'");
    }

    await requirePermission(authUser.id, shopId, "accounts.view_ledger");

    const periods = await getAccountingPeriods(shopId);

    const response: ApiSuccessResponse<typeof periods> = {
      data: periods,
      meta: { requestId },
    };

    return NextResponse.json(response);
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const rawBody = await req.json();
    const payload = periodActionSchema.parse(rawBody);

    await requirePermission(authUser.id, payload.shopId, "accounts.view_ledger");

    if (payload.action === "CREATE") {
      const period = await createAccountingPeriod({
        shopId: payload.shopId,
        periodName: payload.periodName,
        startDate: new Date(payload.startDate),
        endDate: new Date(payload.endDate),
      });

      const response: ApiSuccessResponse<typeof period> = {
        data: period,
        meta: { requestId },
      };
      return NextResponse.json(response, { status: 201 });
    } else {
      const closed = await closeAccountingPeriod({
        shopId: payload.shopId,
        periodId: payload.periodId,
        closedById: authUser.id,
      });

      const response: ApiSuccessResponse<typeof closed> = {
        data: closed,
        meta: { requestId },
      };
      return NextResponse.json(response, { status: 200 });
    }
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}
