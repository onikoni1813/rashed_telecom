import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { postJournalEntry } from "@/features/sales/accounting-posting";
import { recordAuditLog } from "@/lib/audit/service";

// ==============================================================================
// 1. EXPENSE RECORDING
// ==============================================================================

export interface RecordExpenseInput {
  shopId: string;
  categoryId: string;
  accountCode?: string; // Default: category code or "6200"
  paymentMethod: "CASH" | "BANK" | "BKASH" | "NAGAD";
  amount: number;
  expenseDate?: Date;
  payee?: string | null;
  receiptRef?: string | null;
  notes?: string | null;
  recordedById: string;
}

export async function recordExpense(input: RecordExpenseInput) {
  if (input.amount <= 0) {
    throw new ValidationError("Expense amount must be greater than zero.");
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Verify Category
    const category = await tx.expenseCategory.findUnique({
      where: { id: input.categoryId },
    });

    if (!category || category.shopId !== input.shopId) {
      throw new NotFoundError("Expense category not found or does not belong to this shop.");
    }

    const expenseCode = input.accountCode || category.code || "6200";

    // 2. Fetch GL Account for Expense
    const expenseAccount = await tx.account.findUnique({
      where: { shopId_code: { shopId: input.shopId, code: expenseCode } },
    });

    if (!expenseAccount) {
      throw new NotFoundError(`GL Expense account '${expenseCode}' not found.`);
    }

    // 3. Generate Sequential Expense Number
    const count = await tx.expense.count({ where: { shopId: input.shopId } });
    const expenseNumber = `EXP-${String(count + 1).padStart(6, "0")}`;

    // 4. Create Expense Record
    const expense = await tx.expense.create({
      data: {
        shopId: input.shopId,
        expenseNumber,
        categoryId: category.id,
        accountId: expenseAccount.id,
        paymentMethod: input.paymentMethod,
        amount: new Prisma.Decimal(input.amount),
        expenseDate: input.expenseDate || new Date(),
        payee: input.payee || null,
        receiptRef: input.receiptRef || null,
        notes: input.notes || null,
        recordedById: input.recordedById,
      },
      include: {
        category: true,
        account: true,
      },
    });

    // 5. Post Balanced Double-Entry Journal:
    // Debit: Expense Account (e.g. 6000 Rent, 6200 Other Operating Expenses)
    // Credit: Cash on Hand (1000) or Bank/MFS (1010)
    const paymentAccountCode = input.paymentMethod === "CASH" ? "1000" : "1010";

    await postJournalEntry(
      {
        shopId: input.shopId,
        sourceType: "EXPENSE",
        sourceId: expense.id,
        description: `Expense ${expenseNumber} (${category.name}) - ${input.payee || "General"}`,
        lines: [
          {
            accountCode: expenseCode,
            debit: input.amount,
            description: `Expense for ${category.name}`,
          },
          {
            accountCode: paymentAccountCode,
            credit: input.amount,
            description: `Paid via ${input.paymentMethod}`,
          },
        ],
      },
      tx
    );

    // 6. Audit Log
    await recordAuditLog({
      shopId: input.shopId,
      actorId: input.recordedById,
      action: "expense.create",
      entityType: "Expense",
      entityId: expense.id,
      reason: `Recorded expense ${expenseNumber}: ৳${input.amount} for ${category.name}`,
      afterState: {
        expenseNumber,
        category: category.name,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
      },
    });

    return expense;
  });
}

// ==============================================================================
// 2. CUSTOMER DUE SETTLEMENT
// Mandatory Rule: "A customer due collection is not new revenue."
// ==============================================================================

export interface CollectCustomerDueInput {
  shopId: string;
  customerId: string;
  amount: number;
  paymentMethod: "CASH" | "BANK" | "BKASH" | "NAGAD";
  referenceNumber?: string | null;
  collectedById: string;
  notes?: string | null;
}

