import { useMemo, useRef, useState } from "react";
import { Panel } from "./primitives";
import { rawSheets, type RawRow } from "@/data/rawSheets";
import {
  execSheet,
  flagsSheet,
  camSheet,
  momSheet,
  monthlyCFSheet,
  bounceSheet,
  loansSheet,
  emiTrackerSheet,
  tradeCreditsSheet,
  tradeDebitsSheet,
  highestTnsSheet,
  internalGroupSheet,
  circularSheet,
  netTransactionsSheet,
  salarySheet,
  staffEmolumentsSheet,
  spendAnalysisSheet,
  billPaymentsSheet,
  recurringDebitSheet,
  recurringCreditSheet,
  flags,
  applicant,
} from "@/data/reportData";

const LIVE_SHEET_MAP: Record<string, Array<Array<string | number | null>>> = {
  "Exec Summary": execSheet as unknown as Array<Array<string | number | null>>,
  Flags: flagsSheet as unknown as Array<Array<string | number | null>>,
  "CAM Analysis": camSheet as unknown as Array<Array<string | number | null>>,
  "MoM Summary": momSheet as unknown as Array<Array<string | number | null>>,
  "Monthly CF": monthlyCFSheet as unknown as Array<Array<string | number | null>>,
  "Bounce & Penal": bounceSheet as unknown as Array<Array<string | number | null>>,
  "Loans and EMI": loansSheet as unknown as Array<Array<string | number | null>>,
  "EMI Tracker": emiTrackerSheet as unknown as Array<Array<string | number | null>>,
  "Trade Credits": tradeCreditsSheet as unknown as Array<Array<string | number | null>>,
  "Trade Debits": tradeDebitsSheet as unknown as Array<Array<string | number | null>>,
  "Highest Tns": highestTnsSheet as unknown as Array<Array<string | number | null>>,
  "Internal & Group": internalGroupSheet as unknown as Array<Array<string | number | null>>,
  Circular: circularSheet as unknown as Array<Array<string | number | null>>,
  "Net Transactions": netTransactionsSheet as unknown as Array<Array<string | number | null>>,
  Salary: salarySheet as unknown as Array<Array<string | number | null>>,
  "Staff Emoluments": staffEmolumentsSheet as unknown as Array<Array<string | number | null>>,
  "Spend Analysis": spendAnalysisSheet as unknown as Array<Array<string | number | null>>,
  "Bill Payments": billPaymentsSheet as unknown as Array<Array<string | number | null>>,
  "Recurring Debit": recurringDebitSheet as unknown as Array<Array<string | number | null>>,
  "Recurring Credit": recurringCreditSheet as unknown as Array<Array<string | number | null>>,
};

const MODULE_SLUG_MAP: Record<string, string> = {
  "Exec Summary": "executive-summary",
  Flags: "flags-risk",
  "CAM Analysis": "cam-analysis",
  "MoM Summary": "mom-summary",
  "Monthly CF": "monthly-cash-flow",
  "Bounce & Penal": "bounce-penal",
  "Loans and EMI": "loans-emi",
  "EMI Tracker": "emi-tracker",
  "Trade Credits": "trade-credits",
  "Trade Debits": "trade-debits",
  "Highest Tns": "highest-transactions",
  "Internal & Group": "internal-group",
  Circular: "circular-flows",
  "Net Transactions": "net-transactions",
  Salary: "salary",
  "Staff Emoluments": "staff-emoluments",
  "Spend Analysis": "spend-analysis",
  "Bill Payments": "bill-payments",
  "Recurring Debit": "recurring-debits",
  "Recurring Credit": "recurring-credits",
};

function fmt(v: string | number | null): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") {
    if (Number.isInteger(v) && Math.abs(v) < 1e6) return v.toString();
    return v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }
  return String(v);
}

function isNumeric(v: string | number | null) {
  return typeof v === "number";
}

