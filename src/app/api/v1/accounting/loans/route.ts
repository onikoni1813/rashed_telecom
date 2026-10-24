import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { recordLoanTransaction } from "@/features/accounting/accounting-service";
import { formatErrorResponse } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

const loanTxSchema = z.object({
  shopId: z.string().uuid(),
  type: z.enum(["DISBURSEMENT", "REPAYMENT"]),
  principalAmount: z.number().positive("Principal amount must be greater than zero."),
  interestAmount: z.number().min(0).optional(),
  paymentMethod: z.enum(["CASH", "BANK", "BKASH", "NAGAD"]),
  lenderName: z.string().min(1, "Lender name is required.").max(100),
  referenceNumber: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const rawBody = await req.json();
    const payload = loanTxSchema.parse(rawBody);

    await requirePermission(authUser.id, payload.shopId, "accounts.view_ledger");

    const entry = await recordLoanTransaction({
      shopId: payload.shopId,
      type: payload.type,
      principalAmount: payload.principalAmount,
      interestAmount: payload.interestAmount,
      paymentMethod: payload.paymentMethod,
      lenderName: payload.lenderName,
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
