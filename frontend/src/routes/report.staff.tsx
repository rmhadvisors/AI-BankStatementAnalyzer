import { createFileRoute } from "@tanstack/react-router";
import { RawSheet } from "@/components/report/RawSheet";
import { Panel, DataTable, Stat } from "@/components/report/primitives";
import { SectionHead } from "@/components/report/SectionHead";
import { ModuleExcelButton } from "@/components/report/ModuleExcelButton";
import { formatINR } from "@/data/reportData";
import { useScopedReport } from "@/hooks/useScopedReport";

export const Route = createFileRoute("/report/staff")({ component: Page });
function Page() {
  const { staffEmoluments, labels } = useScopedReport();
  const total = staffEmoluments.reduce((a,s)=>a+s.total,0);
  const latest = staffEmoluments[staffEmoluments.length - 1];

  return (
    <div className="space-y-6">
      <SectionHead
        code="16"
        title="Staff Emoluments"
        subtitle="Aggregate payroll outflows with headcount and average salary trend."
        action={<ModuleExcelButton module="staff-emoluments" />}
      />
      <div className="grid grid-cols-3 gap-3">
        <Stat label={labels.totalLabel} value={formatINR(total)} accent="negative" />
        <Stat label="Headcount" value={latest ? latest.count.toString() : "—"} accent="positive" delta={latest?.month ?? labels.periodSubtitle} />
        <Stat label="Avg Per Employee" value={latest ? formatINR(latest.avg) : "—"} accent="neutral" delta={labels.isMonthly ? "This month" : "Latest month"} />
      </div>
      <Panel title="Monthly Payroll">
        <DataTable dense
          columns={[
            { key: "month", label: "Month" },
            { key: "count", label: "Employees", align: "right", mono: true },
            { key: "total", label: "Total Payout", align: "right", mono: true, render: r => formatINR(r.total) },
            { key: "avg", label: "Avg / Employee", align: "right", mono: true, render: r => formatINR(r.avg) },
          ]}
          rows={staffEmoluments}
        />
      </Panel>
      <RawSheet name="Staff Emoluments" />
    </div>
  );
}
