import { useMemo, useState } from "react";
import { formatINR } from "@/data/reportData";
import {
  buildTransactionSummary,
  groupTransactionsByParty,
  type SummaryTxn,
  type TransactionSummaryRow,
} from "@/lib/transactionSummary";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";

type Props = {
  transactions: SummaryTxn[];
};

function formatAmount(value: number): string {
  return value > 0 ? formatINR(value) : "₹0";
}

export function TransactionSummaryTable({ transactions }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const summary = useMemo(() => buildTransactionSummary(transactions), [transactions]);

  const byLabel = useMemo(() => groupTransactionsByParty(transactions), [transactions]);

  const toggle = (party: string) => {
    setExpanded((current) => (current === party ? null : party));
  };

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
            <th className="w-8 px-2 py-2" aria-hidden />
            <th className="px-3 py-2 text-left font-medium">Transaction</th>
            <th className="px-3 py-2 text-right font-medium">No. of Transactions</th>
            <th className="px-3 py-2 text-right font-medium">Debit Amount</th>
            <th className="px-3 py-2 text-right font-medium">Credit Amount</th>
            <th className="px-3 py-2 text-right font-medium">Net Transaction</th>
          </tr>
        </thead>
        <tbody>
          {summary.map((row) => (
            <SummaryGroup
              key={row.party}
              row={row}
              open={expanded === row.party}
              onToggle={() => toggle(row.party)}
              details={byLabel.get(row.party) ?? []}
            />
          ))}
        </tbody>
      </table>
      {summary.length === 0 && (
        <div className="p-8 text-center text-sm text-muted-foreground">No transactions in this period.</div>
      )}
    </div>
  );
}

function SummaryGroup({
  row,
  open,
  onToggle,
  details,
}: {
  row: TransactionSummaryRow;
  open: boolean;
  onToggle: () => void;
  details: SummaryTxn[];
}) {
  return (
    <>
      <tr
        className={cn(
          "border-b border-border cursor-pointer transition-colors",
          open ? "bg-primary/5" : "hover:bg-muted/40",
        )}
        onClick={onToggle}
      >
        <td className="px-2 py-2.5 text-muted-foreground">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </td>
        <td className="px-3 py-2.5 font-medium text-primary">{row.party}</td>
        <td className="px-3 py-2.5 text-right font-mono">{row.txnCount}</td>
        <td className="px-3 py-2.5 text-right font-mono">{formatAmount(row.debit)}</td>
        <td className="px-3 py-2.5 text-right font-mono text-[color:var(--positive)]">
          {formatAmount(row.credit)}
        </td>
        <td
          className={cn(
            "px-3 py-2.5 text-right font-mono font-medium",
            row.net >= 0 ? "text-[color:var(--positive)]" : "text-[color:var(--negative)]",
          )}
        >
          {formatINR(row.net)}
        </td>
      </tr>
      {open && (
        <tr className="border-b border-border bg-muted/20">
          <td colSpan={6} className="p-0">
            <div className="px-3 py-3 border-t border-border/60">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Transactions</div>
                  <div className="text-xs font-semibold">
                    {row.party} · {details.length} transaction{details.length === 1 ? "" : "s"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Collapse
                </button>
              </div>
              <div className="rounded-md border border-border overflow-hidden bg-background">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-2 py-1.5 text-left">Party</th>
                      <th className="px-2 py-1.5 text-left">Date</th>
                      <th className="px-2 py-1.5 text-left">Type</th>
                      <th className="px-2 py-1.5 text-right">Debit</th>
                      <th className="px-2 py-1.5 text-right">Credit</th>
                      <th className="px-2 py-1.5 text-left">Narration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.map((txn, idx) => (
                      <tr key={`${txn.dateText}-${idx}`} className="border-t border-border/60">
                        <td className="px-2 py-1.5">{txn.party ?? "—"}</td>
                        <td className="px-2 py-1.5 font-mono whitespace-nowrap">{txn.dateText ?? "—"}</td>
                        <td className="px-2 py-1.5">{txn.direction ?? "—"}</td>
                        <td className="px-2 py-1.5 text-right font-mono">
                          {txn.debit ? formatINR(txn.debit) : "—"}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono">
                          {txn.credit ? formatINR(txn.credit) : "—"}
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground max-w-[280px] truncate" title={txn.narration}>
                          {txn.narration ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
