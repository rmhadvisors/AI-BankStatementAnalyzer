import type { AnalysisFlag, BounceEvent, CircularFlow, MonthMetric, NormalizedTransaction } from "./types";
import { formatINR, groupBy } from "./utils";

type FlagInput = {
  months: MonthMetric[];
  transactions: NormalizedTransaction[];
  bounces: BounceEvent[];
  penalCharges: NormalizedTransaction[];
  circular: CircularFlow[];
  recurringDebitTotal: number;
  recurringCreditTotal: number;
};

export function buildFlags(input: FlagInput): AnalysisFlag[] {
  const flags: AnalysisFlag[] = [];
  const add = (category: string, flag: string, severity: AnalysisFlag["severity"], description: string, evidence: string) => {
    flags.push({ sn: flags.length + 1, category, flag, severity, description, evidence });
  };

  const totalCredits = input.months.reduce((sum, month) => sum + month.totalCredits, 0);
  const totalDebits = input.months.reduce((sum, month) => sum + month.totalDebits, 0);
  const cashDeposits = input.months.reduce((sum, month) => sum + month.cashDeposits, 0);
  const cashDepositRatio = totalCredits ? cashDeposits / totalCredits : 0;
  const lowestAbb = input.months.length ? Math.min(...input.months.map((month) => month.abb)) : 0;
  const topParty = Object.values(groupBy(input.transactions, (txn) => txn.party.toUpperCase()))
    .map((rows) => ({ party: rows[0].party, total: rows.reduce((sum, txn) => sum + txn.amount, 0) }))
    .sort((a, b) => b.total - a.total)[0];
  const inflowMonths = input.months.filter((month) => month.netFlow > 0).length;

  if (input.bounces.length > 0) {
    add("Returns and Delays", "Cheque/ECS/EMI bounces detected", input.bounces.length >= 3 ? "high" : "medium", `${input.bounces.length} return or bounce events were detected.`, "Bounce sheet");
  }
  if (input.penalCharges.length > 0) {
    add("Banking", "Penal charges or bank charges observed", "medium", `${input.penalCharges.length} charge transactions were detected.`, "Transaction narration");
  }
  if (inflowMonths >= Math.max(3, Math.ceil(input.months.length / 2))) {
    add("Cash Flow", "Net inflow dominant (ITR context)", "medium", `${inflowMonths} of ${input.months.length} months show net inflow.`, "MoM Summary");
  }
  if (cashDepositRatio > 0.2) {
    add("Cash Flow", "High cash deposit ratio", "medium", `Cash deposits are ${(cashDepositRatio * 100).toFixed(1)}% of total credits.`, "MoM Summary");
  }
  if (lowestAbb < 0) {
    add("Working Capital Conduct", "Negative average bank balance", "high", `Lowest monthly ABB is ${formatINR(lowestAbb)}.`, "CAM Analysis");
  }
  if (input.circular.length > 0) {
    add("Fraud", "Circular fund movement detected", "critical", `${input.circular.length} possible round-trip chains were detected.`, "Circular sheet");
  }
  if (topParty && totalCredits + totalDebits > 0 && topParty.total / (totalCredits + totalDebits) > 0.35) {
    add("Concentration", "High counterparty concentration", "medium", `${topParty.party} contributes ${((topParty.total / (totalCredits + totalDebits)) * 100).toFixed(1)}% of total transaction value.`, "Highest Transactions");
  }
  if (input.recurringDebitTotal > input.recurringCreditTotal && input.recurringDebitTotal > totalCredits * 0.5) {
    add("Behavior", "Recurring obligations exceed stable inflows", "high", "Recurring debits are materially higher than recurring credits.", "Recurring sheets");
  }
  if (flags.length === 0) {
    add("Banking", "No major risk signal detected", "low", "Transaction behavior appears stable based on available parsed data.", "Automated analysis");
  }

  return flags;
}

export function riskFromFlags(flags: AnalysisFlag[], months: MonthMetric[]) {
  const penalty = flags.reduce((sum, flag) => {
    if (flag.severity === "critical") return sum + 25;
    if (flag.severity === "high") return sum + 15;
    if (flag.severity === "medium") return sum + 8;
    return sum + 2;
  }, 0);
  const outflowMonths = months.filter((month) => month.netFlow <= 0).length;
  const stabilityBonus = months.length ? Math.round((outflowMonths / months.length) * 10) : 0;
  const value = Math.max(0, Math.min(100, 85 - penalty + stabilityBonus));
  const band = value >= 75 ? "Low" : value >= 55 ? "Medium" : value >= 35 ? "High" : "Critical";

  return {
    value,
    band,
    decision: value >= 70 ? "Approve" : value >= 50 ? "Conditional Approval" : "Manual Review",
    confidence: Math.min(0.95, 0.65 + Math.min(months.length, 12) * 0.025),
    trend: outflowMonths - (months.length - outflowMonths),
  };
}
