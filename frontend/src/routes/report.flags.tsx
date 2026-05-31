import { createFileRoute } from "@tanstack/react-router";
import { RawSheet } from "@/components/report/RawSheet";
import { Panel, DataTable, SeverityBadge } from "@/components/report/primitives";
import { SectionHead } from "@/components/report/SectionHead";
import { ModuleExcelButton } from "@/components/report/ModuleExcelButton";
import { flags } from "@/data/reportData";

export const Route = createFileRoute("/report/flags")({ component: Page });

function Page() {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 } as Record<string, number>;
  flags.forEach(f => counts[f.severity]++);
  return (
    <div className="space-y-6">
      <SectionHead
        code="02"
        title="Flags & Risk Events"
        subtitle="All critical events observed across the bank statements with evidence trails."
        action={<ModuleExcelButton module="flags-risk" />}
      />
      <div className="grid grid-cols-4 gap-3">
        {(["critical","high","medium","low"] as const).map(k => (
          <div key={k} className="rounded-lg border border-border bg-card p-4">
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{k}</div>
            <div className="mt-1 text-3xl font-bold num"
              style={{ color: `var(--risk-${k})` }}>{counts[k]}</div>
          </div>
        ))}
      </div>
      <Panel title="All Flags" subtitle={`${flags.length} signals · expand any row for evidence`}>
        <div className="space-y-2">
          {flags.map(f => (
            <details key={f.sn} className="rounded-md border border-border bg-background/40 group">
              <summary className="flex items-start gap-3 p-3 cursor-pointer list-none">
                <span className="font-mono text-[10px] text-muted-foreground mt-1 w-6">#{String(f.sn).padStart(2,"0")}</span>
                <SeverityBadge level={f.severity} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{f.flag}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{f.category}</div>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground group-open:rotate-90 transition">▶</span>
              </summary>
              <div className="px-3 pb-3 pl-[5.25rem]">
                <p className="text-sm text-foreground/90">{f.description}</p>
                <div className="mt-2 inline-flex items-center gap-2 text-[10px] font-mono text-muted-foreground border border-border rounded px-2 py-1">
                  EVIDENCE · {f.evidence}
                </div>
              </div>
            </details>
          ))}
        </div>
      </Panel>
      <RawSheet name="Flags" />
    </div>
  );
}

