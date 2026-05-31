import { createFileRoute } from "@tanstack/react-router";
import { RawSheet } from "@/components/report/RawSheet";
import { Panel, DataTable, Stat } from "@/components/report/primitives";
import { SectionHead } from "@/components/report/SectionHead";
import { ModuleExcelButton } from "@/components/report/ModuleExcelButton";
import { formatINR } from "@/data/reportData";
import { useScopedReport } from "@/hooks/useScopedReport";

export const Route = createFileRoute("/report/bounce")({ component: Page });

function Page() {
  const { bounces, labels } = useScopedReport();
  const total = bounces.reduce((a, b) => a + b.amount, 0);
  const emiBounces = bounces.filter((b) => b.type.includes("EMI"));

  return (
    <div className="space-y-6">
      <SectionHead
        code="06"
        title="Bounce & Penal Charges"
        subtitle="Inward/outward returns, EMI bounces and bank-levied penalties."
        action={<ModuleExcelButton module="bounce-penal" />}
      />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total Bounces" value={bounces.length.toString()} accent="negative" delta={labels.periodSubtitle} />
        <Stat label="Bounce Amount" value={formatINR(total)} accent="negative" />
        <Stat label="EMI Bounces" value={emiBounces.length.toString()} accent="negative" delta={labels.isMonthly ? "This month" : "All periods"} />
      </div>
      <Panel title="Bounce Timeline" subtitle="Chronological with reason codes">
        <DataTable
          columns={[
            { key: "date", label: "Date", mono: true },
            { key: "type", label: "Type" },
            { key: "party", label: "Counterparty" },
            { key: "amount", label: "Amount", align: "right", mono: true, render: r => <span className="text-[color:var(--negative)]">{formatINR(r.amount)}</span> },
            { key: "reason", label: "Reason" },
            { key: "bank", label: "Account", mono: true },
          ]}
          rows={bounces}
        />
      </Panel>
      <RawSheet name="Bounce & Penal" />
    </div>
  );
}
