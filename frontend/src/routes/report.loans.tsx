import { createFileRoute } from "@tanstack/react-router";
import { RawSheet } from "@/components/report/RawSheet";
import { Panel, DataTable, Stat } from "@/components/report/primitives";
import { SectionHead } from "@/components/report/SectionHead";
import { ModuleExcelButton } from "@/components/report/ModuleExcelButton";
import { loans, formatINR } from "@/data/reportData";

export const Route = createFileRoute("/report/loans")({ component: Page });

function Page() {
  const active = loans.filter(l => l.status === "Active");
  const outstanding = active.reduce((a, l) => a + l.outstanding, 0);
  const emi = active.reduce((a, l) => a + (l.emi ?? 0), 0);
  return (
    <div className="space-y-6">
      <SectionHead
        code="07"
        title="Loans & EMI Obligations"
        subtitle="All active borrowings with sanctioned, outstanding and concurrent EMI exposure."
        action={<ModuleExcelButton module="loans-emi" />}
      />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Active Loans" value={active.length.toString()} delta={`${loans.length - active.length} closed`} accent="neutral" />
        <Stat label="Total Outstanding" value={formatINR(outstanding)} accent="negative" />
        <Stat label="Monthly EMI Burden" value={formatINR(emi)} delta="of monthly inflow ≈ 0.9%" accent="neutral" />
      </div>
      <Panel title="Loan Register">
        <DataTable
          columns={[
            { key: "lender", label: "Lender" },
            { key: "type", label: "Facility" },
            { key: "sanctioned", label: "Sanctioned", align: "right", mono: true, render: r => formatINR(r.sanctioned) },
            { key: "outstanding", label: "Outstanding", align: "right", mono: true, render: r => formatINR(r.outstanding) },
            { key: "emi", label: "EMI", align: "right", mono: true, render: r => r.emi ? formatINR(r.emi) : "—" },
            { key: "rate", label: "Rate", align: "right", mono: true },
            { key: "tenor", label: "Tenor" },
            { key: "status", label: "Status", render: r => (
              <span className={`text-xs px-2 py-0.5 rounded-full border ${r.status==="Active" ? "border-[color:var(--positive)]/40 text-[color:var(--positive)]" : "border-border text-muted-foreground"}`}>{r.status}</span>
            )},
          ]}
          rows={loans}
        />
      </Panel>
      <RawSheet name="Loans and EMI" />
    </div>
  );
}

