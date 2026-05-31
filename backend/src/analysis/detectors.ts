import type { BounceEvent, CircularFlow, LoanPattern, NormalizedTransaction, RecurringPattern, TransactionDirection } from "./types";
import { groupBy, round } from "./utils";

export function detectBounces(transactions: NormalizedTransaction[]): BounceEvent[] {
  return transactions
    .filter((txn) => /\bBOUNCE|RETURN|INSUFFICIENT|I\/W|O\/W|CHEQUE RET|ECS RET|NACH RET/i.test(txn.narration))
    .map((txn) => {
      const narration = txn.narration;
      const isInward = /I\/W|INWARD\b/i.test(narration);
      const isOutward = /O\/W|OUTWARD\b/i.test(narration);

      const direction: BounceEvent["direction"] = isInward ? "Inward" : isOutward ? "Outward" : "Unknown";

      return {
        date: txn.dateText,
        monthKey: txn.monthKey,
        type: /EMI|ECS|NACH/i.test(narration) ? "EMI Bounce" : /CHQ|CHEQUE/i.test(narration) ? "Cheque Return" : "Return / Bounce",
        party: txn.party,
        amount: txn.amount,
        reason: /INSUFFICIENT/i.test(narration) ? "Insufficient Funds" : "Return observed",
        bank: txn.accountId,
        direction,
      };
    });
}

export function detectPenalCharges(transactions: NormalizedTransaction[]): NormalizedTransaction[] {
  return transactions.filter((txn) => txn.debit > 0 && /\bPENAL|CHARGE|FEE|MIN BAL|RETURN CHG|BOUNCE CHG/i.test(txn.narration));
}

export function detectRecurring(transactions: NormalizedTransaction[], direction: TransactionDirection): RecurringPattern[] {
  const groups = groupBy(
    transactions.filter((txn) => txn.direction === direction && txn.amount > 0),
    (txn) => `${txn.party.toUpperCase()}|${Math.round(txn.amount / 1000) * 1000}`,
  );

  return Object.values(groups)
    .filter((rows) => rows.length >= 3 && new Set(rows.map((txn) => txn.monthKey)).size >= 3)
    .map((rows) => {
      const sorted = [...rows].sort((a, b) => a.date.getTime() - b.date.getTime());
      const total = rows.reduce((sum, txn) => sum + txn.amount, 0);
      return {
        name: rows[0].party,
        frequency: new Set(rows.map((txn) => txn.monthKey)).size >= rows.length - 1 ? "Monthly" : "Recurring",
        avgAmount: round(total / rows.length),
        occurrences: rows.length,
        lastDate: sorted[sorted.length - 1].dateText,
        category: rows[0].category,
      };
    })
    .sort((a, b) => b.avgAmount * b.occurrences - a.avgAmount * a.occurrences);
}

export function detectLoans(transactions: NormalizedTransaction[]): LoanPattern[] {
  const emiTxns = transactions.filter((txn) => txn.debit > 0 && /\bEMI|LOAN|NACH|ECS|FINANCE|LENDING|CAPITAL|FINSERV/i.test(txn.narration));
  const groups = groupBy(emiTxns, (txn) => txn.party.toUpperCase());

  return Object.values(groups)
    .map((rows) => ({
      lender: rows[0].party,
      type: /AUTO|CAR|VEHICLE/i.test(rows.map((txn) => txn.narration).join(" ")) ? "Auto Loan" : "Loan / EMI",
      sanctioned: 0,
      outstanding: 0,
      emi: round(rows.reduce((sum, txn) => sum + txn.debit, 0) / rows.length),
      rate: "-",
      tenor: "-",
      status: "Active",
      occurrences: rows.length,
    }))
    .filter((loan) => loan.occurrences >= 2)
    .sort((a, b) => b.emi - a.emi);
}

export function detectCircular(transactions: NormalizedTransaction[]): CircularFlow[] {
  const credits = transactions.filter((txn) => txn.credit > 0);
  const debits = transactions.filter((txn) => txn.debit > 0);
  const matches: CircularFlow[] = [];

  for (const debit of debits) {
    const match = credits.find((credit) => {
      const hours = Math.abs(credit.date.getTime() - debit.date.getTime()) / 36e5;
      const amountClose = Math.abs(credit.credit - debit.debit) / Math.max(credit.credit, debit.debit) <= 0.05;
      return hours <= 72 && amountClose && credit.party.toUpperCase() === debit.party.toUpperCase();
    });

    if (match) {
      matches.push({
        id: `C-${String(matches.length + 1).padStart(2, "0")}`,
        chain: `${debit.accountId} -> ${debit.party} -> ${match.accountId}`,
        amount: round(Math.min(debit.debit, match.credit)),
        window: `${Math.ceil(Math.abs(match.date.getTime() - debit.date.getTime()) / 36e5)}h`,
        date: `${debit.dateText} -> ${match.dateText}`,
        risk: "high",
      });
    }
  }

  return matches.slice(0, 20);
}

export function detectInternal(transactions: NormalizedTransaction[]) {
  return transactions
    .filter((txn) => /\bSELF|OWN|SISTER|GROUP|PROMOTER|DIRECTOR|PARTNER|INTER.?COMPANY|TRANSFER TO OWN/i.test(txn.narration))
    .map((txn) => ({
      date: txn.dateText,
      party: txn.party,
      direction: txn.direction,
      amount: txn.amount,
      narration: txn.narration,
    }));
}
