import { createFileRoute } from "@tanstack/react-router";
import { RawSheet } from "@/components/report/RawSheet";
import { Panel, DataTable, Stat } from "@/components/report/primitives";
import { SectionHead } from "@/components/report/SectionHead";
import { ModuleExcelButton } from "@/components/report/ModuleExcelButton";
import { formatINR } from "@/data/reportData";
import { useScopedReport } from "@/hooks/useScopedReport";

export const Route = createFileRoute("/report/salary")({ component: Page });
function Page() {
  const { salary, labels } = useScopedReport();
  const total = salary.reduce((a,s)=>a+s.amount,0);

  return (
    <div className="space-y-6">
      <SectionHead
        code="15"
        title="Salary Income"
        subtitle="Detected salary credits with payer consistency and growth tracking."
        action={<ModuleExcelButton module="salary" />}
      />
      <div className="grid grid-cols-3 gap-3">
        <Stat label={labels.totalLabel} value={formatINR(total)} accent="positive" />
        <Stat label="Months Detected" value={labels.monthsFraction(salary.length)} accent="positive" />
        <Stat label="Avg / Month" value={formatINR(salary.length ? total / salary.length : 0)} accent="positive" delta="consistent dates" />
      </div>
      <Panel title="Salary Credits">
        <DataTable
          columns={[
            { key: "month", label: "Month" },
            { key: "date", label: "Credit Date", mono: true },
            { key: "payer", label: "Payer" },
            { key: "amount", label: "Amount", align: "right", mono: true, render: r => formatINR(r.amount) },
            { key: "consistent", label: "Consistent", render: () => <span className="text-[color:var(--positive)]">✓</span> },
          ]}
          rows={salary}
        />
      </Panel>
      <RawSheet name="Salary" />
    </div>
  );
}