export async function collectCustomerDue(input: CollectCustomerDueInput) {
  if (input.amount <= 0) {
    throw new ValidationError("Collection amount must be greater than zero.");
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Verify Customer
    const customer = await tx.customer.findUnique({
      where: { id: input.customerId },
    });

    if (!customer || customer.shopId !== input.shopId) {
      throw new NotFoundError("Customer not found.");
    }

    const currentDue = Number(customer.totalDue);
    if (input.amount > currentDue) {
      throw new ValidationError(
        `Settlement amount (৳${input.amount}) cannot exceed outstanding customer due (৳${currentDue}).`
      );
    }

    // 2. Create Payment Record
    const payCount = await tx.payment.count({ where: { shopId: input.shopId } });
    const paymentNumber = `PAY-${String(payCount + 1).padStart(6, "0")}`;

    const payment = await tx.payment.create({
      data: {
        shopId: input.shopId,
        paymentNumber,
        customerId: customer.id,
        amount: new Prisma.Decimal(input.amount),
        paymentMethod: input.paymentMethod,
        referenceNumber: input.referenceNumber || null,
        receivedBy: input.collectedById,
      },
    });

    // 3. Decrement Customer Total Due
    const updatedCustomer = await tx.customer.update({
      where: { id: customer.id },
      data: {
        totalDue: {
          decrement: new Prisma.Decimal(input.amount),
        },
      },
    });

    // 4. Balanced Journal Entry:
    // Debit: Cash (1000) or Bank/MFS (1010)
    // Credit: Accounts Receivable (1100) — NOT revenue!
    const paymentAccountCode = input.paymentMethod === "CASH" ? "1000" : "1010";

    await postJournalEntry(
      {
        shopId: input.shopId,
        sourceType: "PAYMENT",
        sourceId: payment.id,
        description: `Customer Due Collection from ${customer.name} (${paymentNumber})`,
        lines: [
          {
            accountCode: paymentAccountCode,
            debit: input.amount,
            description: `Cash/MFS received from ${customer.name}`,
          },
          {
            accountCode: "1100", // Accounts Receivable
            credit: input.amount,
            description: `Receivable settlement for ${customer.name}`,
          },
        ],
      },
      tx
    );

    // 5. Audit Log
    await recordAuditLog({
      shopId: input.shopId,
      actorId: input.collectedById,
      action: "customer.collect_due",
      entityType: "Payment",
      entityId: payment.id,
      reason: `Collected ৳${input.amount} due from ${customer.name}`,
      afterState: {
        paymentNumber,
        customer: customer.name,
        amount: input.amount,
        remainingDue: currentDue - input.amount,
      },
    });

    return { payment, updatedCustomer, remainingDue: currentDue - input.amount };
  });
}

// ==============================================================================
// 3. SUPPLIER PAYABLE SETTLEMENT
// Mandatory Rule: "A supplier payment is not a second purchase expense."
// ==============================================================================

export interface PaySupplierInput {
  shopId: string;
  supplierId: string;
  amount: number;
  paymentMethod: "CASH" | "BANK" | "BKASH" | "NAGAD";
  referenceNumber?: string | null;
  paidById: string;
  notes?: string | null;
}

