import { createFileRoute } from "@tanstack/react-router";
import { RawSheet } from "@/components/report/RawSheet";
import { Panel, DataTable } from "@/components/report/primitives";
import { SectionHead } from "@/components/report/SectionHead";
import { ModuleExcelButton } from "@/components/report/ModuleExcelButton";
import { CamPeriodChart } from "@/components/report/PeriodCharts";
import { formatINR } from "@/data/reportData";
import { useScopedReport } from "@/hooks/useScopedReport";

export const Route = createFileRoute("/report/cam")({ component: Page });

function Page() {
  const { camAnalysis, labels, monthLabel } = useScopedReport();

  return (
    <div className="space-y-6">
      <SectionHead
        code="03"
        title="CAM Analysis"
        subtitle={labels.isMonthly ? `Credit appraisal metrics · ${monthLabel}` : "Month-wise data points for Credit Appraisal Memo preparation."}
        action={<ModuleExcelButton module="cam-analysis" />}
      />
      <Panel title={labels.isMonthly ? "Month CAM snapshot" : "Credits, debits & ABB"} subtitle={labels.periodSubtitle}>
        <CamPeriodChart isMonthly={labels.isMonthly} monthLabel={monthLabel} camRows={camAnalysis} />
      </Panel>
      <Panel title="Monthly CAM Table">
        <DataTable dense
          columns={[
            { key: "month", label: "Month" },
            { key: "netCreditCount", label: "# Cr", align: "right", mono: true },
            { key: "netCredit", label: "Net Credit", align: "right", mono: true, render: r => formatINR(r.netCredit) },
            { key: "netDebitCount", label: "# Dr", align: "right", mono: true },
            { key: "netDebit", label: "Net Debit", align: "right", mono: true, render: r => formatINR(r.netDebit) },
            { key: "iwReturnCount", label: "I/W Ret", align: "right", mono: true, render: r => `${r.iwReturnCount} · ${formatINR(r.iwReturn)}` },
            { key: "owReturnCount", label: "O/W Ret", align: "right", mono: true, render: r => `${r.owReturnCount} · ${formatINR(r.owReturn)}` },
            { key: "abb", label: "ABB", align: "right", mono: true, render: r => formatINR(r.abb) },
            { key: "utilization", label: "Util.", align: "right", mono: true, render: r => `${(r.utilization*100).toFixed(1)}%` },
            { key: "intServiced", label: "Int Svc", align: "right", mono: true, render: r => formatINR(r.intServiced) },
          ]}
          rows={camAnalysis}
        />
      </Panel>
      <RawSheet name="CAM Analysis" />
    </div>
  );
}
