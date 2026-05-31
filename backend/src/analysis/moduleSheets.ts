import type {
  BounceEvent,
  CircularFlow,
  LoanPattern,
  MonthMetric,
  NormalizedTransaction,
  RecurringPattern,
} from "./types";
import { groupBy, round, formatDisplayDate } from "./utils";

export type RawSheet = Array<Array<string | number | null>>;

export type MomContextLike = {
  monthKey: string;
  netDebitAmount: number;
  netDebitCount: number;
  netCreditAmount: number;
  netCreditCount: number;
  emiAmount: number;
  loanDisbAmount: number;
  tradeDebitAmount: number;
  tradeCreditAmount: number;
  salaryAmount: number;
};

export type ModuleSheetInput = {
  accountName: string;
  applicantBanks: Array<{ name: string; account: string; ifsc: string; branch: string }>;
  months: MonthMetric[];
  monthLabels: string[];
  monthKeys: string[];
  transactions: NormalizedTransaction[];
  momContextByKey: Map<string, MomContextLike>;
  loans: LoanPattern[];
  bounces: BounceEvent[];
  circular: CircularFlow[];
  internalGroup: Array<{ date: string; party: string; direction: string; amount: number; narration: string }>;
  recurringDebitRaw: RecurringPattern[];
  recurringCreditRaw: RecurringPattern[];
};

function bankNavRow(banks: ModuleSheetInput["applicantBanks"]): RawSheet[0] {
  const bank1 = banks[0];
  const bank2 = banks[1];
  return [
    null,
    null,
    "Consolidated",
    bank1 ? `${bank1.name}-${bank1.account}` : null,
    bank2 ? `${bank2.name}-${bank2.account}` : null,
  ];
}

function accountNavRows(accountName: string, navLabel = "Consolidated"): RawSheet {
  return [
    [accountName, null, null, null, "Index"],
    [navLabel, null, null, null, "Go to top"],
  ];
}

function bankAccountNavRows(input: ModuleSheetInput): RawSheet {
  const rows = bankNavRow(input.applicantBanks);
  return [
    rows,
    [input.accountName, null, null, null, "Index"],
    ["Consolidated", null, null, null, "Go to top"],
  ];
}

function displayDate(value: string): string {
  if (!value || value === "-") return "-";
  if (/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(value)) return value;
  return formatDisplayDate(value);
}

function sum(values: number[]): number {
  return round(values.reduce((acc, value) => acc + value, 0));
}

function getMonthValues(
  months: MonthMetric[],
  monthKeys: string[],
  momContextByKey: Map<string, MomContextLike>,
  picker: (ctx: MomContextLike | undefined, month: MonthMetric) => number,
): number[] {
  return months.map((month) => picker(momContextByKey.get(month.monthKey), month));
}

type PartyAggregate = {
  party: string;
  amount: number;
  count: number;
  monthsActive: number;
  rows: NormalizedTransaction[];
};

