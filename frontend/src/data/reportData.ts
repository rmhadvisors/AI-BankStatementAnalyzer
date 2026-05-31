import * as sample from "./sampleReport";
import { getLatestReport } from "@/lib/analysis-report-store";

type ReportLike = Partial<typeof sample> & Record<string, unknown>;

function currentReport(): ReportLike {
  const live = getLatestReport<ReportLike>();
  if (live) return live;
  return sample;
}

/** True when showing demo sample data (no live analysis in store). */
export function isSampleReportActive(): boolean {
  return getLatestReport() === null;
}

function resolvePath(path: string[]) {
  let value: unknown = currentReport();

  for (const key of path) {
    if (value === null || value === undefined) return undefined;
    value = (value as Record<string, unknown>)[key];
  }

  return value;
}

function liveValue<T>(path: string[], fallback: T): T {
  return new Proxy(fallback as object, {
    get(target, prop) {
      const value = resolvePath(path);

      if (prop === Symbol.iterator && Array.isArray(value)) {
        return value[Symbol.iterator].bind(value);
      }

      if (value !== null && value !== undefined && typeof value === "object" && prop in value) {
        const property = (value as Record<PropertyKey, unknown>)[prop];
        if (typeof property === "function") {
          return property.bind(value);
        }
        return property;
      }

      const fallbackValue = (target as Record<PropertyKey, unknown>)[prop];
      if (typeof fallbackValue === "function") {
        return fallbackValue.bind(target);
      }
      return fallbackValue;
    },
    has(_target, prop) {
      const value = resolvePath(path);
      return prop in Object((value ?? fallback) as Record<PropertyKey, unknown>);
    },
    ownKeys() {
      const value = resolvePath(path);
      return Reflect.ownKeys(Object(value ?? fallback));
    },
    getOwnPropertyDescriptor(_target, prop) {
      const value = resolvePath(path) as Record<PropertyKey, unknown> | undefined;
      const source = (value ?? fallback) as Record<PropertyKey, unknown>;
      return Object.getOwnPropertyDescriptor(Object(source), prop) ?? {
        configurable: true,
        enumerable: true,
        value: source[prop],
      };
    },
  }) as T;
}

export const applicant = liveValue(["applicant"], sample.applicant);
export const accountInfo = liveValue(["accountInfo"], sample.accountInfo);
export const riskScore = liveValue(["riskScore"], sample.riskScore);
export const aiRecommendation = liveValue(["aiRecommendation"], sample.aiRecommendation);
export const flags = liveValue(["flags"], sample.flags);
export const flagsSheet = liveValue(["flagsSheet"], [] as Array<Array<string | number | null>>);
export const execSummary = liveValue(["execSummary"], sample.execSummary);
// Raw Exec Summary sheet (falls back to static sample raw sheet if needed in the future)
export const execSheet = liveValue(["execSheet"], [] as Array<Array<string | number | null>>);
export const camAnalysis = liveValue(["camAnalysis"], sample.camAnalysis);
export const camSheet = liveValue(["camSheet"], [] as Array<Array<string | number | null>>);
export const momSummary = liveValue(["momSummary"], sample.momSummary);
export const momSheet = liveValue(["momSheet"], [] as Array<Array<string | number | null>>);
export const monthlyCF = liveValue(["monthlyCF"], sample.monthlyCF);
export const monthlyCFSheet = liveValue(["monthlyCFSheet"], [] as Array<Array<string | number | null>>);
export const bounces = liveValue(["bounces"], sample.bounces);
export const bounceSheet = liveValue(["bounceSheet"], [] as Array<Array<string | number | null>>);
export const loans = liveValue(["loans"], sample.loans);
export const loansSheet = liveValue(["loansSheet"], [] as Array<Array<string | number | null>>);
export const emiTracker = liveValue(["emiTracker"], sample.emiTracker);
export const tradeCredits = liveValue(["tradeCredits"], sample.tradeCredits);
export const tradeDebits = liveValue(["tradeDebits"], sample.tradeDebits);
export const highestTns = liveValue(["highestTns"], sample.highestTns);
export const internalGroup = liveValue(["internalGroup"], sample.internalGroup);
export const circular = liveValue(["circular"], sample.circular);
export const netTransactions = liveValue(["netTransactions"], sample.netTransactions);
export const salary = liveValue(["salary"], sample.salary);
export const staffEmoluments = liveValue(["staffEmoluments"], sample.staffEmoluments);
export const spendAnalysis = liveValue(["spendAnalysis"], sample.spendAnalysis);
export const billPayments = liveValue(["billPayments"], sample.billPayments);
export const recurringDebit = liveValue(["recurringDebit"], sample.recurringDebit);
export const recurringCredit = liveValue(["recurringCredit"], sample.recurringCredit);
export const emiTrackerSheet = liveValue(["emiTrackerSheet"], [] as Array<Array<string | number | null>>);
export const tradeCreditsSheet = liveValue(["tradeCreditsSheet"], [] as Array<Array<string | number | null>>);
export const tradeDebitsSheet = liveValue(["tradeDebitsSheet"], [] as Array<Array<string | number | null>>);
export const highestTnsSheet = liveValue(["highestTnsSheet"], [] as Array<Array<string | number | null>>);
export const internalGroupSheet = liveValue(["internalGroupSheet"], [] as Array<Array<string | number | null>>);
export const circularSheet = liveValue(["circularSheet"], [] as Array<Array<string | number | null>>);
export const netTransactionsSheet = liveValue(["netTransactionsSheet"], [] as Array<Array<string | number | null>>);
export const salarySheet = liveValue(["salarySheet"], [] as Array<Array<string | number | null>>);
export const staffEmolumentsSheet = liveValue(["staffEmolumentsSheet"], [] as Array<Array<string | number | null>>);
export const spendAnalysisSheet = liveValue(["spendAnalysisSheet"], [] as Array<Array<string | number | null>>);
export const billPaymentsSheet = liveValue(["billPaymentsSheet"], [] as Array<Array<string | number | null>>);
export const recurringDebitSheet = liveValue(["recurringDebitSheet"], [] as Array<Array<string | number | null>>);
export const recurringCreditSheet = liveValue(["recurringCreditSheet"], [] as Array<Array<string | number | null>>);
export const transactions = liveValue(["transactions"], sample.transactions);
export const formatINR = sample.formatINR;
