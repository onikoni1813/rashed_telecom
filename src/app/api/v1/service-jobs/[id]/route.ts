import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requirePermission, assertShopAccess } from "@/lib/auth/guards";
import { formatErrorResponse, ValidationError, NotFoundError } from "@/lib/errors";
import { updateServiceJobStatus, submitDiagnosticEstimate } from "@/features/repairs/repair-service";
import { ApiSuccessResponse } from "@/types";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");

    if (!shopId) {
      throw new ValidationError("Missing required query parameter: 'shopId'");
    }

    await requirePermission(authUser.id, shopId, "service.view");

    const job = await prisma.serviceJob.findUnique({
      where: { id },
      include: {
        customer: true,
        assignedTechnician: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        intakeCashier: {
          select: { id: true, fullName: true, email: true },
        },
        statusHistory: {
          include: {
            changedBy: { select: { id: true, fullName: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        diagnostics: {
          include: {
            technician: { select: { id: true, fullName: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        parts: {
          include: {
            product: true,
            consumedBy: { select: { id: true, fullName: true } },
          },
        },
        warranties: true,
      },
    });

    if (!job || job.shopId !== shopId) {
      throw new NotFoundError("Service job not found or access denied.");
    }

    assertShopAccess(job.shopId, shopId);

    const payload: ApiSuccessResponse<typeof job> = {
      data: job,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { id: jobId } = await params;
    const body = await req.json().catch(() => ({}));

    const {
      shopId,
      status,
      assignedTechnicianId,
      diagnostic,
      notes,
    } = body;

    if (!shopId) {
      throw new ValidationError("Missing required field: 'shopId'");
    }

    await requirePermission(authUser.id, shopId, "service.update");

    let updatedJob;

    // Handle Diagnosis submission if provided
    if (diagnostic) {
      const diagResult = await submitDiagnosticEstimate({
        shopId,
        jobId,
        technicianId: authUser.id,
        diagnosisFindings: diagnostic.diagnosisFindings,
        estimatedLabour: Number(diagnostic.estimatedLabour || 0),
        estimatedParts: Number(diagnostic.estimatedParts || 0),
        customerApproved: diagnostic.customerApproved,
        customerNotes: diagnostic.customerNotes,
      });
      updatedJob = diagResult.job;
    } else if (status) {
      // Handle status update
      updatedJob = await updateServiceJobStatus({
        shopId,
        jobId,
        newStatus: status,
        actorId: authUser.id,
        notes,
      });
    }

    if (assignedTechnicianId !== undefined) {
      updatedJob = await prisma.serviceJob.update({
        where: { id: jobId },
        data: { assignedTechnicianId },
        include: {
          customer: true,
          assignedTechnician: true,
        },
      });
    }

    const payload: ApiSuccessResponse<typeof updatedJob> = {
      data: updatedJob,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}
