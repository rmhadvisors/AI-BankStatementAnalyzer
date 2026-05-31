// Sample BSA data inspired by Bank_statement_Sample_report.xlsx
export const applicant = {
  name: "XYZ Corporation Pvt Ltd",
  pan: "AABCX1234F",
  entityType: "Private Limited Company",
  loanType: "Working Capital — ₹2.5 Cr",
  analysisId: "BSA-2026-0042178",
  analyst: "Claude Underwriting AI",
  period: "01 Apr 2024 — 31 Mar 2025",
  banks: [
    { name: "Kotak Mahindra Bank", account: "58400000000917", ifsc: "KKBK0004628", branch: "Andheri East" },
    { name: "Punjab National Bank", account: "120XXXXXX4211", ifsc: "PUNB0317900", branch: "Connaught Place" },
  ],
};

export const accountInfo = {
  accountName: "XYZ Corporation Pvt Ltd",
  accountNumber: "58400000000917",
  bank: "Kotak Mahindra Bank",
};

export const riskScore = {
  value: 67,
  band: "Medium",
  decision: "Conditional Approval" as const,
  confidence: 0.91,
  trend: +4,
};

export const aiRecommendation = {
  verdict: "Approve with Conditions",
  rationale:
    "Stable operating cash flow with disciplined EMI servicing. Material concerns around 3 circular transactions (₹42L) and 2 EMI bounces in last quarter require collateral top-up and quarterly monitoring.",
  conditions: [
    "Pledge inventory hypothecation min 1.4× exposure",
    "Restrict additional unsecured borrowing during tenor",
    "Monthly bank statement submission for 12 months",
  ],
};

export const flags = [
  { sn: 1, category: "Transactions", flag: "Irregularities in statement formatting", severity: "high", description: "Font inconsistencies detected on pages 14–17 of PNB statement; OCR confidence dropped to 78%.", evidence: "PNB-stmt.pdf p.14–17" },
  { sn: 2, category: "Cash Flow", flag: "Negative net cash flow in 4 of 12 months", severity: "medium", description: "Months Jun, Sep, Nov, Feb show net outflows exceeding ₹18L.", evidence: "Monthly CF sheet" },
  { sn: 3, category: "Fraud", flag: "Circular fund movement detected", severity: "critical", description: "3 round-trip transactions ₹42.1L between sister concerns within 48h windows.", evidence: "Circular sheet" },
  { sn: 4, category: "Liability", flag: "EMI bounce in last 90 days", severity: "high", description: "2 EMI bounces — HDFC Auto Loan (₹38,200) and Bajaj Finserv (₹12,400).", evidence: "Bounce sheet" },
  { sn: 5, category: "Behavior", flag: "Cash deposits > 20% of credits", severity: "medium", description: "Cash component is 23.4% of total credits, above industry threshold of 15%.", evidence: "Spend Analysis" },
  { sn: 6, category: "Banking", flag: "Average balance below sanctioned DP", severity: "medium", description: "ABB dropped below drawing power in 5 of 12 months.", evidence: "CAM sheet" },
  { sn: 7, category: "Compliance", flag: "Statutory dues paid on time", severity: "low", description: "GST and TDS payments observed every month — positive indicator.", evidence: "Statutory sheet" },
  { sn: 8, category: "Income", flag: "Salary credits regular and growing", severity: "low", description: "Promoter salary credits show 12% YoY growth, consistent dates.", evidence: "Salary sheet" },
];

