import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { executeWithIdempotency } from "@/lib/idempotency/service";
import { recordStockMovement } from "@/features/inventory/stock-service";
import { recordAuditLog } from "@/lib/audit/service";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

const adjustmentSchema = z.object({
  shopId: z.string().uuid(),
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid(),
  quantity: z.number().refine((val) => val !== 0, "Adjustment quantity cannot be 0"),
  unitCost: z.number().min(0).default(0),
  reason: z.string().min(3).max(255),
});

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const idempotencyKey = req.headers.get("idempotency-key");
    const body = await req.json().catch(() => ({}));
    const parsed = adjustmentSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid adjustment payload", parsed.error.format());
    }

    await requirePermission(authUser.id, parsed.data.shopId, "inventory.adjust");

    const result = await executeWithIdempotency({
      shopId: parsed.data.shopId,
      idempotencyKey,
      payload: parsed.data,
      operation: async () => {
        const movementType =
          parsed.data.quantity > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT";

        const movementResult = await recordStockMovement({
          shopId: parsed.data.shopId,
          productId: parsed.data.productId,
          variantId: parsed.data.variantId || null,
          locationId: parsed.data.locationId,
          movementType,
          referenceType: "ManualAdjustment",
          quantity: parsed.data.quantity,
          unitCost: parsed.data.unitCost,
          reason: parsed.data.reason,
          actorId: authUser.id,
        });

        await recordAuditLog({
          shopId: parsed.data.shopId,
          actorId: authUser.id,
          action: "inventory.adjust",
          entityType: "StockMovement",
          entityId: movementResult.movement.id,
          reason: parsed.data.reason,
          afterState: {
            productId: parsed.data.productId,
            adjustmentQuantity: parsed.data.quantity,
            newBalanceOnHand: movementResult.quantityOnHand,
          },
        });

        return {
          statusCode: 201,
          data: {
            movementId: movementResult.movement.id,
            movementType,
            quantityOnHand: movementResult.quantityOnHand,
            averageCost: movementResult.averageCost,
          },
        };
      },
    });

    const payload: ApiSuccessResponse<typeof result.data> = {
      data: result.data,
      meta: {
        requestId,
        cached: result.cached,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(payload, { status: result.statusCode });
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}
