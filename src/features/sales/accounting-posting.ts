import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ValidationError } from "@/lib/errors";

export interface JournalLineInput {
  accountCode: string;
  debit?: number | Prisma.Decimal;
  credit?: number | Prisma.Decimal;
  description?: string;
}

export interface PostJournalEntryInput {
  shopId: string;
  sourceType: "SALE" | "PAYMENT" | "SALES_RETURN" | "PURCHASE_RECEIPT" | "EXPENSE";
  sourceId: string;
  entryDate?: Date;
  description: string;
  lines: JournalLineInput[];
}

/**
 * Creates a balanced double-entry journal posting in a PostgreSQL transaction.
 * MANDATORY INVARIANT: SUM(Debits) MUST EXACTLY EQUAL SUM(Credits)!
 */
export async function postJournalEntry(
  input: PostJournalEntryInput,
  tx?: Prisma.TransactionClient
) {
  if (!input.lines || input.lines.length < 2) {
    throw new ValidationError("Journal entry must contain at least two lines.");
  }

  // 1. Strict Balance Invariant Check before hitting database
  let totalDebitNum = 0;
  let totalCreditNum = 0;

  for (const line of input.lines) {
    const debitNum = Number(line.debit || 0);
    const creditNum = Number(line.credit || 0);

    if (debitNum < 0 || creditNum < 0) {
      throw new ValidationError("Debit and credit amounts cannot be negative.");
    }
    if (debitNum > 0 && creditNum > 0) {
      throw new ValidationError("A journal line cannot have both positive debit and credit.");
    }
    if (debitNum === 0 && creditNum === 0) {
      throw new ValidationError("A journal line must have either a positive debit or credit.");
    }

    totalDebitNum += debitNum;
    totalCreditNum += creditNum;
  }

  const diff = Math.abs(Math.round((totalDebitNum - totalCreditNum) * 100) / 100);
  if (diff >= 0.01) {
    throw new ValidationError(
      `Unbalanced journal entry: Debits (${totalDebitNum.toFixed(2)}) do not equal Credits (${totalCreditNum.toFixed(2)}). Difference: ${diff.toFixed(2)}`
    );
  }

  const client = tx || prisma;

  // 2. Fetch account IDs for codes
  const accountCodes = input.lines.map((l) => l.accountCode);
  const accounts = await client.account.findMany({
    where: {
      shopId: input.shopId,
      code: { in: accountCodes },
    },
  });

  const accountMap = new Map<string, string>();
  for (const acc of accounts) {
    accountMap.set(acc.code, acc.id);
  }

  const linesToCreate: Array<{
    accountId: string;
    debit: Prisma.Decimal;
    credit: Prisma.Decimal;
    description?: string;
  }> = [];

  for (const line of input.lines) {
    const accountId = accountMap.get(line.accountCode);
    if (!accountId) {
      throw new ValidationError(
        `Account code '${line.accountCode}' not found in shop chart of accounts.`
      );
    }

    linesToCreate.push({
      accountId,
      debit: new Prisma.Decimal(Number(line.debit || 0)),
      credit: new Prisma.Decimal(Number(line.credit || 0)),
      description: line.description,
    });
  }

  // 3. Validate Closed Accounting Period Invariant
  const entryDate = input.entryDate || new Date();
  if (client.accountingPeriod) {
    const closedPeriod = await client.accountingPeriod.findFirst({
      where: {
        shopId: input.shopId,
        isClosed: true,
        startDate: { lte: entryDate },
        endDate: { gte: entryDate },
      },
    });

    if (closedPeriod) {
      throw new ValidationError(
        `Cannot post journal entry: The accounting period '${closedPeriod.periodName}' is closed.`
      );
    }
  }

  // 4. Persist Entry and Lines
  return await client.journalEntry.create({
    data: {
      shopId: input.shopId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      entryDate,
      description: input.description,
      lines: {
        create: linesToCreate,
      },
    },
    include: {
      lines: true,
    },
  });
}