export const execSummary = [
  { particulars: "Total Credits", consolidated: "₹14,82,40,116", kotak: "₹9,12,18,840", pnb: "₹5,70,21,276" },
  { particulars: "Total Debits", consolidated: "₹14,17,90,560", kotak: "₹8,79,42,180", pnb: "₹5,38,48,380" },
  { particulars: "Net Cash Flow", consolidated: "₹64,49,556", kotak: "₹32,76,660", pnb: "₹31,72,896" },
  { particulars: "Average Bank Balance", consolidated: "₹41,28,720", kotak: "₹28,14,510", pnb: "₹13,14,210" },
  { particulars: "Highest Balance", consolidated: "₹1,84,21,560", kotak: "₹1,12,40,210", pnb: "₹71,81,350" },
  { particulars: "Lowest Balance", consolidated: "₹1,84,210", kotak: "₹2,84,510", pnb: "(₹1,00,300)" },
  { particulars: "No. of Credit Txns", consolidated: "2,418", kotak: "1,512", pnb: "906" },
  { particulars: "No. of Debit Txns", consolidated: "4,182", kotak: "2,610", pnb: "1,572" },
  { particulars: "Avg Monthly Inflow", consolidated: "₹1,23,53,343", kotak: "₹76,01,570", pnb: "₹47,51,773" },
  { particulars: "Avg Monthly Outflow", consolidated: "₹1,18,15,880", kotak: "₹73,28,515", pnb: "₹44,87,365" },
  { particulars: "Cash Deposit Ratio", consolidated: "23.4%", kotak: "19.8%", pnb: "29.2%" },
  { particulars: "Bounce Count (I/W + O/W)", consolidated: "11", kotak: "6", pnb: "5" },
];

const months = ["Apr-24","May-24","Jun-24","Jul-24","Aug-24","Sep-24","Oct-24","Nov-24","Dec-24","Jan-25","Feb-25","Mar-25"];
const monthKeys = ["2024-04","2024-05","2024-06","2024-07","2024-08","2024-09","2024-10","2024-11","2024-12","2025-01","2025-02","2025-03"];

export const camAnalysis = months.map((m, i) => ({
  month: m,
  netCreditCount: 180 + Math.round(Math.sin(i) * 22) + i * 4,
  netCredit: 9800000 + Math.round(Math.sin(i / 1.4) * 2400000) + i * 120000,
  netDebitCount: 320 + Math.round(Math.cos(i) * 30) + i * 5,
  netDebit: 9500000 + Math.round(Math.cos(i / 1.2) * 2200000) + i * 110000,
  iwReturnCount: i === 5 || i === 10 ? 2 : i % 3 === 0 ? 1 : 0,
  iwReturn: i === 5 ? 38200 : i === 10 ? 12400 : 0,
  owReturnCount: i === 7 ? 1 : 0,
  owReturn: i === 7 ? 28000 : 0,
  abb: 3800000 + Math.round(Math.sin(i / 2) * 900000),
  utilization: 0.62 + Math.sin(i / 3) * 0.18,
  intServiced: 142000 + i * 1800,
}));

export const momSummary = months.map((m, i) => ({
  month: m,
  monthKey: monthKeys[i],
  openingBal: 3800000 + i * 80000,
  closingBal: 3900000 + i * 84000 + Math.round(Math.sin(i) * 600000),
  totalCredits: 10800000 + Math.round(Math.sin(i / 1.6) * 2200000),
  totalDebits: 10600000 + Math.round(Math.cos(i / 1.4) * 2100000),
  netFlow: Math.round(Math.sin(i / 1.1) * 1800000) + (i === 5 || i === 8 || i === 10 || i === 1 ? -1900000 : 600000),
  cashDeposits: 1800000 + Math.round(Math.sin(i) * 400000),
  cashWithdrawals: 1200000 + Math.round(Math.cos(i) * 300000),
  abb: 3600000 + Math.round(Math.sin(i / 1.8) * 700000),
  chequeDeposits: 2400000,
  upiCredit: 3200000 + i * 80000,
  upiDebit: 1800000 + i * 60000,
}));

export const monthlyCF = months.map((m, i) => {
  const opening = 3800000 + i * 80000;
  const operating = Math.round(Math.sin(i / 1.3) * 2000000) + 800000;
  const investing = i === 3 ? -2400000 : i === 9 ? -1800000 : -200000;
  const financing = i === 0 || i === 6 ? 5000000 : -420000;
  const closing = opening + operating + investing + financing;
  return { month: m, opening, operating, investing, financing, closing };
});