export async function paySupplier(input: PaySupplierInput) {
  if (input.amount <= 0) {
    throw new ValidationError("Payment amount must be greater than zero.");
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Verify Supplier
    const supplier = await tx.supplier.findUnique({
      where: { id: input.supplierId },
    });

    if (!supplier || supplier.shopId !== input.shopId) {
      throw new NotFoundError("Supplier not found.");
    }

    const currentPayable = Number(supplier.payableBalance);
    if (input.amount > currentPayable) {
      throw new ValidationError(
        `Payment amount (৳${input.amount}) cannot exceed outstanding payable balance (৳${currentPayable}).`
      );
    }

    // 2. Decrement Supplier Payable Balance
    const updatedSupplier = await tx.supplier.update({
      where: { id: supplier.id },
      data: {
        payableBalance: {
          decrement: new Prisma.Decimal(input.amount),
        },
      },
    });

    // 3. Balanced Journal Entry:
    // Debit: Accounts Payable (2000)
    // Credit: Cash (1000) or Bank/MFS (1010) — NOT a second expense!
    const paymentAccountCode = input.paymentMethod === "CASH" ? "1000" : "1010";

    await postJournalEntry(
      {
        shopId: input.shopId,
        sourceType: "PAYMENT",
        sourceId: supplier.id,
        description: `Supplier payment to ${supplier.name}`,
        lines: [
          {
            accountCode: "2000", // Accounts Payable
            debit: input.amount,
            description: `Payable settlement to ${supplier.name}`,
          },
          {
            accountCode: paymentAccountCode,
            credit: input.amount,
            description: `Disbursed via ${input.paymentMethod}`,
          },
        ],
      },
      tx
    );

    // 4. Audit Log
    await recordAuditLog({
      shopId: input.shopId,
      actorId: input.paidById,
      action: "supplier.pay",
      entityType: "Supplier",
      entityId: supplier.id,
      reason: `Paid ৳${input.amount} to supplier ${supplier.name}`,
      afterState: {
        supplier: supplier.name,
        amount: input.amount,
        remainingPayable: currentPayable - input.amount,
      },
    });

    return { updatedSupplier, remainingPayable: currentPayable - input.amount };
  });
}

// ==============================================================================
// 4. OWNER TRANSACTIONS (Capital Injection & Drawings)
// Mandatory Rule: "Owner drawings are not operating expenses."
// ==============================================================================

export interface OwnerTransactionInput {
  shopId: string;
  type: "INJECTION" | "DRAWING";
  amount: number;
  paymentMethod: "CASH" | "BANK" | "BKASH" | "NAGAD";
  referenceNumber?: string | null;
  notes?: string | null;
  actorId: string;
}

export async function recordOwnerTransaction(input: OwnerTransactionInput) {
  if (input.amount <= 0) {
    throw new ValidationError("Amount must be greater than zero.");
  }

  return await prisma.$transaction(async (tx) => {
    const paymentAccountCode = input.paymentMethod === "CASH" ? "1000" : "1010";
    const journalLines: Array<{ accountCode: string; debit?: number; credit?: number; description?: string }> = [];

    if (input.type === "INJECTION") {
      // Capital Injection: Debit Cash/Bank, Credit Owner Capital (3000)
      journalLines.push(
        {
          accountCode: paymentAccountCode,
          debit: input.amount,
          description: `Owner capital injected via ${input.paymentMethod}`,
        },
        {
          accountCode: "3000", // Owner Capital
          credit: input.amount,
          description: `Capital addition by shop owner`,
        }
      );
    } else {
      // Drawing / Withdrawal: Debit Owner Drawings (3100), Credit Cash/Bank
      journalLines.push(
        {
          accountCode: "3100", // Owner Drawings
          debit: input.amount,
          description: `Personal withdrawal by shop owner`,
        },
        {
          accountCode: paymentAccountCode,
          credit: input.amount,
          description: `Disbursed via ${input.paymentMethod}`,
        }
      );
    }

    const entry = await postJournalEntry(
      {
        shopId: input.shopId,
        sourceType: input.type === "INJECTION" ? "SALE" : "EXPENSE",
        sourceId: crypto.randomUUID(),
        description: input.type === "INJECTION" ? "Owner Capital Injection" : "Owner Personal Drawing",
        lines: journalLines,
      },
      tx
    );

    await recordAuditLog({
      shopId: input.shopId,
      actorId: input.actorId,
      action: input.type === "INJECTION" ? "owner.capital_injection" : "owner.drawing",
      entityType: "JournalEntry",
      entityId: entry.id,
      reason: `${input.type === "INJECTION" ? "Capital Injection" : "Owner Drawing"}: ৳${input.amount}`,
      afterState: {
        type: input.type,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
      },
    });

    return entry;
  });
}

