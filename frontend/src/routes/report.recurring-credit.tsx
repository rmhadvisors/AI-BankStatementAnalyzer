import { createFileRoute } from "@tanstack/react-router";
import { RawSheet } from "@/components/report/RawSheet";
import { Panel, DataTable, Stat } from "@/components/report/primitives";
import { SectionHead } from "@/components/report/SectionHead";
import { ModuleExcelButton } from "@/components/report/ModuleExcelButton";
import { recurringCredit, formatINR } from "@/data/reportData";

export const Route = createFileRoute("/report/recurring-credit")({ component: Page });
function Page() {
  return (
    <div className="space-y-6">
      <SectionHead
        code="20"
        title="Recurring Credits"
        subtitle="Predictable inflows that strengthen serviceability."
        action={<ModuleExcelButton module="recurring-credits" />}
      />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Recurring Streams" value={recurringCredit.length.toString()} accent="positive" />
        <Stat label="Top Source" value="Mahalaxmi Ent." accent="positive" mono={false} delta="11 occurrences"/>
        <Stat label="Quality" value="High" accent="positive" mono={false} delta="3 of 4 monthly/regular"/>
      </div>
      <Panel title="Recurring Credit Streams">
        <DataTable
          columns={[
            { key: "source", label: "Source" },
            { key: "frequency", label: "Frequency" },
            { key: "avgAmount", label: "Avg Amount", align: "right", mono: true, render: r => formatINR(r.avgAmount) },
            { key: "occurrences", label: "Occurrences", align: "right", mono: true },
            { key: "lastDate", label: "Last Seen", mono: true },
          ]}
          rows={recurringCredit}
        />
      </Panel>
      <RawSheet name="Recurring Credit" />
    </div>
  );
}

