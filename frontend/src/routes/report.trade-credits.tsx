import { createFileRoute } from "@tanstack/react-router";
import { RawSheet } from "@/components/report/RawSheet";
import { Panel, DataTable, Stat } from "@/components/report/primitives";
import { SectionHead } from "@/components/report/SectionHead";
import { ModuleExcelButton } from "@/components/report/ModuleExcelButton";
import { tradeCredits, formatINR } from "@/data/reportData";

export const Route = createFileRoute("/report/trade-credits")({ component: Page });
function Page() {
  const total = tradeCredits.reduce((a,t)=>a+t.amount,0);
  return (
    <div className="space-y-6">
      <SectionHead
        code="09"
        title="Trade Credits"
        subtitle="High-value customer receipts identified as trade-related inflows."
        action={<ModuleExcelButton module="trade-credits" />}
      />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Trade Credits" value={tradeCredits.length.toString()} />
        <Stat label="Total Value" value={formatINR(total)} accent="positive" />
        <Stat label="Top Customer" value="Mahalaxmi Ent." delta="₹41.2L over 12mo" accent="neutral" mono={false}/>
      </div>
      <Panel title="Customer Receipts">
        <DataTable
          columns={[
            { key: "date", label: "Date", mono: true },
            { key: "party", label: "Customer" },
            { key: "amount", label: "Amount", align: "right", mono: true, render: r => <span className="text-[color:var(--positive)]">{formatINR(r.amount)}</span> },
            { key: "mode", label: "Mode" },
            { key: "narration", label: "Narration" },
          ]}
          rows={tradeCredits}
        />
      </Panel>
      <RawSheet name="Trade Credits" />
    </div>
  );
}

