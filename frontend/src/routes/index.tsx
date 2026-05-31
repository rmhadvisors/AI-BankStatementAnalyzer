import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { motion } from "framer-motion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RMH.BSA — AI Bank Statement Analyzer for Underwriting" },
      { name: "description", content: "Upload bank statements. Get fraud detection, cash-flow intelligence, EMI tracking and underwriting decisions in minutes." },
      { property: "og:title", content: "RMH.BSA — AI Bank Statement Analyzer" },
    ],
  }),
  component: Home,
});

const capabilities = [
  { tag: "01", title: "Fraud & Tamper Detection", desc: "Edited PDFs, font inconsistencies, duplicate transactions, mule-account behaviour, gambling and circular flows.", points: ["PDF forensics", "Circular trip detection", "Duplicate hashing"] },
  { tag: "02", title: "Cash-Flow Intelligence", desc: "Operating, investing and financing breakdowns with month-on-month volatility and stress signals.", points: ["Yearly & monthly views", "Liquidity runway", "Burn analysis"] },
  { tag: "03", title: "EMI & Liability Tracking", desc: "All active loans, EMI schedule adherence, bounce history and concurrent obligations from credit bureaus.", points: ["Live EMI tracker", "Bounce timeline", "Bureau reconciliation"] },
  { tag: "04", title: "Transaction Categorisation", desc: "Salary, UPI, vendor, statutory, recurring and one-off classification with merchant resolution.", points: ["220+ categories", "Merchant graph", "Salary detection"] },
  { tag: "05", title: "Behavioural Risk Signals", desc: "Weekend spikes, risky merchants, gambling, crypto, lifestyle inflation and financial-stress indicators.", points: ["Spending heatmaps", "Risky merchant DB", "Stress scoring"] },
  { tag: "06", title: "Underwriting Decision Engine", desc: "Composite risk score, AI verdict with rationale and recommended conditions ready for credit memo.", points: ["Risk score", "AI rationale", "CAM-ready export"] },
];


