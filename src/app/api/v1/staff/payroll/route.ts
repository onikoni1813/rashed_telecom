import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { processPayroll, getPayrollList } from "@/features/staff/staff-service";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";
import { executeWithIdempotency } from "@/lib/idempotency/service";

const processPayrollSchema = z.object({
  shopId: z.string().uuid(),
  staffProfileId: z.string().uuid(),
  payrollMonth: z.string().regex(/^\d{4}-\d{2}$/, "Payroll month must be in YYYY-MM format."),
  baseSalary: z.number().min(0).optional(),
  commissionAmount: z.number().min(0).optional(),
  deductions: z.number().min(0).optional(),
  paymentMethod: z.enum(["CASH", "BANK", "BKASH", "NAGAD"]),
  notes: z.string().max(500).optional().nullable(),
});

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");
    const month = searchParams.get("month") || undefined;

    if (!shopId) {
      throw new ValidationError("Missing required query parameter: 'shopId'");
    }

    // STRICT PERMISSION CHECK: Restrict salary/payroll access from unauthorized staff
    await requirePermission(authUser.id, shopId, "payroll.view");

    const payrollList = await getPayrollList(shopId, month);

    const response: ApiSuccessResponse<typeof payrollList> = {
      data: payrollList,
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
    const payload = processPayrollSchema.parse(rawBody);

    // STRICT PERMISSION CHECK: Restrict salary disbursement
    await requirePermission(authUser.id, payload.shopId, "payroll.process");

    const idempotencyKey = req.headers.get("Idempotency-Key");

    const operation = async () => {
      const result = await processPayroll({
        shopId: payload.shopId,
        staffProfileId: payload.staffProfileId,
        payrollMonth: payload.payrollMonth,
        baseSalary: payload.baseSalary,
        commissionAmount: payload.commissionAmount,
        deductions: payload.deductions,
        paymentMethod: payload.paymentMethod,
        notes: payload.notes,
        paidById: authUser.id,
      });

      return {
        statusCode: 201,
        data: result,
      };
    };

    const result = idempotencyKey
      ? await executeWithIdempotency({
          shopId: payload.shopId,
          idempotencyKey,
          payload,
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
