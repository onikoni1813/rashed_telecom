import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { recordExpense } from "@/features/accounting/accounting-service";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";
import { executeWithIdempotency } from "@/lib/idempotency/service";

const createExpenseSchema = z.object({
  shopId: z.string().uuid(),
  categoryId: z.string().uuid(),
  accountCode: z.string().optional(),
  paymentMethod: z.enum(["CASH", "BANK", "BKASH", "NAGAD"]),
  amount: z.number().positive("Amount must be greater than zero."),
  expenseDate: z.string().datetime().optional(),
  payee: z.string().max(100).optional().nullable(),
  receiptRef: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");
    const categoryId = searchParams.get("categoryId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    if (!shopId) {
      throw new ValidationError("Missing required query parameter: 'shopId'");
    }

    await requirePermission(authUser.id, shopId, "expenses.view");

    const [expenses, total, categories] = await Promise.all([
      prisma.expense.findMany({
        where: {
          shopId,
          ...(categoryId ? { categoryId } : {}),
        },
        include: {
          category: true,
          account: true,
          recordedBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
        orderBy: { expenseDate: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.expense.count({
        where: {
          shopId,
          ...(categoryId ? { categoryId } : {}),
        },
      }),
      prisma.expenseCategory.findMany({
        where: { shopId },
        orderBy: { name: "asc" },
      }),
    ]);

    const response: ApiSuccessResponse<{
      expenses: typeof expenses;
      total: number;
      categories: typeof categories;
    }> = {
      data: { expenses, total, categories },
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
    const payload = createExpenseSchema.parse(rawBody);

    await requirePermission(authUser.id, payload.shopId, "expenses.create");

    const idempotencyKey = req.headers.get("Idempotency-Key");

    const operation = async () => {
      const exp = await recordExpense({
        shopId: payload.shopId,
        categoryId: payload.categoryId,
        accountCode: payload.accountCode,
        paymentMethod: payload.paymentMethod,
        amount: payload.amount,
        expenseDate: payload.expenseDate ? new Date(payload.expenseDate) : undefined,
        payee: payload.payee,
        receiptRef: payload.receiptRef,
        notes: payload.notes,
        recordedById: authUser.id,
      });

      return {
        statusCode: 201,
        data: exp,
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
