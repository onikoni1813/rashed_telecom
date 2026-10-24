import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { recordOwnerTransaction } from "@/features/accounting/accounting-service";
import { formatErrorResponse } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

const ownerTxSchema = z.object({
  shopId: z.string().uuid(),
  type: z.enum(["INJECTION", "DRAWING"]),
  amount: z.number().positive("Amount must be greater than zero."),
  paymentMethod: z.enum(["CASH", "BANK", "BKASH", "NAGAD"]),
  referenceNumber: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const rawBody = await req.json();
    const payload = ownerTxSchema.parse(rawBody);

    await requirePermission(authUser.id, payload.shopId, "accounts.view_ledger");

    const entry = await recordOwnerTransaction({
      shopId: payload.shopId,
      type: payload.type,
      amount: payload.amount,
      paymentMethod: payload.paymentMethod,
      referenceNumber: payload.referenceNumber,
      notes: payload.notes,
      actorId: authUser.id,
    });

    const response: ApiSuccessResponse<typeof entry> = {
      data: entry,
      meta: { requestId },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}
