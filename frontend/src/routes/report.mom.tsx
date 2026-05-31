import { createFileRoute } from "@tanstack/react-router";
import { RawSheet } from "@/components/report/RawSheet";
import { Panel, DataTable } from "@/components/report/primitives";
import { SectionHead } from "@/components/report/SectionHead";
import { ModuleExcelButton } from "@/components/report/ModuleExcelButton";
import { formatINR } from "@/data/reportData";
import { useScopedReport } from "@/hooks/useScopedReport";
import { DailyFlowChart } from "@/components/report/PeriodCharts";

export const Route = createFileRoute("/report/mom")({ component: Page });

function Page() {
  const { momSummary, labels, monthCount, dailyFlow, monthLabel } = useScopedReport();

  return (
    <div className="space-y-6">
      <SectionHead
        code="04"
        title="Month-on-Month Summary"
        subtitle={`All major banking parameters · ${labels.isMonthly ? labels.periodSubtitle : `${monthCount} months`}`}
        action={<ModuleExcelButton module="mom-summary" />}
      />
      {labels.isMonthly && dailyFlow.length >= 2 && (
        <Panel title={`Daily flow · ${monthLabel}`} subtitle="Credits and debits by calendar day">
          <DailyFlowChart data={dailyFlow} monthLabel={monthLabel} />
        </Panel>
      )}
      <Panel title={labels.isMonthly ? `${monthLabel} banking parameters` : "MoM banking parameters"}>
        <DataTable dense
          columns={[
            { key: "month", label: "Month" },
            { key: "openingBal", label: "Opening", align: "right", mono: true, render: r => formatINR(r.openingBal) },
            { key: "closingBal", label: "Closing", align: "right", mono: true, render: r => formatINR(r.closingBal) },
            { key: "totalCredits", label: "Credits", align: "right", mono: true, render: r => formatINR(r.totalCredits) },
            { key: "totalDebits", label: "Debits", align: "right", mono: true, render: r => formatINR(r.totalDebits) },
            { key: "netFlow", label: "Net", align: "right", mono: true, render: r => <span className={r.netFlow >= 0 ? "text-[color:var(--positive)]" : "text-[color:var(--negative)]"}>{formatINR(r.netFlow)}</span> },
            { key: "cashDeposits", label: "Cash Dep", align: "right", mono: true, render: r => formatINR(r.cashDeposits) },
            { key: "cashWithdrawals", label: "Cash Wd", align: "right", mono: true, render: r => formatINR(r.cashWithdrawals) },
            { key: "upiCredit", label: "UPI Cr", align: "right", mono: true, render: r => formatINR(r.upiCredit) },
            { key: "upiDebit", label: "UPI Dr", align: "right", mono: true, render: r => formatINR(r.upiDebit) },
          ]}
          rows={momSummary}
        />
      </Panel>
      <RawSheet name="MoM Summary" initialRows={200} />
    </div>
  );
}