export const bounces = [
  { date: "2024-09-12", monthKey: "2024-09", type: "I/W Cheque Return", party: "Sundeep Traders", amount: 38200, reason: "Insufficient Funds", bank: "Kotak-0917" },
  { date: "2024-09-28", monthKey: "2024-09", type: "EMI Bounce", party: "HDFC Auto Loan", amount: 38200, reason: "Insufficient Funds", bank: "Kotak-0917" },
  { date: "2025-02-04", monthKey: "2025-02", type: "EMI Bounce", party: "Bajaj Finserv", amount: 12400, reason: "Insufficient Funds", bank: "PNB-4211" },
  { date: "2025-02-18", monthKey: "2025-02", type: "I/W ECS Return", party: "Reliance Jio Postpaid", amount: 8600, reason: "Insufficient Funds", bank: "PNB-4211" },
  { date: "2024-11-22", monthKey: "2024-11", type: "Penal Charges", party: "Kotak Mahindra Bank", amount: 4200, reason: "Min Balance Charges", bank: "Kotak-0917" },
  { date: "2024-12-15", monthKey: "2024-12", type: "Penal Charges", party: "PNB", amount: 2800, reason: "Cheque Return Charges", bank: "PNB-4211" },
];

export const loans = [
  { lender: "HDFC Bank", type: "Cash Credit", sanctioned: 25000000, outstanding: 18420000, emi: null, rate: "9.85%", tenor: "Renewable", status: "Active" },
  { lender: "HDFC Bank", type: "Auto Loan", sanctioned: 1800000, outstanding: 720000, emi: 38200, rate: "10.25%", tenor: "60 mo", status: "Active" },
  { lender: "Bajaj Finserv", type: "Equipment Loan", sanctioned: 850000, outstanding: 312000, emi: 12400, rate: "12.5%", tenor: "84 mo", status: "Active" },
  { lender: "Axis Bank", type: "Term Loan", sanctioned: 5000000, outstanding: 0, emi: 0, rate: "—", tenor: "Closed", status: "Closed" },
  { lender: "Tata Capital", type: "Business Loan", sanctioned: 2500000, outstanding: 1840000, emi: 62800, rate: "13.5%", tenor: "48 mo", status: "Active" },
];

export const emiTracker = months.flatMap((m, mi) =>
  loans.filter(l => l.emi).map(l => ({
    month: m,
    lender: l.lender,
    type: l.type,
    emiDue: l.emi as number,
    paidOn: (mi === 5 && l.lender === "HDFC Bank") || (mi === 10 && l.lender === "Bajaj Finserv") ? null : `${String(mi+1).padStart(2,"0")} ${m}`,
    status: (mi === 5 && l.lender === "HDFC Bank") || (mi === 10 && l.lender === "Bajaj Finserv") ? "Bounced" : "Paid",
  }))
);

export const tradeCredits = [
  { date: "2024-04-08", party: "Mahalaxmi Enterprises", amount: 1842000, mode: "RTGS", narration: "INV/2024/0421 against material supply" },
  { date: "2024-05-14", party: "Surya Industries", amount: 982400, mode: "NEFT", narration: "Inv 884 PO 2102" },
  { date: "2024-06-21", party: "Krishna Trading Co.", amount: 2410800, mode: "RTGS", narration: "Settlement Q1 FY25" },
  { date: "2024-08-02", party: "Anand Mills", amount: 1180000, mode: "RTGS", narration: "Cotton yarn supply" },
  { date: "2024-10-19", party: "Mahalaxmi Enterprises", amount: 2280000, mode: "RTGS", narration: "INV/2024/1042" },
  { date: "2025-01-10", party: "Krishna Trading Co.", amount: 1920000, mode: "RTGS", narration: "INV/2025/0114" },
  { date: "2025-03-04", party: "Surya Industries", amount: 1582000, mode: "NEFT", narration: "Year-end settlement" },
];

