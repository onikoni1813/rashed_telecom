import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { getNotifications, markNotificationAsRead } from "@/features/notifications/notification-service";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

const markReadSchema = z.object({
  shopId: z.string().uuid(),
  notificationId: z.string().uuid(),
});

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");

    if (!shopId) {
      throw new ValidationError("Missing required query parameter: 'shopId'");
    }

    await requirePermission(authUser.id, shopId, "dashboard.view");

    const notifications = await getNotifications(shopId, authUser.id);

    const response: ApiSuccessResponse<typeof notifications> = {
      data: notifications,
      meta: { requestId },
    };

    return NextResponse.json(response);
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}

export async function PATCH(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const rawBody = await req.json();
    const payload = markReadSchema.parse(rawBody);

    await requirePermission(authUser.id, payload.shopId, "dashboard.view");

    await markNotificationAsRead(payload.shopId, payload.notificationId);

    const response: ApiSuccessResponse<{ success: boolean }> = {
      data: { success: true },
      meta: { requestId },
    };

    return NextResponse.json(response);
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}
