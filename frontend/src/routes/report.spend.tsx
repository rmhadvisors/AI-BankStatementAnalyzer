import { createFileRoute } from "@tanstack/react-router";
import { RawSheet } from "@/components/report/RawSheet";
import { Panel } from "@/components/report/primitives";
import { SectionHead } from "@/components/report/SectionHead";
import { ModuleExcelButton } from "@/components/report/ModuleExcelButton";
import { spendAnalysis, formatINR } from "@/data/reportData";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

export const Route = createFileRoute("/report/spend")({ component: Page });
function Page() {
  return (
    <div className="space-y-6">
      <SectionHead
        code="17"
        title="Spend Analysis"
        subtitle="Categorised debit breakdown across 220+ classes."
        action={<ModuleExcelButton module="spend-analysis" />}
      />
      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Category Mix">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={spendAnalysis} dataKey="amount" nameKey="category" outerRadius={120} innerRadius={70} paddingAngle={2}>
                  {spendAnalysis.map((c,i)=><Cell key={i} fill={c.color}/>)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatINR(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Top Categories">
          <ul className="space-y-3">
            {spendAnalysis.map(s => (
              <li key={s.category}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{s.category}</span>
                  <span className="num text-muted-foreground">{formatINR(s.amount)} · {s.pct}%</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${s.pct*2}%`, background: s.color }} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <RawSheet name="Spend Analysis" />
    </div>
  );
}