// ==============================================================================
// 5. TRIAL BALANCE REPORT
// Mandatory Rule: "Trial balance must balance (Debits === Credits)."
// ==============================================================================

export async function getTrialBalance(shopId: string, asOfDate?: Date) {
  const accounts = await prisma.account.findMany({
    where: { shopId, isActive: true },
    include: {
      journalLines: {
        where: asOfDate
          ? {
              journalEntry: {
                entryDate: { lte: asOfDate },
              },
            }
          : undefined,
      },
    },
    orderBy: { code: "asc" },
  });

  let totalDebits = 0;
  let totalCredits = 0;

  const rows = accounts.map((acc) => {
    let debits = 0;
    let credits = 0;

    for (const line of acc.journalLines) {
      debits += Number(line.debit);
      credits += Number(line.credit);
    }

    totalDebits += debits;
    totalCredits += credits;

    // Normal balance
    let netBalance = 0;
    if (acc.type === "ASSET" || acc.type === "EXPENSE") {
      netBalance = debits - credits;
    } else {
      netBalance = credits - debits;
    }

    return {
      id: acc.id,
      code: acc.code,
      name: acc.name,
      type: acc.type,
      totalDebit: debits,
      totalCredit: credits,
      netBalance,
    };
  });

  const diff = Math.abs(Math.round((totalDebits - totalCredits) * 100) / 100);
  const isBalanced = diff < 0.01;

  return {
    rows,
    totalDebits,
    totalCredits,
    diff,
    isBalanced,
    asOfDate: asOfDate ? asOfDate.toISOString() : new Date().toISOString(),
  };
}

// ==============================================================================
// 6. PROFIT & LOSS STATEMENT (P&L)
// Revenue (Product Sales + Service) - Direct Costs (COGS + Direct Service) = Gross Profit
// Gross Profit - Operating Expenses = Net Profit
// ==============================================================================

export async function getProfitAndLoss(shopId: string, startDate?: Date, endDate?: Date) {
  const accounts = await prisma.account.findMany({
    where: { shopId },
    include: {
      journalLines: {
        where: {
          journalEntry: {
            ...(startDate || endDate
              ? {
                  entryDate: {
                    ...(startDate ? { gte: startDate } : {}),
                    ...(endDate ? { lte: endDate } : {}),
                  },
                }
              : {}),
          },
        },
      },
    },
    orderBy: { code: "asc" },
  });

  let productSalesRevenue = 0;
  let serviceRevenue = 0;
  let cogs = 0;
  let directServiceCosts = 0;
  let rentUtilities = 0;
  let salariesCommissions = 0;
  let otherOperatingExpenses = 0;

  for (const acc of accounts) {
    let totalDebit = 0;
    let totalCredit = 0;
    for (const l of acc.journalLines) {
      totalDebit += Number(l.debit);
      totalCredit += Number(l.credit);
    }

    if (acc.code === "4000") productSalesRevenue = totalCredit - totalDebit;
    else if (acc.code === "4100") serviceRevenue = totalCredit - totalDebit;
    else if (acc.code === "5000") cogs = totalDebit - totalCredit;
    else if (acc.code === "5100") directServiceCosts = totalDebit - totalCredit;
    else if (acc.code === "6000") rentUtilities = totalDebit - totalCredit;
    else if (acc.code === "6100") salariesCommissions = totalDebit - totalCredit;
    else if (acc.code === "6200") otherOperatingExpenses = totalDebit - totalCredit;
  }

  const totalRevenue = productSalesRevenue + serviceRevenue;
  const totalDirectCosts = cogs + directServiceCosts;
  const grossProfit = totalRevenue - totalDirectCosts;
  const totalOperatingExpenses = rentUtilities + salariesCommissions + otherOperatingExpenses;
  const netProfit = grossProfit - totalOperatingExpenses;

  return {
    revenue: {
      productSales: productSalesRevenue,
      serviceRevenue,
      totalRevenue,
    },
    directCosts: {
      cogs,
      directServiceCosts,
      totalDirectCosts,
    },
    grossProfit,
    operatingExpenses: {
      rentUtilities,
      salariesCommissions,
      otherOperatingExpenses,
      totalOperatingExpenses,
    },
    netProfit,
    startDate: startDate ? startDate.toISOString() : null,
    endDate: endDate ? endDate.toISOString() : new Date().toISOString(),
  };
}

