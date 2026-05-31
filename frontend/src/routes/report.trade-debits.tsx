import { createFileRoute } from "@tanstack/react-router";
import { RawSheet } from "@/components/report/RawSheet";
import { Panel, DataTable, Stat } from "@/components/report/primitives";
import { SectionHead } from "@/components/report/SectionHead";
import { ModuleExcelButton } from "@/components/report/ModuleExcelButton";
import { tradeDebits, formatINR } from "@/data/reportData";

export const Route = createFileRoute("/report/trade-debits")({ component: Page });
function Page() {
  const total = tradeDebits.reduce((a,t)=>a+t.amount,0);
  return (
    <div className="space-y-6">
      <SectionHead
        code="10"
        title="Trade Debits"
        subtitle="High-value vendor payments identified as trade-related outflows."
        action={<ModuleExcelButton module="trade-debits" />}
      />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Trade Debits" value={tradeDebits.length.toString()} />
        <Stat label="Total Value" value={formatINR(total)} accent="negative" />
        <Stat label="Top Vendor" value="Bombay Spinners" delta="₹34.6L · raw material" accent="neutral" mono={false}/>
      </div>
      <Panel title="Vendor Payments">
        <DataTable
          columns={[
            { key: "date", label: "Date", mono: true },
            { key: "party", label: "Vendor" },
            { key: "amount", label: "Amount", align: "right", mono: true, render: r => <span className="text-[color:var(--negative)]">{formatINR(r.amount)}</span> },
            { key: "mode", label: "Mode" },
            { key: "narration", label: "Narration" },
          ]}
          rows={tradeDebits}
        />
      </Panel>
      <RawSheet name="Trade Debits" />
    </div>
  );
}