export const tradeDebits = [
  { date: "2024-04-12", party: "Rajesh Yarn Mills", amount: 942000, mode: "RTGS", narration: "Raw material purchase" },
  { date: "2024-05-22", party: "Global Logistics", amount: 184200, mode: "NEFT", narration: "Freight bill 4421" },
  { date: "2024-07-08", party: "Bombay Spinners", amount: 1820000, mode: "RTGS", narration: "Material PO 8821" },
  { date: "2024-09-15", party: "Rajesh Yarn Mills", amount: 1240000, mode: "RTGS", narration: "Inv settlement" },
  { date: "2024-11-28", party: "MSEB Industrial", amount: 384200, mode: "NEFT", narration: "Power bill Nov 24" },
  { date: "2025-02-08", party: "Bombay Spinners", amount: 1640000, mode: "RTGS", narration: "Material PO 9912" },
];

export const highestTns = [
  { rank: 1, date: "2024-06-21", type: "Credit", party: "Krishna Trading Co.", amount: 2410800, narration: "Settlement Q1 FY25" },
  { rank: 2, date: "2024-10-19", type: "Credit", party: "Mahalaxmi Enterprises", amount: 2280000, narration: "INV/2024/1042" },
  { rank: 3, date: "2025-01-10", type: "Credit", party: "Krishna Trading Co.", amount: 1920000, narration: "INV/2025/0114" },
  { rank: 4, date: "2024-04-08", type: "Credit", party: "Mahalaxmi Enterprises", amount: 1842000, narration: "INV/2024/0421" },
  { rank: 5, date: "2024-07-08", type: "Debit", party: "Bombay Spinners", amount: 1820000, narration: "Material PO 8821" },
  { rank: 6, date: "2025-02-08", type: "Debit", party: "Bombay Spinners", amount: 1640000, narration: "Material PO 9912" },
  { rank: 7, date: "2025-03-04", type: "Credit", party: "Surya Industries", amount: 1582000, narration: "Year-end settlement" },
  { rank: 8, date: "2024-09-15", type: "Debit", party: "Rajesh Yarn Mills", amount: 1240000, narration: "Inv settlement" },
];

export const internalGroup = [
  { date: "2024-05-04", party: "XYZ Logistics Pvt Ltd (Sister)", direction: "Credit", amount: 1840000, narration: "Inter-company funding" },
  { date: "2024-05-06", party: "XYZ Logistics Pvt Ltd (Sister)", direction: "Debit", amount: 1820000, narration: "Inter-company repayment" },
  { date: "2024-08-12", party: "XYZ Exports LLP (Group)", direction: "Credit", amount: 1200000, narration: "Loan from group" },
  { date: "2024-09-22", party: "XYZ Exports LLP (Group)", direction: "Debit", amount: 1250000, narration: "Loan repayment" },
  { date: "2025-01-18", party: "Promoter — A. Sharma", direction: "Debit", amount: 800000, narration: "Director's drawings" },
];

export const circular = [
  { id: "C-01", chain: "XYZ Corp → XYZ Logistics → XYZ Exports → XYZ Corp", amount: 1840000, window: "48h", date: "2024-05-04 → 05-06", risk: "critical" },
  { id: "C-02", chain: "XYZ Corp → A. Sharma → XYZ Exports → XYZ Corp", amount: 1200000, window: "72h", date: "2024-08-12 → 08-15", risk: "critical" },
  { id: "C-03", chain: "XYZ Corp → Krishna Trading → XYZ Logistics → XYZ Corp", amount: 1170000, window: "24h", date: "2025-01-22", risk: "high" },
];

export const netTransactions = months.map((m, i) => ({
  month: m,
  credits: 10800000 + Math.round(Math.sin(i / 1.6) * 2200000),
  debits: 10600000 + Math.round(Math.cos(i / 1.4) * 2100000),
  net: 200000 + Math.round(Math.sin(i / 1.1) * 1800000),
}));

