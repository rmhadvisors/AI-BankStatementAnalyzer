import { createFileRoute } from "@tanstack/react-router";
import { RawSheet } from "@/components/report/RawSheet";
import { Panel, DataTable } from "@/components/report/primitives";
import { SectionHead } from "@/components/report/SectionHead";
import { ModuleExcelButton } from "@/components/report/ModuleExcelButton";
import { highestTns, formatINR } from "@/data/reportData";

export const Route = createFileRoute("/report/highest")({ component: Page });
function Page() {
  return (
    <div className="space-y-6">
      <SectionHead
        code="11"
        title="Highest Transactions"
        subtitle="Top single-transaction events on either side — credit and debit."
        action={<ModuleExcelButton module="highest-transactions" />}
      />
      <Panel title="Top 10 by Value">
        <DataTable
          columns={[
            { key: "rank", label: "#", mono: true },
            { key: "date", label: "Date", mono: true },
            { key: "type", label: "Type", render: r => (
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${r.type==="Credit" ? "border-[color:var(--positive)]/40 text-[color:var(--positive)]" : "border-[color:var(--negative)]/40 text-[color:var(--negative)]"}`}>{r.type}</span>
            )},
            { key: "party", label: "Counterparty" },
            { key: "amount", label: "Amount", align: "right", mono: true, render: r => formatINR(r.amount) },
            { key: "narration", label: "Narration" },
          ]}
          rows={highestTns}
        />
      </Panel>
      <RawSheet name="Highest Tns" />
    </div>
  );
}

