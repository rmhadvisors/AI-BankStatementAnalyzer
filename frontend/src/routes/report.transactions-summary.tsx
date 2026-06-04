import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Panel } from "@/components/report/primitives";
import { SectionHead } from "@/components/report/SectionHead";
import { ModuleExcelButton } from "@/components/report/ModuleExcelButton";
import { TransactionSummaryTable } from "@/components/report/TransactionSummaryTable";
import { transactions, tradeCredits, tradeDebits } from "@/data/reportData";
import type { SummaryTxn } from "@/lib/transactionSummary";

function cleanGarbageFromText(text: string): string {
  if (!text) return "";
  let out = text;
  const patterns = [
    /STATEMENT PERIOD\s*:\s*\d{4}[-/]\d{2}[-/]\d{2}(?:\s+TO\s+\d{4}[-/]\d{2}[-/]\d{2})?/i,
    /STATEMENT PERIOD\s*:\s*\d{2}[-/]\d{2}[-/]\d{2,4}(?:\s+TO\s+\d{2}[-/]\d{2}[-/]\d{2,4})?/i,
    /OPENING BALANCE\s+TOTAL DEBIT\s+TOTAL CREDIT\s+CLOSING BALANCE\s*[\d,.\s-]*/i,
    /TOTAL DEBIT\s+TOTAL CREDIT\s+CLOSING BALANCE\s*[\d,.\s-]*/i,
    /TRANSACTION VALUE DATE PARTICULARS CHEQUE DEBIT CREDIT BALANCE DATE NO/i,
    /TRANSACTION VALUE DATE PARTICULARS/i,
    /CHEQUE DEBIT CREDIT BALANCE DATE NO/i,
    /VALUE DATE PARTICULARS CHEQUE DEBIT CREDIT BALANCE/i,
    /Opening Balance Total Debit Total Credit Closing Balance\s*[\d,.\s-]*/i,
    /Opening Balance Total Total Closing Balance\s*[\d,.\s-]*/i,
    /Transaction Value Date Particulars Cheque Debit Credit Balance Date No/i,
    /Value Date Particulars Cheque Debit Credit Balance/i,
    /\bValue Da\b/i
  ];
  for (const pattern of patterns) {
    out = out.replace(pattern, "");
  }
  return out.replace(/\s+/g, " ").trim();
}

export const Route = createFileRoute("/report/transactions-summary")({
  component: TransactionSummaryPage,
});

function TransactionSummaryPage() {
  const initialTxns = useMemo(() => {
    const list = transactions.length
      ? (transactions as SummaryTxn[])
      : [
          ...tradeCredits.map((t, idx) => ({
            id: `trade-credit-${idx}`,
            dateText: t.date,
            party: t.party,
            narration: t.narration,
            debit: 0,
            credit: t.amount,
            amount: t.amount,
            direction: "Credit" as const,
            category: "Trade Credit",
          })),
          ...tradeDebits.map((t, idx) => ({
            id: `trade-debit-${idx}`,
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
    return list.map((t, idx) => {
      const cleanParty = cleanGarbageFromText(t.party || "");
      const cleanNarration = cleanGarbageFromText(t.narration || "");
      return {
        ...t,
        party: cleanParty || "UNRECOGNIZED",
        narration: cleanNarration || "Transaction",
        id: t.id || `txn-${idx}`,
      };
    });
  }, []);

  const [overrides, setOverrides] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    const saved = window.localStorage.getItem("rmh-bsa.transaction-party-overrides");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  });

  const handleUpdateOverride = (txnId: string, newParty: string | null) => {
    setOverrides((current) => {
      const updated = { ...current };
      if (newParty === null || newParty.trim() === "") {
        delete updated[txnId];
      } else {
        updated[txnId] = newParty.trim();
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "rmh-bsa.transaction-party-overrides",
          JSON.stringify(updated),
        );
      }
      return updated;
    });
  };

  const enrichedTransactions = useMemo(() => {
    return initialTxns.map((t) => ({
      ...t,
      customParty: overrides[t.id || ""],
    }));
  }, [initialTxns, overrides]);

  return (
    <div className="space-y-6">
      <SectionHead
        code="00"
        title="Party Ledger (Counterparty Summary)"
        subtitle="Identify the actual counterparty across all payment modes and consolidate transactions under that party."
      />

      <Panel
        title="Transaction Summary (Party-wise)"
        action={<ModuleExcelButton module="transactions-summary" />}
      >
        {/* <p className="text-xs text-muted-foreground mb-4">
          Each row is a normalized counterparty (person, business, or entity). Transactions via UPI, IMPS, NEFT,
          RTGS, cheques, SI/ACH, card, cash, and other modes that belong to the same party are merged together.
          Bank metadata such as UTR/reference IDs, SWEEP/SETTLEMENT tags, and SI references are stripped out; only
          low-confidence rows remain in <span className="font-mono">UNRECOGNIZED</span>. Think of this as a Party
          Ledger Analysis Engine rather than a simple merchant categorization view.
        </p> */}
        <TransactionSummaryTable
          transactions={enrichedTransactions}
          onUpdateOverride={handleUpdateOverride}
        />
      </Panel>
    </div>
  );
}

