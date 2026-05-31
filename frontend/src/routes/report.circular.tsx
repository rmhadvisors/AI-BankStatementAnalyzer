import { createFileRoute } from "@tanstack/react-router";
import { RawSheet } from "@/components/report/RawSheet";
import { Panel, Stat } from "@/components/report/primitives";
import { SectionHead } from "@/components/report/SectionHead";
import { ModuleExcelButton } from "@/components/report/ModuleExcelButton";
import { circular, formatINR } from "@/data/reportData";

export const Route = createFileRoute("/report/circular")({ component: Page });
function Page() {
  return (
    <div className="space-y-6">
      <SectionHead
        code="13"
        title="Circular Transactions"
        subtitle="Round-trip fund movements — strongest fraud signal for credit underwriting."
        action={<ModuleExcelButton module="circular-flows" />}
      />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Circular Chains" value={circular.length.toString()} accent="negative" />
        <Stat label="Total Round-tripped" value={formatINR(circular.reduce((a,c)=>a+c.amount,0))} accent="negative" />
        <Stat label="Tightest Window" value="24h" accent="negative" delta="Jan-22 chain" />
      </div>
      {circular.map(c => (
        <Panel key={c.id} title={`${c.id} · ${formatINR(c.amount)} in ${c.window}`} subtitle={c.date}>
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            {c.chain.split(" → ").map((node, i, arr) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`rounded-md border px-3 py-2 ${node.includes("XYZ Corp") ? "border-primary text-primary bg-primary/5" : "border-border bg-card"}`}>{node}</span>
                {i < arr.length - 1 && <span className="text-[color:var(--risk-critical)]">→</span>}
              </div>
            ))}
          </div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-[color:var(--risk-critical)]/30 bg-[color:var(--risk-critical)]/5 px-3 py-1.5 text-xs text-[color:var(--risk-critical)]">
            Risk · {c.risk.toUpperCase()} · evidence trail attached
          </div>
        </Panel>
      ))}
      <RawSheet name="Circular" />
    </div>
  );
}

