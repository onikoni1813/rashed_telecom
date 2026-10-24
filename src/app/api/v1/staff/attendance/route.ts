import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { recordAttendance, getAttendanceList } from "@/features/staff/staff-service";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

const recordAttendanceSchema = z.object({
  shopId: z.string().uuid(),
  staffProfileId: z.string().uuid(),
  date: z.string().datetime().optional(),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "LEAVE"]),
  checkInTime: z.string().datetime().optional().nullable(),
  checkOutTime: z.string().datetime().optional().nullable(),
  notes: z.string().max(300).optional().nullable(),
});

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");
    const dateStr = searchParams.get("date");

    if (!shopId) {
      throw new ValidationError("Missing required query parameter: 'shopId'");
    }

    await requirePermission(authUser.id, shopId, "staff.view");

    const targetDate = dateStr ? new Date(dateStr) : undefined;
    const records = await getAttendanceList(shopId, targetDate);

    const response: ApiSuccessResponse<typeof records> = {
      data: records,
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
    const payload = recordAttendanceSchema.parse(rawBody);

    await requirePermission(authUser.id, payload.shopId, "staff.manage");

    const record = await recordAttendance({
      shopId: payload.shopId,
      staffProfileId: payload.staffProfileId,
      date: payload.date ? new Date(payload.date) : new Date(),
      status: payload.status,
      checkInTime: payload.checkInTime ? new Date(payload.checkInTime) : undefined,
      checkOutTime: payload.checkOutTime ? new Date(payload.checkOutTime) : undefined,
      notes: payload.notes,
      actorId: authUser.id,
    });

    const response: ApiSuccessResponse<typeof record> = {
      data: record,
      meta: { requestId },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}