const workflow = [
  { step: "01", title: "Upload Statements", body: "Drop PDF, password-protected or scanned statements from any Indian bank. Multi-account supported." },
  { step: "02", title: "AI Parses & Classifies", body: "OCR + LLM extraction. 220+ categories. Salary, EMI, statutory and circular flows auto-flagged." },
  { step: "03", title: "Investigate the Report", body: "Bloomberg-style workspace with 20 analytical sections, drill-down evidence and AI commentary." },
  { step: "04", title: "Decide & Export", body: "Composite risk score, conditional verdict, and one-click Excel/PDF for the credit memo." },
];

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[900px] rounded-full bg-primary/10 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-32">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 backdrop-blur px-3 py-1.5 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--positive)] animate-pulse" />
              <span className="text-muted-foreground">Live</span>
              <span className="text-foreground">v3.2 · 220+ categories · RBI-compliant</span>
            </div>
            <h1 className="mt-6 font-display text-4xl sm:text-5xl md:text-7xl font-bold leading-[1.05] md:leading-[0.95] tracking-tight text-balance max-w-5xl">
              BANK STATEMENT ANALYZER,<br />
              read straight from the <span className="text-primary">bank statement</span>.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground text-balance">
              RMH.BSA turns raw PDF statements into a forensic, investigation-grade report —
              fraud signals, cash-flow stress, EMI adherence and a decisive underwriting verdict. In minutes.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link to="/upload" className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-6 py-3.5 font-medium hover:bg-primary/90 transition glow-primary">
                Analyze a statement
                <span aria-hidden>→</span>
              </Link>
              <Link to="/report" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-6 py-3.5 font-medium hover:bg-muted transition">
                View sample report
              </Link>
            </div>

            {/* Metrics strip */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden border border-border">
              {[
                { v: "2.4M+", l: "Statements analyzed" },
                { v: "98.7%", l: "Extraction accuracy" },
                { v: "< 90s", l: "Median analysis time" },
                { v: "₹38K Cr", l: "Underwriting decisions" },
              ].map(s => (
                <div key={s.l} className="bg-card p-5">
                  <div className="font-display text-3xl font-bold num">{s.v}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Floating terminal preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }}
            className="mt-20 relative rounded-xl border border-border bg-card/80 backdrop-blur overflow-hidden shadow-2xl hidden md:block">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--risk-critical)]/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--risk-medium)]/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--risk-low)]/70" />
              </div>
              <div className="ml-3 text-xs font-mono text-muted-foreground">lumen-bsa · XYZ Corporation · yearly / monthly</div>
              <div className="ml-auto text-[10px] font-mono text-muted-foreground">RISK 67 / 100 · MEDIUM</div>
            </div>
            <div className="grid grid-cols-12 divide-x divide-border">
              <div className="col-span-3 p-5 space-y-2 text-xs">
                {["Executive Summary","Risk & Fraud","Cash Flow","EMI Tracker","Transactions","Behavior","Investigation"].map((t,i)=>(
                  <div key={t} className={`px-3 py-2 rounded ${i===1?"bg-primary/15 text-primary":"text-muted-foreground"}`}>{t}</div>
                ))}
              </div>
              <div className="col-span-9 p-5">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Fraud Signals · full period</div>
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {[
                    { l: "Circular flows", v: "3", c: "var(--risk-critical)" },
                    { l: "EMI bounces", v: "2", c: "var(--risk-high)" },
                    { l: "Cash > 20%", v: "23.4%", c: "var(--risk-medium)" },
                  ].map(k => (
                    <div key={k.l} className="rounded-md border border-border p-4">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.l}</div>
                      <div className="mt-2 text-3xl font-bold num" style={{ color: k.c }}>{k.v}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 h-32 rounded-md border border-border bg-background/40 flex items-end gap-1 p-3">
                  {Array.from({ length: 48 }).map((_, i) => (
                    <div key={i} className="flex-1 rounded-sm" style={{
                      height: `${(20 + Math.abs(Math.sin(i / 3)) * 80).toFixed(2)}%`,
                      background: i === 18 || i === 36 ? "var(--risk-critical)" : "var(--primary)",
                      opacity: i === 18 || i === 36 ? 1 : 0.55,
                    }}/>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section id="workflow" className="border-y border-border bg-card/40">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-24">
          <div className="text-xs uppercase tracking-[0.2em] text-primary mb-3">Workflow</div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight max-w-3xl">From PDF to verdict in four moves.</h2>
          <div className="mt-10 md:mt-14 grid sm:grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden border border-border">
            {workflow.map(s => (
              <div key={s.step} className="bg-background p-6">
                <div className="font-mono text-3xl font-bold text-primary">{s.step}</div>
                <div className="mt-4 font-display text-lg font-semibold">{s.title}</div>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section id="capabilities" className="max-w-7xl mx-auto px-6 py-20 md:py-24">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 md:gap-8 mb-10 md:mb-12">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-primary mb-3">Capabilities</div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight max-w-2xl">Built for investigation, not dashboards.</h2>
          </div>
          <p className="text-muted-foreground max-w-md hidden md:block">Every signal an underwriter, fraud analyst or CA actually looks for — surfaced with evidence trails ready for audit.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden border border-border">
          {capabilities.map(c => (
            <div key={c.tag} className="bg-card p-6 md:p-7 hover:bg-muted/40 transition">
              <div className="font-mono text-xs text-primary">{c.tag}</div>
              <div className="mt-3 font-display text-xl font-semibold">{c.title}</div>
              <p className="mt-2 text-sm text-muted-foreground">{c.desc}</p>
              <ul className="mt-5 space-y-1.5 text-xs">
                {c.points.map(p => (
                  <li key={p} className="flex items-center gap-2 font-mono text-muted-foreground">
                    <span className="h-px w-3 bg-primary" />{p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>


      {/* CTA */}
      <section id="security" className="relative overflow-hidden border-t border-border">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative max-w-5xl mx-auto px-6 py-24 text-center">
          <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-balance">
            Stop reading statements.<br/>Start <span className="text-primary">underwriting</span> them.
          </h2>
          <p className="mt-5 text-muted-foreground max-w-2xl mx-auto">SOC 2 Type II · ISO 27001 · RBI-compliant. Your data never leaves Indian soil.</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/upload" className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-6 py-3.5 font-medium hover:bg-primary/90 transition glow-primary">
              Analyze your first statement
              <span aria-hidden>→</span>
            </Link>
            <Link to="/report" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-6 py-3.5 font-medium hover:bg-muted transition">
              See the sample
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
