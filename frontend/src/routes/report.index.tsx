import { createFileRoute } from "@tanstack/react-router";
import { RawSheet } from "@/components/report/RawSheet";
import { Panel, Stat, DataTable, SeverityBadge } from "@/components/report/primitives";
import { SectionHead } from "@/components/report/SectionHead";
import { ModuleExcelButton } from "@/components/report/ModuleExcelButton";
import { CreditsDebitsPeriodChart } from "@/components/report/PeriodCharts";
import { execSummary, applicant, flags, formatINR } from "@/data/reportData";
import { useScopedReport } from "@/hooks/useScopedReport";

type ExecSummaryColumnKey = keyof (typeof execSummary)[number];

export const Route = createFileRoute("/report/")({
  component: ExecPage,
});

function ExecPage() {
  const { momSummary, labels, momTotals, dailyFlow, monthLabel } = useScopedReport();
  const { totalCredits, totalDebits, netFlow, cashDeposits, cashWithdrawals, avgBalance } = momTotals;

  return (
    <div className="space-y-6">
      <SectionHead
        code="01"
        title="Executive Summary"
        subtitle={`Banking performance · ${labels.periodSubtitle}`}
        action={<ModuleExcelButton module="executive-summary" />}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat label="Total Credits" value={formatINR(totalCredits)} delta={labels.consolidatedDelta} accent="positive" />
        <Stat label="Total Debits" value={formatINR(totalDebits)} delta={labels.consolidatedDelta} accent="neutral" />
        <Stat label="Cash Deposits" value={formatINR(cashDeposits)} delta={labels.isMonthly ? "This month" : "Month totals"} accent="neutral" />
        <Stat label="Cash Withdrawals" value={formatINR(cashWithdrawals)} delta={labels.isMonthly ? "This month" : "Month totals"} accent="neutral" />
        <Stat label="Net Cash Flow" value={formatINR(netFlow)} delta={labels.isMonthly ? "Selected month" : "Month-on-month total"} accent="positive" />
        <Stat label="Avg Bank Balance" value={formatINR(avgBalance)} delta={labels.isMonthly ? "Month ABB" : "ABB across months"} accent="negative" />
      </div>

      <Panel title={labels.chartTitle} subtitle={labels.chartSubtitle}>
        <CreditsDebitsPeriodChart
          isMonthly={labels.isMonthly}
          monthLabel={monthLabel}
          momRows={momSummary}
          dailyFlow={dailyFlow}
        />
      </Panel>

      <Panel title="Particulars · Bank-wise breakdown">
        <DataTable
          columns={(() => {
            const banks = applicant.banks ?? [];
            const bank1 = banks[0];
            const bank2 = banks[1];
            const cols: Array<{ key: ExecSummaryColumnKey; label: string; align?: "right"; mono?: boolean }> = [
              { key: "particulars", label: "Particulars" },
              { key: "consolidated", label: "Consolidated", align: "right", mono: true },
            ];
            if (bank1) {
              cols.push({ key: "kotak", label: `${bank1.name} · ${bank1.account}`, align: "right", mono: true });
            }
            if (bank2) {
              cols.push({ key: "pnb", label: `${bank2.name} · ${bank2.account}`, align: "right", mono: true });
            }
            return cols;
          })()}
          rows={execSummary}
          dense
        />
      </Panel>

      <Panel title="Top Risk Flags" subtitle="Open the Flags section for full detail" action={<a href="/report/flags" className="text-xs text-primary">View all →</a>}>
        <div className="space-y-2">
          {flags.slice(0,4).map(f => (
            <div key={f.sn} className="flex items-start gap-3 p-3 rounded-md border border-border bg-background/40">
              <SeverityBadge level={f.severity} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{f.flag}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{f.description}</div>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">{f.evidence}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Account Roster">
        <div className="grid md:grid-cols-2 gap-3">
          {applicant.banks.map(b => (
            <div key={b.account} className="rounded-md border border-border p-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{b.branch}</div>
              <div className="mt-1 font-display font-semibold">{b.name}</div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">{b.account} · {b.ifsc}</div>
            </div>
          ))}
        </div>
      </Panel>
      <RawSheet name="Exec Summary" />
    </div>
  );
}