// ==============================================================================
// 7. CASHBOOK REPORT (Cash on Hand & Bank/MFS Ledger)
// ==============================================================================

export async function getCashbook(shopId: string, limit: number = 50) {
  const accounts = await prisma.account.findMany({
    where: {
      shopId,
      code: { in: ["1000", "1010"] },
    },
    include: {
      journalLines: {
        include: {
          journalEntry: true,
        },
        orderBy: {
          journalEntry: { entryDate: "desc" },
        },
        take: limit,
      },
    },
  });

  const cashAccount = accounts.find((a) => a.code === "1000");
  const bankAccount = accounts.find((a) => a.code === "1010");

  let cashBalance = 0;
  if (cashAccount) {
    const allCashLines = await prisma.journalLine.findMany({
      where: { accountId: cashAccount.id },
    });
    cashBalance = allCashLines.reduce((sum, l) => sum + Number(l.debit) - Number(l.credit), 0);
  }

  let bankBalance = 0;
  if (bankAccount) {
    const allBankLines = await prisma.journalLine.findMany({
      where: { accountId: bankAccount.id },
    });
    bankBalance = allBankLines.reduce((sum, l) => sum + Number(l.debit) - Number(l.credit), 0);
  }

  return {
    cashBalance,
    bankBalance,
    totalLiquidFunds: cashBalance + bankBalance,
    cashLines: (cashAccount?.journalLines || []).map((l) => ({
      id: l.id,
      date: l.journalEntry.entryDate.toISOString(),
      sourceType: l.journalEntry.sourceType,
      description: l.description || l.journalEntry.description,
      debit: Number(l.debit),
      credit: Number(l.credit),
    })),
    bankLines: (bankAccount?.journalLines || []).map((l) => ({
      id: l.id,
      date: l.journalEntry.entryDate.toISOString(),
      sourceType: l.journalEntry.sourceType,
      description: l.description || l.journalEntry.description,
      debit: Number(l.debit),
      credit: Number(l.credit),
    })),
  };
}

// ==============================================================================
// 8. LOAN TRANSACTIONS (DISBURSEMENT & REPAYMENT)
// Mandatory Rule: "Loan principal repayment is not interest expense."
// ==============================================================================

export interface RecordLoanTransactionInput {
  shopId: string;
  type: "DISBURSEMENT" | "REPAYMENT";
  principalAmount: number;
  interestAmount?: number;
  paymentMethod: "CASH" | "BANK" | "BKASH" | "NAGAD";
  lenderName: string;
  referenceNumber?: string | null;
  notes?: string | null;
  actorId: string;
}

