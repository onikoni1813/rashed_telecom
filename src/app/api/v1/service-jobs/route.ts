import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requirePermission, assertShopAccess } from "@/lib/auth/guards";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { createServiceJob } from "@/features/repairs/repair-service";
import { executeWithIdempotency } from "@/lib/idempotency/service";
import { ApiSuccessResponse } from "@/types";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");
    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");
    const technicianId = searchParams.get("technicianId");
    const search = searchParams.get("search");

    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 100);
    const offset = Math.max(Number(searchParams.get("offset") || 0), 0);

    if (!shopId) {
      throw new ValidationError("Missing required query parameter: 'shopId'");
    }

    await requirePermission(authUser.id, shopId, "service.view");

    const jobs = await prisma.serviceJob.findMany({
      where: {
        shopId,
        ...(status ? { status } : {}),
        ...(customerId ? { customerId } : {}),
        ...(technicianId ? { assignedTechnicianId: technicianId } : {}),
        ...(search
          ? {
              OR: [
                { jobNumber: { contains: search, mode: "insensitive" } },
                { deviceModel: { contains: search, mode: "insensitive" } },
                { deviceBrand: { contains: search, mode: "insensitive" } },
                { customer: { name: { contains: search, mode: "insensitive" } } },
                { customer: { phone: { contains: search } } },
              ],
            }
          : {}),
      },
      include: {
        customer: true,
        assignedTechnician: {
          select: { id: true, fullName: true, email: true },
        },
        diagnostics: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        parts: {
          include: { product: true },
        },
        warranties: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const payload: ApiSuccessResponse<typeof jobs> = {
      data: jobs,
      meta: {
        requestId,
        limit,
        offset,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const idempotencyKey = req.headers.get("idempotency-key") || req.headers.get("Idempotency-Key");
    const body = await req.json().catch(() => ({}));

    const {
      shopId,
      customerId,
      deviceBrand,
      deviceModel,
      deviceImei,
      deviceColor,
      intakeCondition,
      accessoriesReceived,
      reportedIssue,
      promisedDate,
      assignedTechnicianId,
      notes,
    } = body;

    if (!shopId || !customerId || !deviceBrand || !deviceModel || !intakeCondition || !reportedIssue) {
      throw new ValidationError(
        "Missing required fields: 'shopId', 'customerId', 'deviceBrand', 'deviceModel', 'intakeCondition', 'reportedIssue'"
      );
    }

    await requirePermission(authUser.id, shopId, "service.create");

    const result = await executeWithIdempotency({
      shopId,
      idempotencyKey,
      payload: body,
      operation: async () => {
        const job = await createServiceJob({
          shopId,
          customerId,
          deviceBrand,
          deviceModel,
          deviceImei,
          deviceColor,
          intakeCondition,
          accessoriesReceived,
          reportedIssue,
          promisedDate: promisedDate ? new Date(promisedDate) : null,
          assignedTechnicianId,
          intakeCashierId: authUser.id,
          notes,
        });

        return {
          statusCode: 201,
          data: job,
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
