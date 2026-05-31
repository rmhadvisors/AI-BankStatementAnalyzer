import { createFileRoute } from "@tanstack/react-router";
import { RawSheet } from "@/components/report/RawSheet";
import { Panel, DataTable } from "@/components/report/primitives";
import { SectionHead } from "@/components/report/SectionHead";
import { ModuleExcelButton } from "@/components/report/ModuleExcelButton";
import { internalGroup, formatINR } from "@/data/reportData";

export const Route = createFileRoute("/report/internal")({ component: Page });
function Page() {
  return (
    <div className="space-y-6">
      <SectionHead
        code="12"
        title="Internal & Group Transactions"
        subtitle="Movements between sister concerns, group companies and promoters."
        action={<ModuleExcelButton module="internal-group" />}
      />
      <Panel title="Inter-company & Promoter Movements">
        <DataTable
          columns={[
            { key: "date", label: "Date", mono: true },
            { key: "party", label: "Counterparty" },
            { key: "direction", label: "Direction", render: r => (
              <span className={r.direction==="Credit" ? "text-[color:var(--positive)]" : "text-[color:var(--negative)]"}>{r.direction}</span>
            )},
            { key: "amount", label: "Amount", align: "right", mono: true, render: r => formatINR(r.amount) },
            { key: "narration", label: "Narration" },
          ]}
          rows={internalGroup}
        />
      </Panel>
      <RawSheet name="Internal & Group" />
    </div>
  );
}