export const salary = months.map((m, i) => ({
  month: m,
  date: `${28 + (i % 2)} ${m}`,
  payer: "XYZ Corporation Pvt Ltd",
  amount: 285000 + i * 1800,
  consistent: true,
}));

export const staffEmoluments = [
  { month: "Apr-24", count: 42, total: 18420000, avg: 438571 },
  { month: "May-24", count: 42, total: 18420000, avg: 438571 },
  { month: "Jun-24", count: 44, total: 19180000, avg: 435909 },
  { month: "Jul-24", count: 44, total: 19180000, avg: 435909 },
  { month: "Aug-24", count: 45, total: 19620000, avg: 436000 },
  { month: "Sep-24", count: 45, total: 19620000, avg: 436000 },
  { month: "Oct-24", count: 46, total: 20040000, avg: 435652 },
  { month: "Nov-24", count: 46, total: 20040000, avg: 435652 },
  { month: "Dec-24", count: 48, total: 21240000, avg: 442500 },
  { month: "Jan-25", count: 48, total: 21240000, avg: 442500 },
  { month: "Feb-25", count: 48, total: 21240000, avg: 442500 },
  { month: "Mar-25", count: 50, total: 22000000, avg: 440000 },
];

export const spendAnalysis = [
  { category: "Raw Materials", amount: 48200000, pct: 34, color: "var(--chart-1)" },
  { category: "Salaries", amount: 23800000, pct: 17, color: "var(--chart-2)" },
  { category: "Loan & EMI", amount: 18200000, pct: 13, color: "var(--chart-3)" },
  { category: "Statutory", amount: 12400000, pct: 9, color: "var(--chart-4)" },
  { category: "Logistics", amount: 9800000, pct: 7, color: "var(--chart-5)" },
  { category: "Utilities", amount: 6200000, pct: 4, color: "var(--info)" },
  { category: "Travel", amount: 4800000, pct: 3, color: "var(--risk-medium)" },
  { category: "Other", amount: 18790560, pct: 13, color: "var(--muted-foreground)" },
];

export const billPayments = [
  { biller: "Reliance Jio (Corporate)", category: "Telecom", monthly: 48200, lastPaid: "2025-03-08", consistent: true },
  { biller: "Tata Power", category: "Utility", monthly: 184200, lastPaid: "2025-03-12", consistent: true },
  { biller: "MSEB Industrial", category: "Utility", monthly: 384200, lastPaid: "2025-03-04", consistent: true },
  { biller: "Mahanagar Gas", category: "Utility", monthly: 28400, lastPaid: "2025-03-10", consistent: true },
  { biller: "Airtel Business", category: "Telecom", monthly: 18200, lastPaid: "2025-03-06", consistent: true },
];

export const recurringDebit = [
  { merchant: "HDFC Auto Loan EMI", frequency: "Monthly", amount: 38200, occurrences: 12, lastDate: "2025-03-05" },
  { merchant: "Bajaj Finserv EMI", frequency: "Monthly", amount: 12400, occurrences: 11, lastDate: "2025-03-05" },
  { merchant: "Tata Capital EMI", frequency: "Monthly", amount: 62800, occurrences: 12, lastDate: "2025-03-07" },
  { merchant: "MSEB Industrial", frequency: "Monthly", amount: 384200, occurrences: 12, lastDate: "2025-03-04" },
  { merchant: "GST Payment", frequency: "Monthly", amount: 920000, occurrences: 12, lastDate: "2025-03-18" },
];

export const recurringCredit = [
  { source: "Mahalaxmi Enterprises", frequency: "Monthly", avgAmount: 1842000, occurrences: 11, lastDate: "2025-03-12" },
  { source: "Krishna Trading Co.", frequency: "Bi-monthly", avgAmount: 2100000, occurrences: 6, lastDate: "2025-03-14" },
  { source: "Surya Industries", frequency: "Quarterly", avgAmount: 1282000, occurrences: 4, lastDate: "2025-03-04" },
  { source: "Anand Mills", frequency: "Irregular", avgAmount: 1180000, occurrences: 3, lastDate: "2025-02-08" },
];

