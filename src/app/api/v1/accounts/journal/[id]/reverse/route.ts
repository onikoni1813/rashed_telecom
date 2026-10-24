import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { reverseJournalEntry } from "@/features/accounting/accounting-service";
import { formatErrorResponse } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

const reverseJournalSchema = z.object({
  shopId: z.string().uuid(),
  reason: z.string().min(3, "Reason must be at least 3 characters.").max(300),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { id: journalEntryId } = await params;
    const rawBody = await req.json();
    const payload = reverseJournalSchema.parse(rawBody);

    await requirePermission(authUser.id, payload.shopId, "accounts.view_ledger");

    const reversalEntry = await reverseJournalEntry({
      shopId: payload.shopId,
      journalEntryId,
      reason: payload.reason,
      actorId: authUser.id,
    });

    const response: ApiSuccessResponse<typeof reversalEntry> = {
      data: reversalEntry,
      meta: { requestId },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}
