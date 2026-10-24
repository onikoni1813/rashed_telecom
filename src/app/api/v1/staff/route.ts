import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { createStaffProfile, getStaffList } from "@/features/staff/staff-service";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

const createStaffSchema = z.object({
  shopId: z.string().uuid(),
  fullName: z.string().min(2, "Full name must be at least 2 characters.").max(100),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(10, "Phone number must be at least 10 digits.").max(20),
  roleId: z.string().uuid(),
  employeeCode: z.string().max(20).optional(),
  designation: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  compensationType: z.enum(["SALARY", "COMMISSION", "SALARY_PLUS_COMMISSION"]).default("SALARY"),
  baseSalary: z.number().min(0, "Base salary cannot be negative.").default(0),
  commissionRate: z.number().min(0).max(100).optional(),
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

    await requirePermission(authUser.id, shopId, "staff.view");

    const staffList = await getStaffList(shopId);

    const response: ApiSuccessResponse<typeof staffList> = {
      data: staffList,
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
    const payload = createStaffSchema.parse(rawBody);

    await requirePermission(authUser.id, payload.shopId, "staff.manage");

    const profile = await createStaffProfile({
      ...payload,
      actorId: authUser.id,
    });

    const response: ApiSuccessResponse<typeof profile> = {
      data: profile,
      meta: { requestId },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}