export const transactions = [
  { dateText: "2024-04-03", monthKey: "2024-04", party: "UPI Receipt", narration: "Customer collections", debit: 0, credit: 420000, amount: 420000, direction: "Credit", category: "UPI" },
  { dateText: "2024-04-08", monthKey: "2024-04", party: "Mahalaxmi Enterprises", narration: "INV/2024/0421", debit: 0, credit: 1842000, amount: 1842000, direction: "Credit", category: "Trade Credit" },
  { dateText: "2024-04-12", monthKey: "2024-04", party: "Rajesh Yarn Mills", narration: "Raw material purchase", debit: 942000, credit: 0, amount: 942000, direction: "Debit", category: "Trade Debit" },
  { dateText: "2024-04-18", monthKey: "2024-04", party: "MSEB Industrial", narration: "Power bill", debit: 284000, credit: 0, amount: 284000, direction: "Debit", category: "Utilities" },
  { dateText: "2024-04-22", monthKey: "2024-04", party: "Salary payout", narration: "Staff salaries", debit: 620000, credit: 0, amount: 620000, direction: "Debit", category: "Salary" },
  { dateText: "2024-04-26", monthKey: "2024-04", party: "Anand Mills", narration: "Partial settlement", debit: 0, credit: 510000, amount: 510000, direction: "Credit", category: "Trade Credit" },
  { dateText: "2024-05-14", monthKey: "2024-05", party: "Surya Industries", narration: "Inv 884 PO 2102", debit: 0, credit: 982400, amount: 982400, direction: "Credit", category: "Trade Credit" },
  { dateText: "2024-05-22", monthKey: "2024-05", party: "Global Logistics", narration: "Freight bill 4421", debit: 184200, credit: 0, amount: 184200, direction: "Debit", category: "Trade Debit" },
  { dateText: "2024-06-21", monthKey: "2024-06", party: "Krishna Trading Co.", narration: "Settlement Q1 FY25", debit: 0, credit: 2410800, amount: 2410800, direction: "Credit", category: "Trade Credit" },
  { dateText: "2024-07-08", monthKey: "2024-07", party: "Bombay Spinners", narration: "Material PO 8821", debit: 1820000, credit: 0, amount: 1820000, direction: "Debit", category: "Trade Debit" },
  { dateText: "2024-08-02", monthKey: "2024-08", party: "Anand Mills", narration: "Cotton yarn supply", debit: 0, credit: 1180000, amount: 1180000, direction: "Credit", category: "Trade Credit" },
  { dateText: "2024-09-15", monthKey: "2024-09", party: "Rajesh Yarn Mills", narration: "Inv settlement", debit: 1240000, credit: 0, amount: 1240000, direction: "Debit", category: "Trade Debit" },
  { dateText: "2024-10-19", monthKey: "2024-10", party: "Mahalaxmi Enterprises", narration: "INV/2024/1042", debit: 0, credit: 2280000, amount: 2280000, direction: "Credit", category: "Trade Credit" },
  { dateText: "2025-01-10", monthKey: "2025-01", party: "Krishna Trading Co.", narration: "INV/2025/0114", debit: 0, credit: 1920000, amount: 1920000, direction: "Credit", category: "Trade Credit" },
  { dateText: "2025-02-08", monthKey: "2025-02", party: "Bombay Spinners", narration: "Material PO 9912", debit: 1640000, credit: 0, amount: 1640000, direction: "Debit", category: "Trade Debit" },
  { dateText: "2025-03-04", monthKey: "2025-03", party: "Surya Industries", narration: "Year-end settlement", debit: 0, credit: 1582000, amount: 1582000, direction: "Credit", category: "Trade Credit" },
];

export const formatINR = (n: number) => {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)} L`;
  return `${sign}₹${abs.toLocaleString("en-IN")}`;
};
