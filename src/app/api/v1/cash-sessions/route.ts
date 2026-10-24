import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { formatErrorResponse, ValidationError, NotFoundError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

const openSessionSchema = z.object({
  action: z.literal("OPEN"),
  shopId: z.string().uuid(),
  openingCash: z.number().min(0).default(0),
  notes: z.string().max(255).optional().nullable(),
});

const closeSessionSchema = z.object({
  action: z.literal("CLOSE"),
  shopId: z.string().uuid(),
  sessionId: z.string().uuid(),
  closingCashActual: z.number().min(0),
  notes: z.string().max(255).optional().nullable(),
});

const sessionActionSchema = z.discriminatedUnion("action", [
  openSessionSchema,
  closeSessionSchema,
]);

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");

    if (!shopId) {
      throw new ValidationError("Missing required query parameter: 'shopId'");
    }

    await requirePermission(authUser.id, shopId, "sales.view");

    // Fetch active open cash session
    const activeSession = await prisma.cashSession.findFirst({
      where: {
        shopId,
        status: "OPEN",
      },
      include: {
        cashier: {
          select: { id: true, fullName: true, email: true },
        },
        _count: {
          select: { sales: true },
        },
      },
      orderBy: { openingTime: "desc" },
    });

    const payload: ApiSuccessResponse<typeof activeSession> = {
      data: activeSession,
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

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const body = await req.json().catch(() => ({}));
    const parsed = sessionActionSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid session action payload", parsed.error.format());
    }

    await requirePermission(authUser.id, parsed.data.shopId, "sales.create");

    if (parsed.data.action === "OPEN") {
      // Check if session already open
      const existing = await prisma.cashSession.findFirst({
        where: { shopId: parsed.data.shopId, status: "OPEN" },
      });
      if (existing) {
        throw new ValidationError("A cash session is already open for this shop.");
      }

      const session = await prisma.cashSession.create({
        data: {
          shopId: parsed.data.shopId,
          cashierId: authUser.id,
          openingCash: new Prisma.Decimal(parsed.data.openingCash),
          status: "OPEN",
          notes: parsed.data.notes,
        },
      });

      const payload: ApiSuccessResponse<typeof session> = {
        data: session,
        meta: { requestId, timestamp: new Date().toISOString() },
      };
      return NextResponse.json(payload, { status: 201 });
    } else {
      // Close session
      const session = await prisma.cashSession.findUnique({
        where: { id: parsed.data.sessionId },
        include: { sales: true },
      });

      if (!session || session.shopId !== parsed.data.shopId) {
        throw new NotFoundError("Cash session not found.");
      }
      if (session.status === "CLOSED") {
        throw new ValidationError("Cash session is already closed.");
      }

      // Calculate system cash = opening cash + cash sales
      const cashSalesTotal = session.sales.reduce(
        (sum, s) => sum + Number(s.paidAmount),
        0
      );
      const systemCash = Number(session.openingCash) + cashSalesTotal;
      const actualCash = parsed.data.closingCashActual;
      const discrepancy = actualCash - systemCash;

      const closed = await prisma.cashSession.update({
        where: { id: session.id },
        data: {
          status: "CLOSED",
          closingTime: new Date(),
          closingCashSystem: new Prisma.Decimal(systemCash),
          closingCashActual: new Prisma.Decimal(actualCash),
          discrepancy: new Prisma.Decimal(discrepancy),
          notes: parsed.data.notes,
        },
      });

      const payload: ApiSuccessResponse<typeof closed> = {
        data: closed,
        meta: { requestId, timestamp: new Date().toISOString() },
      };
      return NextResponse.json(payload, { status: 200 });
    }
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}