export async function recordLoanTransaction(input: RecordLoanTransactionInput) {
  if (input.principalAmount <= 0) {
    throw new ValidationError("Principal amount must be greater than zero.");
  }
  const interest = Number(input.interestAmount || 0);
  if (interest < 0) {
    throw new ValidationError("Interest amount cannot be negative.");
  }

  return await prisma.$transaction(async (tx) => {
    const paymentAccountCode = input.paymentMethod === "CASH" ? "1000" : "1010";
    const journalLines: Array<{ accountCode: string; debit?: number; credit?: number; description?: string }> = [];

    if (input.type === "DISBURSEMENT") {
      // Loan received: Debit Cash/Bank, Credit Loans Payable (2200)
      journalLines.push(
        {
          accountCode: paymentAccountCode,
          debit: input.principalAmount,
          description: `Loan received from ${input.lenderName}`,
        },
        {
          accountCode: "2200", // Loans Payable
          credit: input.principalAmount,
          description: `Liability to ${input.lenderName}`,
        }
      );
    } else {
      // Loan Repayment:
      // Debit: Loans Payable (2200) for Principal
      // Debit: Interest Expense (6300) for Interest (if any)
      // Credit: Cash/Bank for Total Disbursed
      // This strictly enforces: Loan principal is NOT interest expense!
      journalLines.push({
        accountCode: "2200",
        debit: input.principalAmount,
        description: `Loan principal repayment to ${input.lenderName}`,
      });

      if (interest > 0) {
        journalLines.push({
          accountCode: "6300", // Interest Expense
          debit: interest,
          description: `Loan interest expense to ${input.lenderName}`,
        });
      }

      const totalDisbursed = input.principalAmount + interest;
      journalLines.push({
        accountCode: paymentAccountCode,
        credit: totalDisbursed,
        description: `Total loan payment via ${input.paymentMethod}`,
      });
    }

    const entry = await postJournalEntry(
      {
        shopId: input.shopId,
        sourceType: "PAYMENT",
        sourceId: crypto.randomUUID(),
        description:
          input.type === "DISBURSEMENT"
            ? `Loan Received - ${input.lenderName}`
            : `Loan Repayment - ${input.lenderName} (Principal: ৳${input.principalAmount}, Interest: ৳${interest})`,
        lines: journalLines,
      },
      tx
    );

    await recordAuditLog({
      shopId: input.shopId,
      actorId: input.actorId,
      action: input.type === "DISBURSEMENT" ? "loan.disbursement" : "loan.repayment",
      entityType: "JournalEntry",
      entityId: entry.id,
      reason: `${input.type === "DISBURSEMENT" ? "Disbursed" : "Repaid"} loan for ${input.lenderName}`,
      afterState: {
        type: input.type,
        lenderName: input.lenderName,
        principalAmount: input.principalAmount,
        interestAmount: interest,
        paymentMethod: input.paymentMethod,
      },
    });

    return entry;
  });
}

// ==============================================================================
// 9. JOURNAL ENTRY REVERSAL WORKFLOW
// Mandatory Rule: "Posted transactions cannot be silently edited/deleted; use reversal and correction entries."
// ==============================================================================

export interface ReverseJournalEntryInput {
  shopId: string;
  journalEntryId: string;
  reason: string;
  actorId: string;
}

export async function reverseJournalEntry(input: ReverseJournalEntryInput) {
  if (!input.reason || input.reason.trim().length === 0) {
    throw new ValidationError("A reason must be provided for reversing a journal entry.");
  }

  return await prisma.$transaction(async (tx) => {
    const originalEntry = await tx.journalEntry.findUnique({
      where: { id: input.journalEntryId },
      include: {
        lines: {
          include: { account: true },
        },
      },
    });

    if (!originalEntry || originalEntry.shopId !== input.shopId) {
      throw new NotFoundError("Journal entry not found.");
    }

    if (originalEntry.description && originalEntry.description.startsWith("[REVERSED]")) {
      throw new ValidationError("This journal entry has already been reversed.");
    }

    // Invert every debit and credit exactly
    const reversalLines = originalEntry.lines.map((l) => ({
      accountCode: l.account.code,
      debit: Number(l.credit),
      credit: Number(l.debit),
      description: `Reversal of Line #${l.id}: ${l.description || ""}`,
    }));

    const validSourceTypes = ["SALE", "PAYMENT", "SALES_RETURN", "PURCHASE_RECEIPT", "EXPENSE"] as const;
    const sourceType = validSourceTypes.includes(originalEntry.sourceType as any)
      ? (originalEntry.sourceType as (typeof validSourceTypes)[number])
      : "EXPENSE";

    const reversalEntry = await postJournalEntry(
      {
        shopId: input.shopId,
        sourceType,
        sourceId: originalEntry.sourceId,
        description: `[REVERSAL] Reversal of Entry ${originalEntry.id}. Reason: ${input.reason}`,
        lines: reversalLines,
      },
      tx
    );

    // Mark original entry description
    await tx.journalEntry.update({
      where: { id: originalEntry.id },
      data: {
        description: `[REVERSED] ${originalEntry.description} (Reversed by ${reversalEntry.id})`,
      },
    });

    await recordAuditLog({
      shopId: input.shopId,
      actorId: input.actorId,
      action: "journal.reverse",
      entityType: "JournalEntry",
      entityId: reversalEntry.id,
      reason: `Reversed journal entry ${originalEntry.id}: ${input.reason}`,
      afterState: {
        originalEntryId: originalEntry.id,
        reversalEntryId: reversalEntry.id,
      },
    });

    return reversalEntry;
  });
}

