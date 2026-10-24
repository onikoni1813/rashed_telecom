import { NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import {
  getShopSettings,
  updateShopSettings,
  UpdateShopSettingsInput,
} from "@/features/settings/settings-service";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");

    if (!shopId) {
      throw new ValidationError("Missing required query parameter: 'shopId'");
    }

    await requirePermission(authUser.id, shopId, "settings.view");

    const settings = await getShopSettings(shopId);

    const response: ApiSuccessResponse<typeof settings> = {
      data: settings,
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
    const body = await req.json();
    const { shopId, name, currency, timezone, settings } = body;

    if (!shopId) {
      throw new ValidationError("Missing required field: 'shopId'");
    }

    await requirePermission(authUser.id, shopId, "settings.manage");

    const input: UpdateShopSettingsInput = {
      name,
      currency,
      timezone,
      settings,
    };

    const updated = await updateShopSettings(shopId, authUser.id, input);

    const response: ApiSuccessResponse<typeof updated> = {
      data: updated,
      meta: { requestId },
    };

    return NextResponse.json(response);
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}
