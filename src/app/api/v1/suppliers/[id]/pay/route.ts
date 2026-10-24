import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { paySupplier } from "@/features/accounting/accounting-service";
import { formatErrorResponse } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";
import { executeWithIdempotency } from "@/lib/idempotency/service";

const paySupplierSchema = z.object({
  shopId: z.string().uuid(),
  amount: z.number().positive("Payment amount must be greater than zero."),
  paymentMethod: z.enum(["CASH", "BANK", "BKASH", "NAGAD"]),
  referenceNumber: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { id: supplierId } = await params;
    const rawBody = await req.json();
    const payload = paySupplierSchema.parse(rawBody);

    await requirePermission(authUser.id, payload.shopId, "purchases.create");

    const idempotencyKey = req.headers.get("Idempotency-Key");

    const operation = async () => {
      const data = await paySupplier({
        shopId: payload.shopId,
        supplierId,
        amount: payload.amount,
        paymentMethod: payload.paymentMethod,
        referenceNumber: payload.referenceNumber,
        notes: payload.notes,
        paidById: authUser.id,
      });

      return {
        statusCode: 200,
        data,
      };
    };

    const result = idempotencyKey
      ? await executeWithIdempotency({
          shopId: payload.shopId,
          idempotencyKey,
          payload: { ...payload, supplierId },
          operation,
        })
      : await operation();

    const response: ApiSuccessResponse<typeof result.data> = {
      data: result.data,
      meta: { requestId },
    };

    return NextResponse.json(response, { status: result.statusCode });
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}