function colLetter(n: number): string {
  let s = "";
  n = n + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function resolveLiveRows(name: string): RawRow[] | undefined {
  const liveSource = LIVE_SHEET_MAP[name];
  if (!liveSource) return undefined;

  const live = Array.from(liveSource as unknown as Iterable<RawRow>);
  if (live.length === 0 && name === "Flags") {
    const flagList = Array.from(flags as unknown as Iterable<any>);
    if (flagList.length > 0) {
      const accountName = (applicant as any)?.name ?? "Applicant";
      return [
        [accountName, null, null, null, "Index"],
        ["Consolidated", null, null, null, "Go to top"],
        ["SN", "Flag Category", "Flag", "Flag Description", "Flag Colour"],
        ...flagList.map((f) => [
          f.sn ?? "",
          f.category ?? "",
          f.flag ?? "",
          f.description ?? "",
          f.severity ?? "",
        ]),
      ];
    }
  }

  return live.length > 0 ? live : undefined;
}

export function RawSheet({
  name,
  title,
  subtitle,
  initialRows = 50,
}: {
  name: keyof typeof rawSheets | string;
  title?: string;
  subtitle?: string;
  initialRows?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const rows = useMemo(() => {
    const live = resolveLiveRows(String(name));
    if (live) return live;
    return (rawSheets as Record<string, RawRow[]>)[name];
  }, [name]);

  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");

  const handleNavClick = () => {
    const el = containerRef.current;
    if (el) {
      el.scrollTop = 0;
    }
  };

  const filtered = useMemo(() => {
    if (!rows) return [] as { row: RawRow; originalIndex: number }[];
    const indexed = rows.map((row, i) => ({ row, originalIndex: i }));
    if (!query.trim()) return indexed;
    const q = query.toLowerCase();
    const header = indexed.slice(0, 1);
    const body = indexed.slice(1).filter(({ row }) =>
      row.some((c) => c !== null && String(c).toLowerCase().includes(q))
    );
    return [...header, ...body];
  }, [rows, query]);

  if (!rows || rows.length === 0) {
    return (
      <Panel title={title ?? String(name)} subtitle={subtitle ?? `Sheet: ${name}`}>
        <p className="text-xs text-muted-foreground">No raw rows captured for this sheet.</p>
      </Panel>
    );
  }

  const maxCols = Math.max(...rows.map((r) => r.length));
  const visible = expanded ? filtered : filtered.slice(0, initialRows + 1);
  const hidden = filtered.length - visible.length;

  return (
    <Panel
      title={title ?? String(name)}
      subtitle={subtitle ?? `${rows.length.toLocaleString()} rows × ${maxCols} cols`}
      action={
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter rows…"
            className="h-8 w-40 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary"
          />
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground hidden md:inline">
            {filtered.length.toLocaleString()} match
          </span>
        </div>
      }
    >
      <div
        ref={containerRef}
        className="excel-sheet max-h-[560px] overflow-auto rounded-md border border-border bg-background"
      >
        <table className="border-separate border-spacing-0 text-[11px] font-mono">
          <thead>
            <tr>
              <th className="excel-corner sticky top-0 left-0 z-30 w-12 min-w-12 border-r border-b border-border bg-muted text-[10px] font-semibold text-muted-foreground" />
              {Array.from({ length: maxCols }).map((_, ci) => (
                <th
                  key={ci}
                  className="sticky top-0 z-20 min-w-[120px] border-r border-b border-border bg-muted px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {colLetter(ci)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map(({ row, originalIndex }, vi) => {
              const isHeader = originalIndex === 0;
              const zebra = !isHeader && vi % 2 === 0;
              return (
                <tr key={originalIndex}>
                  <td className="sticky left-0 z-10 w-12 min-w-12 border-r border-b border-border bg-muted px-2 py-1 text-right text-[10px] font-semibold text-muted-foreground select-none">
                    {originalIndex + 1}
                  </td>
                  {Array.from({ length: maxCols }).map((_, ci) => {
                    const cell = row[ci] ?? null;
                    const isNav =
                      !isHeader && typeof cell === "string" && (cell === "Index" || cell === "Go to top");
                    const cls = isHeader
                      ? "bg-primary/10 text-foreground font-bold uppercase tracking-wider text-[10px]"
                      : zebra
                        ? "bg-muted/30"
                        : "bg-background";
                    const align = !isHeader && isNumeric(cell) ? "text-right tabular-nums" : "text-left";
                    const tone =
                      !isHeader && typeof cell === "number" && cell < 0
                        ? "text-[color:var(--negative)]"
                        : "";
                    const navTone = isNav ? "text-[color:var(--primary)] underline cursor-pointer" : "";
                    return (
                      <td
                        key={ci}
                        onClick={isNav ? handleNavClick : undefined}
                        className={`border-r border-b border-border px-2 py-1 whitespace-nowrap ${cls} ${align} ${tone} ${navTone}`}
                      >
                        {fmt(cell)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filtered.length > initialRows + 1 && (
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {expanded ? `Showing all ${filtered.length.toLocaleString()} rows` : `Showing ${initialRows} of ${filtered.length.toLocaleString()} rows`}
          </span>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:border-primary hover:text-primary transition"
          >
            {expanded ? "Collapse" : `Show all (+${hidden.toLocaleString()})`}
          </button>
        </div>
      )}
    </Panel>
  );
}

export function rawSheetModuleSlug(name: string): string {
  return MODULE_SLUG_MAP[name] ?? name.toLowerCase().replace(/\s+/g, "-");
}
