import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireShopMember } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { formatErrorResponse } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";
import { executeWithIdempotency } from "@/lib/idempotency/service";
import { createSale } from "@/features/sales/sales-service";
import { createServiceJob } from "@/features/repairs/repair-service";
import { recordAttendance } from "@/features/staff/staff-service";
import { recordExpense } from "@/features/accounting/accounting-service";

const syncBatchSchema = z.object({
  shopId: z.string().uuid(),
  items: z.array(
    z.object({
      outboxId: z.string(),
      operationId: z.string().uuid(),
      entityType: z.enum(["SALE", "REPAIR", "ATTENDANCE", "EXPENSE", "STOCK_ADJUSTMENT"]),
      schemaVersion: z.number().int().min(1),
      payload: z.record(z.any()),
    })
  ),
});

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const rawBody = await req.json();
    const { shopId, items } = syncBatchSchema.parse(rawBody);

    await requireShopMember(authUser.id, shopId);

    const results: Array<{
      outboxId: string;
      operationId: string;
      status: "SYNCED" | "CONFLICT" | "FAILED";
      serverEntityId?: string;
      error?: string;
    }> = [];

    // Pre-fetch default location for sales
    let defaultLocation = await prisma.location.findFirst({
      where: { shopId, isDefault: true },
    });
    if (!defaultLocation) {
      defaultLocation = await prisma.location.findFirst({ where: { shopId } });
    }

    for (const item of items) {
      try {
        const idempotencyResult = await executeWithIdempotency<{ id: string }>({
          shopId,
          idempotencyKey: item.operationId,
          payload: item.payload,
          operation: async () => {
            let serverEntityId: string;

            if (item.entityType === "SALE") {
              const saleRes = await createSale({
                shopId,
                cashierId: authUser.id,
                customerId: item.payload.customerId as string | undefined,
                locationId: (item.payload.locationId as string) || defaultLocation?.id || "",
                items: item.payload.items as any,
                payments: item.payload.payments as any,
                discount: item.payload.discount ? Number(item.payload.discount) : 0,
                notes: item.payload.notes as string | undefined,
              });
              serverEntityId = saleRes.saleId;
            } else if (item.entityType === "REPAIR") {
              // Ensure customer exists
              let customerId = item.payload.customerId as string | undefined;
              if (!customerId && item.payload.customerPhone) {
                const existingCust = await prisma.customer.findFirst({
                  where: { shopId, phone: item.payload.customerPhone as string },
                });
                if (existingCust) {
                  customerId = existingCust.id;
                } else {
                  const newCust = await prisma.customer.create({
                    data: {
                      shopId,
                      name: (item.payload.customerName as string) || "Walk-in Customer",
                      phone: item.payload.customerPhone as string,
                    },
                  });
                  customerId = newCust.id;
                }
              }

              const repair = await createServiceJob({
                shopId,
                customerId: customerId || "",
                deviceBrand: (item.payload.deviceBrand as string) || "General",
                deviceModel: (item.payload.deviceModel as string) || "General",
                deviceImei: item.payload.deviceImei as string | undefined,
                intakeCondition: (item.payload.intakeCondition as string) || "Used",
                reportedIssue: (item.payload.reportedIssue as string) || "Inspection",
                intakeCashierId: authUser.id,
                notes: item.payload.notes as string | undefined,
              });
              serverEntityId = repair.id;
            } else if (item.entityType === "ATTENDANCE") {
              const attendance = await recordAttendance({
                shopId,
                staffProfileId: item.payload.staffProfileId as string,
                date: new Date(item.payload.date as string),
                status: item.payload.status as any,
                checkInTime: item.payload.checkInTime ? new Date(item.payload.checkInTime as string) : undefined,
                actorId: authUser.id,
              });
              serverEntityId = attendance.id;
            } else if (item.entityType === "EXPENSE") {
              const expense = await recordExpense({
                shopId,
                categoryId: item.payload.categoryId as string,
                paymentMethod: (item.payload.paymentMethod as any) || "CASH",
                amount: Number(item.payload.amount),
                payee: item.payload.payee as string | undefined,
                notes: item.payload.notes as string | undefined,
                recordedById: authUser.id,
              });
              serverEntityId = expense.id;
            } else {
              throw new Error(`Unsupported sync entity type: ${item.entityType}`);
            }

            return {
              statusCode: 200,
              data: { id: serverEntityId },
            };
          },
        });

        results.push({
          outboxId: item.outboxId,
          operationId: item.operationId,
          status: "SYNCED",
          serverEntityId: idempotencyResult.data?.id,
        });
      } catch (err: any) {
        const isConflict =
          err.statusCode === 409 ||
          err.name === "ConflictError" ||
          err.message?.toLowerCase().includes("conflict") ||
          err.message?.toLowerCase().includes("stock") ||
          err.message?.toLowerCase().includes("insufficient");

        results.push({
          outboxId: item.outboxId,
          operationId: item.operationId,
          status: isConflict ? "CONFLICT" : "FAILED",
          error: err.message || "Operation failed on server.",
        });
      }
    }

    const response: ApiSuccessResponse<{ results: typeof results }> = {
      data: { results },
      meta: { requestId },
    };

    return NextResponse.json(response);
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}
