import { createFileRoute } from "@tanstack/react-router";
import { Panel } from "@/components/report/primitives";
import { SectionHead } from "@/components/report/SectionHead";
import { ModuleExcelButton } from "@/components/report/ModuleExcelButton";
import { TransactionSummaryTable } from "@/components/report/TransactionSummaryTable";
import { transactions, tradeCredits, tradeDebits } from "@/data/reportData";
import type { SummaryTxn } from "@/lib/transactionSummary";

export const Route = createFileRoute("/report/transactions-summary")({
  component: TransactionSummaryPage,
});

function TransactionSummaryPage() {
  const baseTransactions: SummaryTxn[] = transactions.length
    ? (transactions as SummaryTxn[])
    : [
        ...tradeCredits.map((t) => ({
          dateText: t.date,
          party: t.party,
          narration: t.narration,
          debit: 0,
          credit: t.amount,
          amount: t.amount,
          direction: "Credit" as const,
          category: "Trade Credit",
        })),
        ...tradeDebits.map((t) => ({
          dateText: t.date,
          party: t.party,
          narration: t.narration,
          debit: t.amount,
          credit: 0,
          amount: t.amount,
          direction: "Debit" as const,
          category: "Trade Debit",
        })),
      ];

  return (
    <div className="space-y-6">
      <SectionHead
        code="00"
        title="Transaction Summary"
        subtitle="Party / merchant rollup with OCR repair and fuzzy merge. Expand a row to see related transactions for that entity."
      />

      <Panel
        title="Transaction Summary (Party-wise)"
        action={<ModuleExcelButton module="transactions-summary" />}
      >
        <p className="text-xs text-muted-foreground mb-4">
          Each row is a resolved merchant or party (Paytm variants, OCR splits like &quot;PH ONE&quot;, and SI mandates
          such as MSEDCL merge together). Only low-confidence rows stay in{" "}
          <span className="font-mono">UNRECOGNIZED</span>.
        </p>
        <TransactionSummaryTable transactions={baseTransactions} />
      </Panel>
    </div>
  );
}
