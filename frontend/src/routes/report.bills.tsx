import { createFileRoute } from "@tanstack/react-router";
import { RawSheet } from "@/components/report/RawSheet";
import { Panel, DataTable } from "@/components/report/primitives";
import { SectionHead } from "@/components/report/SectionHead";
import { ModuleExcelButton } from "@/components/report/ModuleExcelButton";
import { billPayments, formatINR } from "@/data/reportData";

export const Route = createFileRoute("/report/bills")({ component: Page });
function Page() {
  return (
    <div className="space-y-6">
      <SectionHead
        code="18"
        title="Bill Payments"
        subtitle="Utility, telecom and statutory recurring payments — consistency is a positive credit signal."
        action={<ModuleExcelButton module="bill-payments" />}
      />
      <Panel title="Recurring Bill Pay">
        <DataTable
          columns={[
            { key: "biller", label: "Biller" },
            { key: "category", label: "Category" },
            { key: "monthly", label: "Avg Monthly", align: "right", mono: true, render: r => formatINR(r.monthly) },
            { key: "lastPaid", label: "Last Paid", mono: true },
            { key: "consistent", label: "Consistent", render: r => r.consistent ? <span className="text-[color:var(--positive)]">✓ on time</span> : <span className="text-[color:var(--negative)]">irregular</span> },
          ]}
          rows={billPayments}
        />
      </Panel>
      <RawSheet name="Bill Payments" />
    </div>
  );
}