// ==============================================================================
// 10. ACCOUNTING PERIOD CONTROLS
// Mandatory Rule: "Closing an accounting period restricts backdated posting and requires an explicit controlled adjustment workflow."
// ==============================================================================

export async function createAccountingPeriod(params: {
  shopId: string;
  periodName: string;
  startDate: Date;
  endDate: Date;
}) {
  return await prisma.accountingPeriod.create({
    data: {
      shopId: params.shopId,
      periodName: params.periodName,
      startDate: params.startDate,
      endDate: params.endDate,
    },
  });
}

export async function closeAccountingPeriod(params: {
  shopId: string;
  periodId: string;
  closedById: string;
}) {
  const period = await prisma.accountingPeriod.findUnique({
    where: { id: params.periodId },
  });

  if (!period || period.shopId !== params.shopId) {
    throw new NotFoundError("Accounting period not found.");
  }

  if (period.isClosed) {
    throw new ValidationError(`Accounting period '${period.periodName}' is already closed.`);
  }

  const updated = await prisma.accountingPeriod.update({
    where: { id: period.id },
    data: {
      isClosed: true,
      closedAt: new Date(),
      closedById: params.closedById,
    },
  });

  await recordAuditLog({
    shopId: params.shopId,
    actorId: params.closedById,
    action: "accounting_period.close",
    entityType: "AccountingPeriod",
    entityId: period.id,
    reason: `Closed accounting period '${period.periodName}'`,
    afterState: { periodName: period.periodName, isClosed: true },
  });

  return updated;
}

export async function getAccountingPeriods(shopId: string) {
  return await prisma.accountingPeriod.findMany({
    where: { shopId },
    orderBy: { startDate: "desc" },
    include: {
      closedBy: { select: { id: true, fullName: true, email: true } },
    },
  });
}

// ==============================================================================
// 11. BALANCE SHEET
// Assets = Liabilities + Equity
// ==============================================================================

export async function getBalanceSheet(shopId: string, asOfDate?: Date) {
  const trialBalance = await getTrialBalance(shopId, asOfDate);
  const pnl = await getProfitAndLoss(shopId, undefined, asOfDate);

  // Group accounts
  let cashOnHand = 0;
  let bankMFS = 0;
  let accountsReceivable = 0;
  let inventory = 0;
  let accountsPayable = 0;
  let customerAdvances = 0;
  let loansPayable = 0;
  let ownerCapital = 0;
  let ownerDrawings = 0;

  for (const r of trialBalance.rows) {
    if (r.code === "1000") cashOnHand = r.netBalance;
    else if (r.code === "1010") bankMFS = r.netBalance;
    else if (r.code === "1100") accountsReceivable = r.netBalance;
    else if (r.code === "1200") inventory = r.netBalance;
    else if (r.code === "2000") accountsPayable = r.netBalance;
    else if (r.code === "2100") customerAdvances = r.netBalance;
    else if (r.code === "2200") loansPayable = r.netBalance;
    else if (r.code === "3000") ownerCapital = r.netBalance;
    else if (r.code === "3100") ownerDrawings = r.totalDebit - r.totalCredit;
  }

  const totalCurrentAssets = cashOnHand + bankMFS + accountsReceivable + inventory;
  const totalAssets = totalCurrentAssets;

  const totalLiabilities = accountsPayable + customerAdvances + loansPayable;
  const netProfit = pnl.netProfit;
  const totalEquity = ownerCapital - ownerDrawings + netProfit;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  const difference = Math.abs(Math.round((totalAssets - totalLiabilitiesAndEquity) * 100) / 100);
  const isBalanced = difference < 0.05;

  return {
    asOfDate: asOfDate ? asOfDate.toISOString() : new Date().toISOString(),
    assets: {
      cashOnHand,
      bankMFS,
      accountsReceivable,
      inventory,
      totalAssets,
    },
    liabilities: {
      accountsPayable,
      customerAdvances,
      loansPayable,
      totalLiabilities,
    },
    equity: {
      ownerCapital,
      ownerDrawings,
      retainedEarnings: netProfit,
      totalEquity,
    },
    totalLiabilitiesAndEquity,
    difference,
    isBalanced,
  };
}

