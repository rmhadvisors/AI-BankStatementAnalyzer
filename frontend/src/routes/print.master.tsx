import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DataTable, Panel, Stat } from "@/components/report/primitives";
import {
  applicant,
  accountInfo,
  riskScore,
  flags,
  spendAnalysis,
  loans,
  billPayments,
  camAnalysis,
  formatINR,
} from "@/data/reportData";
import { PeriodProvider } from "@/contexts/PeriodContext";
import { useScopedReport } from "@/hooks/useScopedReport";
import { getAnalysis } from "@/lib/api";
import { saveLatestReport, useLatestReportVersion } from "@/lib/analysis-report-store";
import { buildMasterSummaryPdfTitle } from "@/lib/exportFilename";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

export const Route = createFileRoute("/print/master")({
  validateSearch: (search: Record<string, unknown>) => ({
    autoprint: search.autoprint === "1" || search.autoprint === 1 || search.autoprint === true,
    filename: typeof search.filename === "string" ? search.filename : undefined,
    id: typeof search.id === "string" ? search.id : undefined,
  }),
  component: MasterPrintRoute,
});

function absolutePath(path: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${path}`;
}

function MiniLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <a href={absolutePath(to)} className="mini-link text-[11px] text-primary whitespace-nowrap">
      {children}
      <span className="mini-link-icon" aria-hidden>
        →
      </span>
    </a>
  );
}

function MasterPrintRoute() {
  return (
    <PeriodProvider>
      <MasterPrintPage />
    </PeriodProvider>
  );
}

function MasterPrintPage() {
  useLatestReportVersion();
  const { autoprint, filename, id } = Route.useSearch();
  const [ready, setReady] = useState(!id);
  const scoped = useScopedReport();
  const {
    highestTns,
    circular,
    salary,
    recurringCredit,
    recurringDebit,
    bounces,
    staffEmoluments,
    labels,
    momTotals,
  } = scoped;

  const pdfTitle = filename || buildMasterSummaryPdfTitle({ applicant, accountInfo });
  const generatedOn = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  useEffect(() => {
    if (!id) {
      setReady(true);
      return;
    }

    let cancelled = false;
    setReady(false);
    void getAnalysis(id)
      .then((result) => {
        if (cancelled || !result.report) return;
        saveLatestReport(result.id, result.report);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!ready) return;
    document.body.classList.add("browser-master-pdf-export");
    document.title = pdfTitle;
    document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => {
      link.href = new URL(link.getAttribute("href") || "", window.location.origin).href;
    });
    return () => {
      document.body.classList.remove("browser-master-pdf-export");
    };
  }, [pdfTitle, ready]);

  useEffect(() => {
    if (!autoprint || !ready) return;
    const timer = window.setTimeout(() => window.print(), 500);
    return () => window.clearTimeout(timer);
  }, [autoprint, ready]);

  const topCompanies = [...highestTns].reduce<
    Record<string, { party: string; credit: number; debit: number; count: number }>
  >((acc, t) => {
    const k = t.party;
    acc[k] = acc[k] ?? { party: k, credit: 0, debit: 0, count: 0 };
    if (t.type === "Credit") acc[k].credit += t.amount;
    else acc[k].debit += t.amount;
    acc[k].count += 1;
    return acc;
  }, {});
  const topCompaniesArr = Object.values(topCompanies)
    .map((c) => ({ ...c, total: c.credit + c.debit }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const totalSalary = salary.reduce((a, s) => a + s.amount, 0);
  const totalRecurringCredit = recurringCredit.reduce((a, r) => a + r.avgAmount * r.occurrences, 0);
  const totalRecurringDebit = recurringDebit.reduce((a, r) => a + r.amount * r.occurrences, 0);
  const staffLatest = staffEmoluments[staffEmoluments.length - 1] ?? {
    count: 0,
    total: 0,
    avg: 0,
    month: "-",
  };
  const {
    totalCredits,
    totalDebits,
    cashDeposits,
    cashWithdrawals,
    netFlow: netCashFlow,
    avgBalance,
  } = momTotals;

  return ready ? (
    <main className="browser-pdf-root">
      <section className="browser-pdf-page browser-pdf-summary space-y-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            00
          </div>
          <div className="mt-1 flex items-start justify-between gap-6">
            <div>
              <h1 className="font-display text-3xl font-semibold">Master Summary</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                One-screen overview of every section - KPIs, trends and risk signals across all 20 modules.
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div className="font-medium text-foreground">{applicant.name}</div>
              <div>{applicant.analysisId}</div>
              <div>{accountInfo.bank}</div>
              <div>Generated {generatedOn}</div>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Headline KPIs - {labels.periodSubtitle}
            </div>
            <MiniLink to="/report">Executive Summary Section</MiniLink>
          </div>
          <div className="print-kpi grid grid-cols-6 gap-3">
            <Stat label="Total Credits" value={formatINR(totalCredits)} delta={labels.consolidatedDelta} accent="positive" />
            <Stat label="Total Debits" value={formatINR(totalDebits)} delta={labels.consolidatedDelta} accent="neutral" />
            <Stat label="Cash Deposits" value={formatINR(cashDeposits)} delta="Month totals" accent="neutral" />
            <Stat label="Cash Withdrawals" value={formatINR(cashWithdrawals)} delta="Month totals" accent="neutral" />
            <Stat label="Net Cash Flow" value={formatINR(netCashFlow)} delta="Month-on-month total" accent="positive" />
            <Stat label="Avg Bank Balance" value={formatINR(avgBalance)} delta="ABB across months" accent="negative" />
          </div>
        </div>

        <div className="print-tight-grid grid grid-cols-[1.35fr_0.65fr] gap-4">
          <Panel
            title="Spend Category Mix"
            subtitle="Where the money goes"
            action={<MiniLink to="/report/spend">Spend Analysis Section</MiniLink>}
            className="print-tight-panel"
          >
            <DataTable
              columns={[
                { key: "category", label: "Category" },
                {
                  key: "amount",
                  label: "Amount",
                  align: "right",
                  mono: true,
                  render: (row) => formatINR(row.amount),
                },
                {
                  key: "pct",
                  label: "Share",
                  align: "right",
                  mono: true,
                  render: (row) => `${row.pct}%`,
                },
              ]}
              rows={[...spendAnalysis].sort((a, b) => b.amount - a.amount)}
              dense
            />
          </Panel>

          <div className="print-tight-grid grid gap-4">
            <Panel
              title="Circular Flows"
              subtitle="Round-trip risk chains"
              action={<MiniLink to="/report/circular">Circular Flows Section</MiniLink>}
              className="print-tight-panel"
            >
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-3xl font-bold num text-[color:var(--risk-critical)]">
                    {circular.length}
                  </span>
                  <span className="text-xs text-muted-foreground">chains detected</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Total Rs {(circular.reduce((a, c) => a + c.amount, 0) / 100000).toFixed(1)}L cycled
                </div>
                <ul className="space-y-1 pt-1">
                  {circular.slice(0, 3).map((c) => (
                    <li key={c.id} className="flex items-center gap-2 text-[11px] text-foreground/80">
                      <span className={`h-1.5 w-1.5 rounded-full ${c.risk === "critical" ? "bg-[color:var(--risk-critical)]" : "bg-[color:var(--risk-high)]"}`} />
                      <span className="truncate">{c.chain}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>

            <Panel
              title="Bounces & Penal"
              subtitle="Returns and bank charges"
              action={<MiniLink to="/report/bounce">Bounces & Penal Section</MiniLink>}
              className="print-tight-panel"
            >
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-3xl font-bold num text-[color:var(--risk-high)]">
                    {bounces.length}
                  </span>
                  <span className="text-xs text-muted-foreground">events - {labels.periodCountLabel}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {bounces.filter((b) => b.type.includes("EMI")).length} EMI bounces -{" "}
                  {bounces.filter((b) => b.type.includes("Penal")).length} penal charges
                </div>
                <div className="text-xs text-muted-foreground">
                  Total impact {formatINR(bounces.reduce((a, b) => a + b.amount, 0))}
                </div>
              </div>
            </Panel>
          </div>
        </div>

        <div className="print-tight-grid grid grid-cols-4 gap-3">
          <Stat label={labels.totalLabel + " Salary"} value={formatINR(totalSalary)} delta={`${labels.monthsFraction(salary.length)} mo`} accent="positive" />
          <Stat label="Staff Emoluments" value={formatINR(staffLatest.total)} delta={`${staffLatest.count} headcount`} accent="neutral" />
          <Stat label="Recurring Credit" value={formatINR(totalRecurringCredit)} delta={`${recurringCredit.length} sources`} accent="positive" />
          <Stat label="Recurring Debit" value={formatINR(totalRecurringDebit)} delta={`${recurringDebit.length} merchants`} accent="neutral" />
        </div>

        <div className="print-tight-grid grid grid-cols-2 gap-6">
          <Panel
            title="Top Counterparties by Value"
            subtitle="Aggregated credit + debit across top transactions"
            action={<MiniLink to="/report/highest">Highest Transactions Section</MiniLink>}
            className="print-tight-panel"
          >
            <div className="h-64 print-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCompaniesArr} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    tickFormatter={(v) => `${(Number(v) / 100000).toFixed(0)}L`}
                  />
                  <YAxis
                    type="category"
                    dataKey="party"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    width={180}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="credit" stackId="a" name="Credit" fill="var(--chart-3)" />
                  <Bar dataKey="debit" stackId="a" name="Debit" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel
            title="Loan Book"
            subtitle="Active facilities & outstanding exposure"
            action={<MiniLink to="/report/loans">Loans & EMI Section</MiniLink>}
            className="print-tight-panel"
          >
            <ul className="space-y-2.5">
              {loans.map((l) => (
                <li key={l.lender + l.type} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {l.lender} - <span className="font-normal text-muted-foreground">{l.type}</span>
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {l.tenor} - {l.rate}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="num text-sm">{formatINR(l.outstanding)}</div>
                    <div className="text-[10px] text-muted-foreground">/ {formatINR(l.sanctioned)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </section>

      <section className="browser-pdf-page browser-pdf-modules">
        <ModuleSummaries />
      </section>

      <footer className="browser-pdf-footer">
        RMH.BSA Underwriting Intelligence - {applicant.analysisId} - Risk score {riskScore.value}
      </footer>
    </main>
  ) : (
    <main className="browser-pdf-root">
      <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
        Preparing Master Summary PDF...
      </div>
    </main>
  );
}

function SummaryCard({
  to,
  code,
  title,
  subtitle,
  stats,
}: {
  to: string;
  code: string;
  title: string;
  subtitle: string;
  stats: {
    label: string;
    value: string;
    accent?: "positive" | "negative" | "neutral" | "warning";
  }[];
}) {
  const accentClass = (a?: string) =>
    a === "positive"
      ? "text-[color:var(--positive)]"
      : a === "negative"
        ? "text-[color:var(--negative)]"
        : a === "warning"
          ? "text-[color:var(--risk-high)]"
          : "text-foreground";

  return (
    <a
      href={absolutePath(to)}
      className="summary-card group flex flex-col rounded-md border border-border bg-card p-3 transition hover:border-primary/50 hover:bg-primary/5"
    >
      <div className="mb-1 flex items-baseline gap-2">
        <span className="summary-code font-mono text-[10px] tabular-nums text-muted-foreground">{code}</span>
        <span className="summary-title truncate text-xs font-semibold text-foreground/90 group-hover:text-primary">
          {title}
        </span>
      </div>
      <div className="summary-subtitle mb-2.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
        {subtitle}
      </div>
      <div className="mt-auto grid grid-cols-3 gap-1.5">
        {stats.map((s, i) => (
          <div key={i} className="min-w-0">
            <div className="summary-stat-label truncate text-[9px] uppercase tracking-wider text-muted-foreground">
              {s.label}
            </div>
            <div className={`summary-stat-value num truncate text-[12px] font-semibold ${accentClass(s.accent)}`}>
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </a>
  );
}

function ModuleSummaries() {
  const {
    momSummary,
    monthlyCF,
    netTransactions,
    salary,
    staffEmoluments,
    emiTracker,
    tradeCredits,
    tradeDebits,
    highestTns,
    internalGroup,
    circular,
    recurringDebit,
    recurringCredit,
    bounces,
    labels,
    momTotals,
    monthCount,
  } = useScopedReport();

  const critical = flags.filter((f) => f.severity === "critical").length;
  const high = flags.filter((f) => f.severity === "high").length;
  const bouncedEmi = emiTracker.filter((e) => e.status === "Bounced").length;
  const emiAdh = emiTracker.length
    ? (((emiTracker.length - bouncedEmi) / emiTracker.length) * 100).toFixed(1) + "%"
    : "-";
  const activeLoans = loans.filter((l) => l.status === "Active");
  const loanOut = activeLoans.reduce((a, l) => a + l.outstanding, 0);
  const cfClose = monthlyCF[monthlyCF.length - 1]?.closing ?? 0;
  const tcTotal = tradeCredits.reduce((a, t) => a + t.amount, 0);
  const tdTotal = tradeDebits.reduce((a, t) => a + t.amount, 0);
  const htCredit = highestTns.filter((t) => t.type === "Credit").reduce((a, t) => a + t.amount, 0);
  const htDebit = highestTns.filter((t) => t.type === "Debit").reduce((a, t) => a + t.amount, 0);
  const igCredit = internalGroup.filter((i) => i.direction === "Credit").reduce((a, i) => a + i.amount, 0);
  const igDebit = internalGroup.filter((i) => i.direction === "Debit").reduce((a, i) => a + i.amount, 0);
  const circAmt = circular.reduce((a, c) => a + c.amount, 0);
  const netSum = netTransactions.reduce((a, n) => a + n.net, 0);
  const salTotal = salary.reduce((a, s) => a + s.amount, 0);
  const salAvg = salary.length ? salTotal / salary.length : 0;
  const staffLast = staffEmoluments[staffEmoluments.length - 1];
  const spendTotal = spendAnalysis.reduce((a, s) => a + s.amount, 0);
  const topSpend = [...spendAnalysis].sort((a, b) => b.amount - a.amount)[0];
  const billsTotal = billPayments.reduce((a, b) => a + b.monthly, 0);
  const rdTotal = recurringDebit.reduce((a, r) => a + r.amount * r.occurrences, 0);
  const rcTotal = recurringCredit.reduce((a, r) => a + r.avgAmount * r.occurrences, 0);
  const monthDenom = labels.isMonthly ? 1 : monthCount;

  return (
    <Panel
      title="All 20 Module Summaries"
      subtitle="Headline metrics from every section - click any tile to open the detailed view"
    >
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard to="/report" code="01" title="Executive Summary" subtitle={`${labels.periodSubtitle} KPIs across bank accounts.`} stats={[{ label: "Credits", value: formatINR(momTotals.totalCredits), accent: "positive" }, { label: "Debits", value: formatINR(momTotals.totalDebits) }, { label: "Net CF", value: formatINR(momTotals.netFlow), accent: "positive" }]} />
        <SummaryCard to="/report/flags" code="02" title="Flags & Risk" subtitle="AI-detected risk signals across forensic checks." stats={[{ label: "Total", value: flags.length.toString() }, { label: "Critical", value: critical.toString(), accent: "negative" }, { label: "High", value: high.toString(), accent: "warning" }]} />
        <SummaryCard to="/report/cam" code="03" title="CAM Analysis" subtitle="Credit appraisal - ABB, utilization, interest serviced." stats={[{ label: "Avg ABB", value: formatINR(camAnalysis.reduce((a, c) => a + c.abb, 0) / camAnalysis.length) }, { label: "Avg Util", value: `${((camAnalysis.reduce((a, c) => a + c.utilization, 0) / camAnalysis.length) * 100).toFixed(0)}%` }, { label: "I/W Rtns", value: camAnalysis.reduce((a, c) => a + c.iwReturnCount, 0).toString(), accent: "warning" }]} />
        <SummaryCard to="/report/mom" code="04" title="MoM Summary" subtitle="Month-on-month credits, debits and net flow." stats={[{ label: "Credits", value: formatINR(momTotals.totalCredits), accent: "positive" }, { label: "Debits", value: formatINR(momTotals.totalDebits) }, { label: "Neg Mo", value: labels.monthsFraction(momTotals.negMonths), accent: momTotals.negMonths > 4 ? "negative" : "warning" }]} />
        <SummaryCard to="/report/cashflow" code="05" title="Monthly Cash Flow" subtitle="Operating, investing and financing cash flows." stats={[{ label: "Closing", value: formatINR(cfClose), accent: "positive" }, { label: "Op CF", value: formatINR(monthlyCF.reduce((a, c) => a + c.operating, 0)) }, { label: "Months", value: String(monthDenom) }]} />
        <SummaryCard to="/report/bounce" code="06" title="Bounce & Penal" subtitle="Cheque/ECS returns and bank penal charges." stats={[{ label: "Events", value: bounces.length.toString(), accent: "negative" }, { label: "EMI Bnc", value: bounces.filter((b) => b.type.includes("EMI")).length.toString(), accent: "negative" }, { label: "Impact", value: formatINR(bounces.reduce((a, b) => a + b.amount, 0)) }]} />
        <SummaryCard to="/report/loans" code="07" title="Loans & EMI" subtitle="Active facilities and outstanding exposure." stats={[{ label: "Active", value: activeLoans.length.toString() }, { label: "O/S", value: formatINR(loanOut), accent: "warning" }, { label: "Lenders", value: new Set(loans.map((l) => l.lender)).size.toString() }]} />
        <SummaryCard to="/report/emi-tracker" code="08" title="EMI Tracker" subtitle="Month-wise EMI adherence - paid vs bounce." stats={[{ label: "Adher.", value: emiAdh, accent: "positive" }, { label: "Bnc", value: bouncedEmi.toString(), accent: "negative" }, { label: "Paid", value: formatINR(emiTracker.filter((e) => e.status === "Paid").reduce((a, e) => a + e.emiDue, 0)) }]} />
        <SummaryCard to="/report/trade-credits" code="09" title="Trade Credits" subtitle="Inflows from trade counterparties and customers." stats={[{ label: "Txns", value: tradeCredits.length.toString() }, { label: "Value", value: formatINR(tcTotal), accent: "positive" }, { label: "Parties", value: new Set(tradeCredits.map((t) => t.party)).size.toString() }]} />
        <SummaryCard to="/report/trade-debits" code="10" title="Trade Debits" subtitle="Outflows to suppliers and trade vendors." stats={[{ label: "Txns", value: tradeDebits.length.toString() }, { label: "Value", value: formatINR(tdTotal) }, { label: "Parties", value: new Set(tradeDebits.map((t) => t.party)).size.toString() }]} />
        <SummaryCard to="/report/highest" code="11" title="Highest Transactions" subtitle="Top transactions by value (credit & debit)." stats={[{ label: "Top Cr", value: formatINR(htCredit), accent: "positive" }, { label: "Top Db", value: formatINR(htDebit) }, { label: "Items", value: highestTns.length.toString() }]} />
        <SummaryCard to="/report/internal" code="12" title="Internal & Group" subtitle="Inter-company and promoter related-party flows." stats={[{ label: "In", value: formatINR(igCredit), accent: "positive" }, { label: "Out", value: formatINR(igDebit), accent: "negative" }, { label: "Parties", value: new Set(internalGroup.map((i) => i.party)).size.toString() }]} />
        <SummaryCard to="/report/circular" code="13" title="Circular Flows" subtitle="Round-trip transaction chains - fraud risk." stats={[{ label: "Chains", value: circular.length.toString(), accent: "negative" }, { label: "Value", value: formatINR(circAmt), accent: "negative" }, { label: "Critical", value: circular.filter((c) => c.risk === "critical").length.toString(), accent: "negative" }]} />
        <SummaryCard to="/report/net" code="14" title="Net Transactions" subtitle="Net of credits minus debits, month by month." stats={[{ label: "Net", value: formatINR(netSum), accent: netSum >= 0 ? "positive" : "negative" }, { label: "Pos Mo", value: labels.monthsFraction(netTransactions.filter((n) => n.net > 0).length), accent: "positive" }, { label: "Neg Mo", value: labels.monthsFraction(netTransactions.filter((n) => n.net < 0).length), accent: "warning" }]} />
        <SummaryCard to="/report/salary" code="15" title="Salary" subtitle="Promoter / director salary credits." stats={[{ label: labels.totalLabel, value: formatINR(salTotal), accent: "positive" }, { label: "Avg/mo", value: formatINR(salAvg) }, { label: "Months", value: labels.monthsFraction(salary.length) }]} />
        <SummaryCard to="/report/staff" code="16" title="Staff Emoluments" subtitle="Headcount and total payroll spend trend." stats={[{ label: "Head", value: staffLast ? staffLast.count.toString() : "-" }, { label: "Latest", value: staffLast ? formatINR(staffLast.total) : "-" }, { label: "Avg/emp", value: staffLast ? formatINR(staffLast.avg) : "-" }]} />
        <SummaryCard to="/report/spend" code="17" title="Spend Analysis" subtitle="Where the money goes - category breakdown." stats={[{ label: "Total", value: formatINR(spendTotal) }, { label: "Top Cat", value: topSpend.category }, { label: "Cats", value: spendAnalysis.length.toString() }]} />
        <SummaryCard to="/report/bills" code="18" title="Bill Payments" subtitle="Recurring utility, telecom and statutory bills." stats={[{ label: "Billers", value: billPayments.length.toString() }, { label: "Mo Spend", value: formatINR(billsTotal) }, { label: "On-time", value: `${billPayments.filter((b) => b.consistent).length}/${billPayments.length}`, accent: "positive" }]} />
        <SummaryCard to="/report/recurring-debit" code="19" title="Recurring Debits" subtitle="Repeating outflows - EMIs, utilities, taxes." stats={[{ label: "Mer", value: recurringDebit.length.toString() }, { label: labels.totalLabel, value: formatINR(rdTotal) }, { label: "Occ", value: recurringDebit.reduce((a, r) => a + r.occurrences, 0).toString() }]} />
        <SummaryCard to="/report/recurring-credit" code="20" title="Recurring Credits" subtitle="Repeating inflows from customers and clients." stats={[{ label: "Sources", value: recurringCredit.length.toString() }, { label: labels.totalLabel, value: formatINR(rcTotal), accent: "positive" }, { label: "Occ", value: recurringCredit.reduce((a, r) => a + r.occurrences, 0).toString() }]} />
      </div>
    </Panel>
  );
}