function aggregateParties(
  txns: NormalizedTransaction[],
  amountOf: (txn: NormalizedTransaction) => number,
): PartyAggregate[] {
  const grouped = groupBy(txns.filter((txn) => amountOf(txn) > 0), (txn) => txn.party || "Unknown");
  return Object.values(grouped)
    .map((rows) => {
      const amount = rows.reduce((total, txn) => total + amountOf(txn), 0);
      return {
        party: rows[0]?.party || "Unknown",
        amount: round(amount),
        count: rows.length,
        monthsActive: new Set(rows.map((row) => row.monthKey)).size,
        rows,
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

function buildTradePartySheet(
  input: ModuleSheetInput,
  direction: "credit" | "debit",
): RawSheet {
  const sheet: RawSheet = [...bankAccountNavRows(input)];
  const isCredit = direction === "credit";
  const filtered = input.transactions.filter((txn) =>
    isCredit ? txn.credit > 0 && txn.category === "Trade Credit" : txn.debit > 0 && txn.category === "Trade Debit",
  );
  const ranked = aggregateParties(filtered, (txn) => (isCredit ? txn.credit : txn.debit));
  const totalAmount = ranked.reduce((acc, row) => acc + row.amount, 0);

  sheet.push([
    isCredit ? "Party Wise Credits (Rank wise)" : "Party Wise Debits (Rank wise)",
  ]);
  sheet.push([
    "Ranking",
    isCredit ? "TRANSFER From" : "TRANSFER To",
    "AMOUNT",
    isCredit ? "% of Total Trade Receipts" : "% of Total Trade Payments",
    "MONTHLY AVERAGE VALUE",
    "NO. OF MONTHS ACTIVE",
    "AVERAGE AMOUNT PER COUNT",
    "COUNT",
  ]);

  ranked.forEach((row, index) => {
    const pct = totalAmount ? row.amount / totalAmount : 0;
    sheet.push([
      index + 1,
      row.party,
      row.amount,
      round(pct, 4),
      row.monthsActive ? round(row.amount / row.monthsActive) : row.amount,
      row.monthsActive,
      row.count ? round(row.amount / row.count) : row.amount,
      row.count,
    ]);
  });

  if (ranked.length >= 10) {
    const top10 = ranked.slice(0, 10);
    sheet.push([
      null,
      "Sub Total (of Top 10)",
      sum(top10.map((row) => row.amount)),
      totalAmount ? round(sum(top10.map((row) => row.amount)) / totalAmount, 4) : 0,
    ]);
  }

  ranked.slice(0, 25).forEach((row) => {
    sheet.push([]);
    sheet.push([row.party, null, null, row.amount]);
    sheet.push([
      "DATE",
      "Description",
      "Category",
      "Mode Of Transaction",
      isCredit ? "Credit" : "Debit",
      "Bank Name",
      "Account Number",
    ]);
    row.rows
      .slice()
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .forEach((txn) => {
        sheet.push([
          displayDate(txn.dateText),
          txn.narration,
          txn.category,
          txn.mode,
          isCredit ? round(txn.credit) : round(txn.debit),
          txn.bankName,
          txn.accountId,
        ]);
      });
  });

  return sheet;
}

function spendBucket(category: string, narration: string): string {
  const text = `${category} ${narration}`.toUpperCase();
  if (/ELECTRIC|POWER|MSEB|TNEB/.test(text)) return "ELECTRICITY";
  if (/AIRTEL|JIO|VODAFONE|TELEPHONE|MOBILE/.test(text)) return "TELEPHONE";
  if (/FUEL|PETROL|DIESEL/.test(text)) return "FUEL";
  if (/GAS|LPG/.test(text)) return "GAS";
  if (/RENT|LEASE/.test(text)) return "RENT";
  if (/GST|TDS|TAX|PF|ESIC|STATUTORY/.test(text)) return "STATUTORY PAYMENT";
  if (/INSURANCE/.test(text)) return "INSURANCE";
  if (/TRAVEL|FLIGHT|IRCTC/.test(text)) return "TRAVEL";
  if (/FOOD|SWIGGY|ZOMATO/.test(text)) return "FOOD";
  if (/INVEST/.test(text)) return "INVESTMENT";
  if (/CARD/.test(text)) return "CREDIT CARD";
  if (/WALLET|PAYTM|PHONEPE/.test(text)) return "WALLET TRANSFER";
  if (/ECOM|AMAZON|FLIPKART/.test(text)) return "E-COMMERCE";
  if (/HEALTH|MEDICAL|HOSPITAL/.test(text)) return "HEALTH";
  return "OTHER";
}

const SPEND_BUCKETS = [
  "E-COMMERCE",
  "TRAVEL",
  "FOOD",
  "INVESTMENT",
  "INSURANCE",
  "HEALTH",
  "CREDIT CARD",
  "WALLET TRANSFER",
  "TELEPHONE",
  "ELECTRICITY",
  "FUEL",
  "GAS",
  "OTHER",
  "STATUTORY PAYMENT",
] as const;

const BILL_BUCKETS = ["Telephone", "Electricity", "Fuel", "Gas", "Rent", "Other"] as const;

export function buildEmiTrackerSheet(input: ModuleSheetInput): RawSheet {
  const sheet: RawSheet = [...accountNavRows(input.accountName)];
  const emiTxns = input.transactions.filter(
    (txn) => txn.debit > 0 && txn.category === "Loan & EMI",
  );
  const byLender = groupBy(emiTxns, (txn) => `${txn.party}|${txn.accountId}`);

  sheet.push(["EMI"]);
  sheet.push([
    "Name of FI",
    ...input.monthLabels,
    "Bank Name",
    "Account Number",
  ]);

  Object.values(byLender).forEach((rows) => {
    if (!rows.length) return;
    const lender = rows[0].party || "Unknown";
    const monthAmounts = input.monthKeys.map((monthKey) => {
      const monthRows = rows.filter((row) => row.monthKey === monthKey);
      return monthRows.length ? round(monthRows.reduce((total, row) => total + row.debit, 0)) : null;
    });
    sheet.push([
      lender,
      ...monthAmounts,
      rows[0].bankName,
      rows[0].accountId,
    ]);
  });

  return sheet;
}

export function buildTradeCreditsSheet(input: ModuleSheetInput): RawSheet {
  return buildTradePartySheet(input, "credit");
}

export function buildTradeDebitsSheet(input: ModuleSheetInput): RawSheet {
  return buildTradePartySheet(input, "debit");
}

export function buildHighestTnsSheet(input: ModuleSheetInput): RawSheet {
  const sheet: RawSheet = [...bankAccountNavRows(input)];
  const debits = input.transactions
    .filter((txn) => txn.debit > 0)
    .sort((a, b) => b.debit - a.debit)
    .slice(0, 10);
  const credits = input.transactions
    .filter((txn) => txn.credit > 0)
    .sort((a, b) => b.credit - a.credit)
    .slice(0, 10);

  sheet.push([
    "10 Highest Debit Transactions",
    null,
    null,
    null,
    null,
    null,
    null,
    "10 Highest Credit Transactions",
  ]);
  sheet.push([
    "Ranking",
    "DATE",
    "Particulars",
    "Category",
    "Mode Of Transaction",
    "Amount",
    null,
    "Ranking",
    "DATE",
    "Particulars",
    "Category",
    "Mode Of Transaction",
    "Amount",
  ]);

  for (let index = 0; index < 10; index++) {
    const debit = debits[index];
    const credit = credits[index];
    sheet.push([
      debit ? index + 1 : null,
      debit?.dateText ? displayDate(debit.dateText) : null,
      debit?.narration ?? null,
      debit?.category ?? null,
      debit?.mode ?? null,
      debit ? round(debit.debit) : null,
      null,
      credit ? index + 1 : null,
      credit?.dateText ? displayDate(credit.dateText) : null,
      credit?.narration ?? null,
      credit?.category ?? null,
      credit?.mode ?? null,
      credit ? round(credit.credit) : null,
    ]);
  }

  return sheet;
}

export function buildInternalGroupSheet(input: ModuleSheetInput): RawSheet {
  const sheet: RawSheet = [...bankAccountNavRows(input)];
  const debits = aggregateParties(
    input.transactions.filter((txn) => txn.category.includes("Internal") || /INTERNAL|GROUP|TPT/i.test(txn.narration)),
    (txn) => txn.debit,
  );
  const credits = aggregateParties(
    input.transactions.filter((txn) => txn.category.includes("Internal") || /INTERNAL|GROUP|TPT/i.test(txn.narration)),
    (txn) => txn.credit,
  );

  sheet.push([
    null,
    null,
    "Party Wise Internal and Related Party Debits",
    null,
    null,
    null,
    null,
    "Party Wise Internal and Related Party Credits",
  ]);
  sheet.push([
    null,
    null,
    "Name",
    "Amount",
    "Relationship",
    "Related Party Status",
    null,
    "Name",
    "Amount",
    "Relationship",
    "Related Party Status",
  ]);

  const maxRows = Math.max(debits.length, credits.length, 1);
  for (let index = 0; index < maxRows; index++) {
    const debit = debits[index];
    const credit = credits[index];
    sheet.push([
      null,
      null,
      debit?.party ?? null,
      debit?.amount ?? null,
      "Related Party",
      "Trade",
      null,
      credit?.party ?? null,
      credit?.amount ?? null,
      "Related Party",
      "Trade",
    ]);
  }

  sheet.push([]);
  sheet.push(["Internal txn instances"]);
  sheet.push(["SN", "DATE", "Description", "Category", "Mode Of Transaction", "Debit", "Credit"]);

  const instances = input.transactions
    .filter((txn) => txn.category.includes("Internal") || /INTERNAL|GROUP|TPT/i.test(txn.narration))
    .slice(0, 100);

  instances.forEach((txn, index) => {
    sheet.push([
      index + 1,
      displayDate(txn.dateText),
      txn.narration,
      txn.category,
      txn.mode,
      txn.debit > 0 ? round(txn.debit) : null,
      txn.credit > 0 ? round(txn.credit) : null,
    ]);
  });

  return sheet;
}

export function buildCircularSheet(input: ModuleSheetInput): RawSheet {
  const sheet: RawSheet = [...bankAccountNavRows(input)];
  const debitParties = aggregateParties(
    input.transactions.filter((txn) => txn.debit > 0),
    (txn) => txn.debit,
  ).slice(0, 15);
  const creditParties = aggregateParties(
    input.transactions.filter((txn) => txn.credit > 0),
    (txn) => txn.credit,
  ).slice(0, 15);

  sheet.push([
    null,
    null,
    "Party Wise Debit(Circular)",
    null,
    null,
    null,
    "Party Wise Credit(Circular)",
  ]);
  sheet.push([
    null,
    null,
    "Name",
    "Amount",
    "Relationship",
    null,
    "Name",
    "Amount",
    "Relationship",
  ]);

  const maxRows = Math.max(debitParties.length, creditParties.length, 1);
  for (let index = 0; index < maxRows; index++) {
    const debit = debitParties[index];
    const credit = creditParties[index];
    sheet.push([
      null,
      null,
      debit?.party ?? null,
      debit?.amount ?? null,
      "Trade Entity",
      null,
      credit?.party ?? null,
      credit?.amount ?? null,
      "Trade Entity",
    ]);
  }

  sheet.push([]);
  sheet.push(["Circular txn instances"]);
  sheet.push(["SN", "DATE", "Description", "Category", "Mode Of Transaction", "Debit", "Credit"]);

  input.circular.slice(0, 50).forEach((flow, index) => {
    sheet.push([
      index + 1,
      flow.date,
      flow.chain,
      "Circular Flow",
      "OTHER",
      round(flow.amount),
      null,
    ]);
  });

  return sheet;
}

export function buildNetTransactionsSheet(input: ModuleSheetInput): RawSheet {
  const sheet: RawSheet = [...accountNavRows(input.accountName)];

  const debitAmounts = getMonthValues(input.months, input.monthKeys, input.momContextByKey, (_ctx, month) => month.totalDebits);
  const creditAmounts = getMonthValues(input.months, input.monthKeys, input.momContextByKey, (_ctx, month) => month.totalCredits);
  const emiAmounts = getMonthValues(input.months, input.monthKeys, input.momContextByKey, (ctx) => ctx?.emiAmount ?? 0);
  const loanCreditAmounts = getMonthValues(input.months, input.monthKeys, input.momContextByKey, (ctx) => ctx?.loanDisbAmount ?? 0);
  const netDebitAmounts = getMonthValues(input.months, input.monthKeys, input.momContextByKey, (ctx, month) =>
    ctx?.netDebitAmount ?? month.totalDebits,
  );
  const netCreditAmounts = getMonthValues(input.months, input.monthKeys, input.momContextByKey, (ctx, month) =>
    ctx?.netCreditAmount ?? month.totalCredits,
  );

  sheet.push(["Net Debit Amount"]);
  sheet.push(["Particulars", ...input.monthLabels, "TOTAL"]);
  sheet.push(["Amount of Debit Transactions", ...debitAmounts, sum(debitAmounts)]);
  sheet.push(["Less: Amount of Tax Paid", ...input.monthLabels.map(() => null), null]);
  sheet.push(["Less: Amount of EMI / Interest Paid", ...emiAmounts, sum(emiAmounts)]);
  sheet.push(["Less: Amount of Debit Internal Transfers", ...input.monthLabels.map(() => null), null]);
  sheet.push(["Less: Amount of Reversals", ...input.monthLabels.map(() => null), null]);
  sheet.push(["Net Debit Amount", ...netDebitAmounts, sum(netDebitAmounts)]);

  sheet.push([]);
  sheet.push(["Net Credit Amount"]);
  sheet.push(["Particulars", ...input.monthLabels, "TOTAL"]);
  sheet.push(["Amount of Credit Transactions", ...creditAmounts, sum(creditAmounts)]);
  sheet.push(["Less: Amount of Loan Credit", ...loanCreditAmounts, sum(loanCreditAmounts)]);
  sheet.push(["Less: Amount of Credit Internal Transfers", ...input.monthLabels.map(() => null), null]);
  sheet.push(["Less: Amount of Reversals", ...input.monthLabels.map(() => null), null]);
  sheet.push(["Net Credit Amount", ...netCreditAmounts, sum(netCreditAmounts)]);

  return sheet;
}

export function buildSalarySheet(input: ModuleSheetInput): RawSheet {
  const sheet: RawSheet = [...accountNavRows(input.accountName)];
  const salaryTxns = input.transactions.filter((txn) => txn.category === "Salary");

  sheet.push(["Summary of Salary"]);
  sheet.push(["Month-Year", "No of Salary Credit", "Salary Credit", "Probable Salary Credit"]);

  input.months.forEach((month) => {
    const monthRows = salaryTxns.filter((txn) => txn.monthKey === month.monthKey && txn.credit > 0);
    const amount = monthRows.reduce((total, txn) => total + txn.credit, 0);
    sheet.push([month.month, monthRows.length || null, amount || null, null]);
  });

  sheet.push([]);
  sheet.push(["Salary Credit Instances"]);
  sheet.push(["SN", "DATE", "Description", "Amount", "Name", "Bank Name", "Account Number"]);

  salaryTxns
    .filter((txn) => txn.credit > 0)
    .slice(0, 100)
    .forEach((txn, index) => {
      sheet.push([
        index + 1,
        displayDate(txn.dateText),
        txn.narration,
        round(txn.credit),
        txn.party,
        txn.bankName,
        txn.accountId,
      ]);
    });

  return sheet;
}

export function buildStaffEmolumentsSheet(input: ModuleSheetInput): RawSheet {
  const sheet: RawSheet = [...accountNavRows(input.accountName)];
  const salaryDebitTxns = input.transactions.filter(
    (txn) => txn.debit > 0 && (/SALARY|PAYROLL|WAGES/i.test(txn.narration) || txn.category === "Salary"),
  );

  sheet.push(["Summary of Salary Debited"]);
  sheet.push(["Month-Year", "No of Salary Debited", "Amount of Salary Debit"]);

  input.months.forEach((month) => {
    const monthRows = salaryDebitTxns.filter((txn) => txn.monthKey === month.monthKey);
    const amount = monthRows.reduce((total, txn) => total + txn.debit, 0);
    sheet.push([month.month, monthRows.length || null, amount || null]);
  });

  sheet.push([
    "Total",
    salaryDebitTxns.length,
    round(salaryDebitTxns.reduce((total, txn) => total + txn.debit, 0)),
  ]);

  sheet.push([]);
  sheet.push(["Salary Debit Instances"]);
  sheet.push([
    "SN",
    "DATE",
    "Description",
    "Amount",
    "Category",
    "Mode Of Transaction",
    "Name",
    "Bank Name",
    "Account Number",
  ]);

  salaryDebitTxns.slice(0, 100).forEach((txn, index) => {
    sheet.push([
      index + 1,
      displayDate(txn.dateText),
      txn.narration,
      round(txn.debit),
      "Salary Debited",
      txn.mode,
      txn.party,
      txn.bankName,
      txn.accountId,
    ]);
  });

  return sheet;
}

export function buildSpendAnalysisSheet(input: ModuleSheetInput): RawSheet {
  const sheet: RawSheet = [...accountNavRows(input.accountName)];
  const debitTxns = input.transactions.filter((txn) => txn.debit > 0);

  sheet.push(["Summary of Spend Analysis"]);
  sheet.push(["Month-Year", ...SPEND_BUCKETS, "TOTAL"]);

  input.months.forEach((month) => {
    const monthRows = debitTxns.filter((txn) => txn.monthKey === month.monthKey);
    const bucketTotals = Object.fromEntries(SPEND_BUCKETS.map((bucket) => [bucket, 0])) as Record<
      (typeof SPEND_BUCKETS)[number],
      number
    >;

    monthRows.forEach((txn) => {
      const bucket = spendBucket(txn.category, txn.narration);
      bucketTotals[bucket as (typeof SPEND_BUCKETS)[number]] =
        (bucketTotals[bucket as (typeof SPEND_BUCKETS)[number]] || 0) + txn.debit;
    });

    const values = SPEND_BUCKETS.map((bucket) => bucketTotals[bucket] || null);
    sheet.push([month.month, ...values, sum(values.map((value) => value || 0)) || null]);
  });

  return sheet;
}

export function buildBillPaymentsSheet(input: ModuleSheetInput): RawSheet {
  const sheet: RawSheet = [...accountNavRows(input.accountName)];
  const utilityTxns = input.transactions.filter(
    (txn) => txn.debit > 0 && (txn.category === "Utilities" || txn.category === "Rent"),
  );

  sheet.push(["Summary of Utility Bill Payments"]);
  sheet.push(["Particulars", ...BILL_BUCKETS, "Total"]);

  input.months.forEach((month) => {
    const monthRows = utilityTxns.filter((txn) => txn.monthKey === month.monthKey);
    const bucketTotals = Object.fromEntries(BILL_BUCKETS.map((bucket) => [bucket, 0])) as Record<
      (typeof BILL_BUCKETS)[number],
      number
    >;

    monthRows.forEach((txn) => {
      const bucket = spendBucket(txn.category, txn.narration);
      if (bucket === "ELECTRICITY") bucketTotals.Electricity += txn.debit;
      else if (bucket === "TELEPHONE") bucketTotals.Telephone += txn.debit;
      else if (bucket === "FUEL") bucketTotals.Fuel += txn.debit;
      else if (bucket === "GAS") bucketTotals.Gas += txn.debit;
      else if (bucket === "RENT") bucketTotals.Rent += txn.debit;
      else bucketTotals.Other += txn.debit;
    });

    const values = BILL_BUCKETS.map((bucket) => bucketTotals[bucket] || null);
    sheet.push([month.month, ...values, sum(values.map((value) => value || 0)) || null]);
  });

  const totals = BILL_BUCKETS.map((bucket) => {
    return utilityTxns.reduce((total, txn) => {
      const mapped = spendBucket(txn.category, txn.narration);
      if (
        (bucket === "Electricity" && mapped === "ELECTRICITY") ||
        (bucket === "Telephone" && mapped === "TELEPHONE") ||
        (bucket === "Fuel" && mapped === "FUEL") ||
        (bucket === "Gas" && mapped === "GAS") ||
        (bucket === "Rent" && mapped === "RENT") ||
        (bucket === "Other" && !["ELECTRICITY", "TELEPHONE", "FUEL", "GAS", "RENT"].includes(mapped))
      ) {
        return total + txn.debit;
      }
      return total;
    }, 0);
  });

  sheet.push(["Total", ...totals, sum(totals)]);

  sheet.push(["DATE", "Particulars", null, null, null, "Amount", "Bank Name", "Account Number"]);

  const byBucket = groupBy(utilityTxns, (txn) => spendBucket(txn.category, txn.narration));
  Object.entries(byBucket).forEach(([bucket, rows]) => {
    sheet.push([bucket, null, null, null, null, round(rows.reduce((total, txn) => total + txn.debit, 0))]);
    rows.slice(0, 20).forEach((txn) => {
      sheet.push([
        displayDate(txn.dateText),
        txn.narration,
        null,
        null,
        null,
        round(txn.debit),
        txn.bankName,
        txn.accountId,
      ]);
    });
  });

  return sheet;
}

function buildRecurringSheet(
  input: ModuleSheetInput,
  patterns: RecurringPattern[],
  direction: "Debit" | "Credit",
): RawSheet {
  const sheet: RawSheet = [...accountNavRows(input.accountName)];
  sheet.push(["DATE", "Description", "Payment Category", "Amount", "Mode Of Transaction", "Bank Name", "Account Number"]);

  patterns.forEach((pattern) => {
    const txns = input.transactions.filter((txn) => {
      const amount = direction === "Debit" ? txn.debit : txn.credit;
      return amount > 0 && (txn.party === pattern.name || txn.narration.includes(pattern.name));
    });

    sheet.push([
      pattern.name,
      null,
      null,
      round(pattern.avgAmount * pattern.occurrences),
    ]);

    txns.slice(0, 30).forEach((txn) => {
      sheet.push([
        displayDate(txn.dateText),
        txn.narration,
        txn.category,
        direction === "Debit" ? round(txn.debit) : round(txn.credit),
        txn.mode,
        txn.bankName,
        txn.accountId,
      ]);
    });
  });

  return sheet;
}

export function buildRecurringDebitSheet(input: ModuleSheetInput): RawSheet {
  return buildRecurringSheet(input, input.recurringDebitRaw, "Debit");
}

export function buildRecurringCreditSheet(input: ModuleSheetInput): RawSheet {
  return buildRecurringSheet(input, input.recurringCreditRaw, "Credit");
}

export function buildAllModuleSheets(input: ModuleSheetInput) {
  return {
    emiTrackerSheet: buildEmiTrackerSheet(input),
    tradeCreditsSheet: buildTradeCreditsSheet(input),
    tradeDebitsSheet: buildTradeDebitsSheet(input),
    highestTnsSheet: buildHighestTnsSheet(input),
    internalGroupSheet: buildInternalGroupSheet(input),
    circularSheet: buildCircularSheet(input),
    netTransactionsSheet: buildNetTransactionsSheet(input),
    salarySheet: buildSalarySheet(input),
    staffEmolumentsSheet: buildStaffEmolumentsSheet(input),
    spendAnalysisSheet: buildSpendAnalysisSheet(input),
    billPaymentsSheet: buildBillPaymentsSheet(input),
    recurringDebitSheet: buildRecurringDebitSheet(input),
    recurringCreditSheet: buildRecurringCreditSheet(input),
  };
}
