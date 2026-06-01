export type AnalysisSeverity = "critical" | "high" | "medium" | "low";
export type TransactionDirection = "Credit" | "Debit";

export type ExtractedTransaction = {
  date: string | Date;
  particulars?: string;
  narration?: string;
  withdrawal?: number | null;
  deposit?: number | null;
  balance?: number | null;
};

export type ExtractedStatement = {
  fileName?: string;
  accountInfo?: { label: string; value: string }[];
  transactions: ExtractedTransaction[];
};

export type AnalysisInput = {
  applicantName?: string;
  entityType?: string;
  pan?: string;
  loanType?: string;
  statements: ExtractedStatement[];
};

export type NormalizedTransaction = {
  id: string;
  date: Date;
  dateText: string;
  month: string;
  monthKey: string;
  narration: string;
  debit: number;
  credit: number;
  amount: number;
  direction: TransactionDirection;
  balance: number | null;
  accountId: string;
  bankName: string;
  party: string;
  mode: string;
  category: string;
};

export type MonthMetric = {
  month: string;
  monthKey: string;
  openingBal: number;
  closingBal: number;
  totalCredits: number;
  totalDebits: number;
  netFlow: number;
  creditCount: number;
  debitCount: number;
  cashDeposits: number;
  cashWithdrawals: number;
  upiCredit: number;
  upiDebit: number;
  abb: number;
};

export type AnalysisFlag = {
  sn: number;
  category: string;
  flag: string;
  severity: AnalysisSeverity;
  description: string;
  evidence: string;
};

export type BounceEvent = {
  date: string;
  monthKey: string;
  type: string;
  party: string;
  amount: number;
  reason: string;
  bank: string;
  direction?: "Inward" | "Outward" | "Unknown";
};

export type RecurringPattern = {
  name: string;
  frequency: string;
  avgAmount: number;
  occurrences: number;
  lastDate: string;
  category: string;
};

export type LoanPattern = {
  lender: string;
  type: string;
  sanctioned: number;
  outstanding: number;
  emi: number;
  rate: string;
  tenor: string;
  status: string;
  occurrences: number;
};

export type CircularFlow = {
  id: string;
  chain: string;
  amount: number;
  window: string;
  date: string;
  risk: "critical" | "high";
};

export type ReportViewScope = {
  mode: "yearly" | "monthly";
  statementGranularity?: "yearly" | "monthly";
  monthKey?: string;
  monthLabel?: string;
  monthCount?: number;
};

export interface AnalysisReport {
  id?: string;
  source?: string;
  viewScope?: ReportViewScope;
  availableMonths?: string[];
  accountInfo?: {
    accountName: string;
    accountNumber: string;
    bank: string;
  };
  statementPeriod?: {
    startDate: string;
    endDate: string;
  };
  applicant?: {
    name: string;
    pan: string;
    entityType: string;
    loanType: string;
    analysisId: string;
    period: string;
    banks: Array<{ name: string; account: string; ifsc: string; branch: string }>;
  };
  riskScore?: {
    value: number;
    band: string;
    decision: string;
    confidence: number;
    trend: number;
  };
  aiRecommendation?: {
    verdict: string;
    rationale: string;
    conditions: string[];
  };
  execSummary?: Array<Record<string, string>>;
  execSheet?: Array<Array<string | number | null>>;
  camAnalysis?: Array<Record<string, number | string>>;
  camSheet?: Array<Array<string | number | null>>;
  momSummary?: MonthMetric[];
  momSheet?: Array<Array<string | number | null>>;
  monthlyCF?: Array<{ month: string; opening: number; operating: number; investing: number; financing: number; closing: number }>;
  monthlyCFSheet?: Array<Array<string | number | null>>;
  bounceSheet?: Array<Array<string | number | null>>;
  loansSheet?: Array<Array<string | number | null>>;
  bounces?: BounceEvent[];
  loans?: LoanPattern[];
  emiTracker?: Array<{ month: string; lender: string; type: string; emiDue: number; paidOn: string; status: string }>;
  tradeCredits?: Array<{ date: string; party: string; amount: number; mode: string; narration: string }>;
  tradeDebits?: Array<{ date: string; party: string; amount: number; mode: string; narration: string }>;
  highestTns?: Array<{ rank: number; date: string; type: string; party: string; amount: number; narration: string }>;
  internalGroup?: Array<{ date: string; party: string; direction: string; amount: number; narration: string }>;
  circular?: CircularFlow[];
  netTransactions?: Array<{ month: string; credits: number; debits: number; net: number }>;
  salary?: Array<{ month: string; monthKey?: string; date: string; payer: string; amount: number; consistent: boolean }>;
  staffEmoluments?: Array<{ month: string; count: number; total: number; avg: number }>;
  spendAnalysis?: Array<{ category: string; amount: number; pct: number; color?: string }>;
  billPayments?: Array<{ biller: string; category: string; monthly: number; lastPaid: string; consistent: boolean }>;
  recurringDebit?: Array<{ merchant: string; frequency: string; amount: number; occurrences: number; lastDate: string }>;
  recurringCredit?: Array<{ source: string; frequency: string; avgAmount: number; occurrences: number; lastDate: string }>;
  rawDataSheet?: Array<Array<string | number | null>>;
  emiTrackerSheet?: Array<Array<string | number | null>>;
  tradeCreditsSheet?: Array<Array<string | number | null>>;
  tradeDebitsSheet?: Array<Array<string | number | null>>;
  highestTnsSheet?: Array<Array<string | number | null>>;
  internalGroupSheet?: Array<Array<string | number | null>>;
  circularSheet?: Array<Array<string | number | null>>;
  netTransactionsSheet?: Array<Array<string | number | null>>;
  salarySheet?: Array<Array<string | number | null>>;
  staffEmolumentsSheet?: Array<Array<string | number | null>>;
  spendAnalysisSheet?: Array<Array<string | number | null>>;
  billPaymentsSheet?: Array<Array<string | number | null>>;
  recurringDebitSheet?: Array<Array<string | number | null>>;
  recurringCreditSheet?: Array<Array<string | number | null>>;
  transactions?: NormalizedTransaction[];
  metrics?: MonthMetric[];
  flags?: AnalysisFlag[];
  flagsSheet?: Array<Array<string | number | null>>;
  events?: BounceEvent[];
  patterns?: RecurringPattern[];
  flows?: CircularFlow[];
}
