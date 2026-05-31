import { createFileRoute } from "@tanstack/react-router";
import { RawSheet } from "@/components/report/RawSheet";
import { Panel, DataTable, Stat } from "@/components/report/primitives";
import { SectionHead } from "@/components/report/SectionHead";
import { ModuleExcelButton } from "@/components/report/ModuleExcelButton";
import { CashflowPeriodChart } from "@/components/report/PeriodCharts";
import { formatINR } from "@/data/reportData";
import { useScopedReport } from "@/hooks/useScopedReport";

export const Route = createFileRoute("/report/cashflow")({ component: Page });

function Page() {
  const { monthlyCF, labels, cfTotals, monthCount, monthLabel, momSummary } = useScopedReport();
  const totals = cfTotals;
  const deltaLabel = labels.isMonthly ? "This month" : `${monthCount} months`;

  return (
    <div className="space-y-6">
      <SectionHead
        code="05"
        title="Monthly Cash Flow"
        subtitle={labels.isMonthly ? `Cash movement for ${monthLabel}` : "Operating, investing and financing with closing balance trend."}
        action={<ModuleExcelButton module="monthly-cash-flow" />}
      />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Σ Operating CF" value={formatINR(totals.op)} accent={totals.op>=0?"positive":"negative"} delta={deltaLabel} />
        <Stat label="Σ Investing CF" value={formatINR(totals.inv)} accent={totals.inv>=0?"positive":"negative"} delta={deltaLabel} />
        <Stat label="Σ Financing CF" value={formatINR(totals.fin)} accent={totals.fin>=0?"positive":"negative"} delta={deltaLabel} />
      </div>
      <Panel
        title={labels.isMonthly ? `${monthLabel} cash bridge` : "Closing balance trajectory"}
        subtitle={labels.isMonthly ? "Opening → flows → closing for the selected month" : "End-of-month balance across the period"}
      >
        <CashflowPeriodChart
          isMonthly={labels.isMonthly}
          monthLabel={monthLabel}
          monthlyCF={monthlyCF}
          momRow={momSummary[0]}
        />
      </Panel>
      <Panel title="CF Breakdown">
        <DataTable dense
          columns={[
            { key: "month", label: "Month" },
            { key: "opening", label: "Opening", align: "right", mono: true, render: r => formatINR(r.opening) },
            { key: "operating", label: "Operating", align: "right", mono: true, render: r => formatINR(r.operating) },
            { key: "investing", label: "Investing", align: "right", mono: true, render: r => formatINR(r.investing) },
            { key: "financing", label: "Financing", align: "right", mono: true, render: r => formatINR(r.financing) },
            { key: "closing", label: "Closing", align: "right", mono: true, render: r => formatINR(r.closing) },
          ]}
          rows={monthlyCF}
        />
      </Panel>
      <RawSheet name="Monthly CF" />
    </div>
  );
}
