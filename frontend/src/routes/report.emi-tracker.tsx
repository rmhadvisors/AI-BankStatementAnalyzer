import { createFileRoute } from "@tanstack/react-router";
import { RawSheet } from "@/components/report/RawSheet";
import { Panel, Stat } from "@/components/report/primitives";
import { SectionHead } from "@/components/report/SectionHead";
import { ModuleExcelButton } from "@/components/report/ModuleExcelButton";
import { loans, formatINR } from "@/data/reportData";
import { useScopedReport } from "@/hooks/useScopedReport";

export const Route = createFileRoute("/report/emi-tracker")({ component: Page });

function Page() {
  const { emiTracker, labels } = useScopedReport();
  const lenders = loans.filter(l => l.emi);
  const months = Array.from(new Set(emiTracker.map(e => e.month)));
  const grid = lenders.map(l => ({
    lender: l.lender,
    type: l.type,
    cells: months.map(m => emiTracker.find(e => e.month === m && e.lender === l.lender)!),
  }));
  const bounced = emiTracker.filter(e => e.status === "Bounced").length;
  const adherence = emiTracker.length
    ? `${(((emiTracker.length - bounced) / emiTracker.length) * 100).toFixed(1)}%`
    : "—";

  return (
    <div className="space-y-6">
      <SectionHead
        code="08"
        title="EMI Tracker"
        subtitle="Month-wise EMI adherence across all active loans — green is paid, red is bounce."
        action={<ModuleExcelButton module="emi-tracker" />}
      />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="EMI Adherence" value={adherence} accent="positive" />
        <Stat label="Bounces" value={bounced.toString()} accent="negative" delta={labels.periodSubtitle} />
        <Stat label="Total EMI Paid" value={formatINR(emiTracker.filter(e=>e.status==="Paid").reduce((a,e)=>a+e.emiDue,0))} accent="neutral" />
      </div>
      <Panel title="Adherence Grid">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 text-left">Lender</th>
                {months.map(m => <th key={m} className="px-2 py-2 text-center">{m}</th>)}
              </tr>
            </thead>
            <tbody>
              {grid.map(g => (
                <tr key={g.lender + g.type} className="border-t border-border">
                  <td className="px-3 py-2">
                    <div className="font-medium">{g.lender}</div>
                    <div className="text-[10px] text-muted-foreground">{g.type} · {g.cells[0] ? formatINR(g.cells[0].emiDue) : "—"}</div>
                  </td>
                  {g.cells.map((c, i) => (
                    <td key={i} className="px-2 py-2 text-center">
                      {c ? (
                        <div className={`mx-auto h-6 w-6 rounded ${c.status==="Paid" ? "bg-[color:var(--positive)]/25 text-[color:var(--positive)]" : "bg-[color:var(--negative)]/30 text-[color:var(--negative)]"} flex items-center justify-center text-[10px] font-bold`}>
                          {c.status==="Paid" ? "✓" : "✗"}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <RawSheet name="EMI Tracker" />
    </div>
  );
}
