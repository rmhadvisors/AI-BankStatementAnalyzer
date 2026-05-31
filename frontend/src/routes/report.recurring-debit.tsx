import { createFileRoute } from "@tanstack/react-router";
import { RawSheet } from "@/components/report/RawSheet";
import { Panel, DataTable, Stat } from "@/components/report/primitives";
import { SectionHead } from "@/components/report/SectionHead";
import { ModuleExcelButton } from "@/components/report/ModuleExcelButton";
import { recurringDebit, formatINR } from "@/data/reportData";
import { useScopedReport } from "@/hooks/useScopedReport";

export const Route = createFileRoute("/report/recurring-debit")({ component: Page });
function Page() {
  const { labels, monthCount } = useScopedReport();
  const monthly = recurringDebit.reduce((a,r)=>a+r.amount,0);
  const annualized = labels.isMonthly ? monthly : monthly * monthCount;

  return (
    <div className="space-y-6">
      <SectionHead
        code="19"
        title="Recurring Debits"
        subtitle="Predictable monthly outflows that reduce free cash flow."
        action={<ModuleExcelButton module="recurring-debits" />}
      />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Recurring Streams" value={recurringDebit.length.toString()} />
        <Stat label="Monthly Burden" value={formatINR(monthly)} accent="negative" />
        <Stat label={labels.annualLabel} value={formatINR(annualized)} accent="negative" />
      </div>
      <Panel title="Recurring Debit Streams">
        <DataTable
          columns={[
            { key: "merchant", label: "Merchant / Payee" },
            { key: "frequency", label: "Frequency" },
            { key: "amount", label: "Amount", align: "right", mono: true, render: r => formatINR(r.amount) },
            { key: "occurrences", label: "Occurrences", align: "right", mono: true },
            { key: "lastDate", label: "Last Seen", mono: true },
          ]}
          rows={recurringDebit}
        />
      </Panel>
      <RawSheet name="Recurring Debit" />
    </div>
  );
}