// ==============================================================================
// 12. RECONCILIATION SUMMARY
// Reconciles subledgers with General Ledger accounts
// ==============================================================================

export async function getReconciliationSummary(shopId: string) {
  // 1. Stock Valuation Subledger
  const stockBalances = await prisma.stockBalance.findMany({
    where: { shopId },
    include: { product: true },
  });

  let subledgerStockValuation = 0;
  for (const sb of stockBalances) {
    const qty = Number(sb.quantityOnHand);
    const cost = Number(sb.product.costPrice);
    subledgerStockValuation += qty * cost;
  }

  // 2. Customer Receivables Subledger
  const customers = await prisma.customer.findMany({
    where: { shopId },
  });
  const subledgerCustomerDues = customers.reduce((sum, c) => sum + Number(c.totalDue), 0);

  // 3. Supplier Payables Subledger
  const suppliers = await prisma.supplier.findMany({
    where: { shopId },
  });
  const subledgerSupplierPayables = suppliers.reduce((sum, s) => sum + Number(s.payableBalance), 0);

  // 4. General Ledger Accounts
  const accounts = await prisma.account.findMany({
    where: { shopId, code: { in: ["1000", "1010", "1100", "1200", "2000"] } },
    include: { journalLines: true },
  });

  const getGLBalance = (code: string, isAsset: boolean) => {
    const acc = accounts.find((a) => a.code === code);
    if (!acc) return 0;
    const debits = acc.journalLines.reduce((s, l) => s + Number(l.debit), 0);
    const credits = acc.journalLines.reduce((s, l) => s + Number(l.credit), 0);
    return isAsset ? debits - credits : credits - debits;
  };

  const glInventory = getGLBalance("1200", true);
  const glReceivables = getGLBalance("1100", true);
  const glPayables = getGLBalance("2000", false);
  const glCash = getGLBalance("1000", true);
  const glBank = getGLBalance("1010", true);

  return {
    inventory: {
      subledgerValue: subledgerStockValuation,
      glAccountValue: glInventory,
      difference: Math.abs(subledgerStockValuation - glInventory),
      isReconciled: Math.abs(subledgerStockValuation - glInventory) < 1.0,
    },
    receivables: {
      subledgerValue: subledgerCustomerDues,
      glAccountValue: glReceivables,
      difference: Math.abs(subledgerCustomerDues - glReceivables),
      isReconciled: Math.abs(subledgerCustomerDues - glReceivables) < 0.05,
    },
    payables: {
      subledgerValue: subledgerSupplierPayables,
      glAccountValue: glPayables,
      difference: Math.abs(subledgerSupplierPayables - glPayables),
      isReconciled: Math.abs(subledgerSupplierPayables - glPayables) < 0.05,
    },
    cashAndBank: {
      glCash,
      glBank,
      totalLiquid: glCash + glBank,
    },
  };
}
