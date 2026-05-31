import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Brand } from "@/components/site-chrome";
import { ThemeToggle } from "@/components/theme-toggle";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { applicant, accountInfo, riskScore, aiRecommendation, flags, momSummary, bounces, circular, formatINR } from "@/data/reportData";
import { downloadMasterExcel, downloadMasterPdf, getAnalysis } from "@/lib/api";
import { useLatestReportVersion } from "@/lib/analysis-report-store";
import { getLatestAnalysisId, getLatestReport, saveLatestReport } from "@/lib/analysis-report-store";
import { buildMasterSummaryPdfTitle } from "@/lib/exportFilename";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { PeriodProvider } from "@/contexts/PeriodContext";
import { PeriodSelector } from "@/components/report/PeriodSelector";

type AnalysisSeverity = "critical" | "high" | "medium" | "low";
type SeverityKey = keyof typeof severityOrder;
type RiskReason = { sn: number; severity: string; flag: string; description: string };

const severityOrder = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
} as const;

const severityDot = {
  critical: "bg-[color:var(--risk-critical)]",
  high: "bg-[color:var(--risk-high)]",
  medium: "bg-[color:var(--risk-medium)]",
  low: "bg-[color:var(--risk-low)]",
} as const;

type NavSubItem = { to: string; label: string };
type NavItem = { to: string; label: string; code: string; subItems?: NavSubItem[] };

const nav: { group: string; items: NavItem[] }[] = [
  { group: "Overview", items: [
    {
      to: "/report/overview",
      label: "Master Summary",
      code: "00",
      subItems: [
        { to: "/report/transactions-summary", label: "Transaction Summary" },
      ],
    },
  ]},
  { group: "Decision", items: [
    { to: "/report", label: "Executive Summary", code: "01" },
    { to: "/report/flags", label: "Flags & Risk", code: "02" },
    { to: "/report/cam", label: "CAM Analysis", code: "03" },
    { to: "/report/mom", label: "MoM Summary", code: "04" },
  ]},
  { group: "Cash & Liability", items: [
    { to: "/report/cashflow", label: "Monthly Cash Flow", code: "05" },
    { to: "/report/bounce", label: "Bounce & Penal", code: "06" },
    { to: "/report/loans", label: "Loans & EMI", code: "07" },
    { to: "/report/emi-tracker", label: "EMI Tracker", code: "08" },
  ]},
  { group: "Transactions", items: [
    { to: "/report/trade-credits", label: "Trade Credits", code: "09" },
    { to: "/report/trade-debits", label: "Trade Debits", code: "10" },
    { to: "/report/highest", label: "Highest Transactions", code: "11" },
    { to: "/report/internal", label: "Internal & Group", code: "12" },
    { to: "/report/circular", label: "Circular Flows", code: "13" },
    { to: "/report/net", label: "Net Transactions", code: "14" },
  ]},
  { group: "Income & Behavior", items: [
    { to: "/report/salary", label: "Salary", code: "15" },
    { to: "/report/staff", label: "Staff Emoluments", code: "16" },
    { to: "/report/spend", label: "Spend Analysis", code: "17" },
    { to: "/report/bills", label: "Bill Payments", code: "18" },
    { to: "/report/recurring-debit", label: "Recurring Debits", code: "19" },
    { to: "/report/recurring-credit", label: "Recurring Credits", code: "20" },
  ]},
];

function RiskGauge({ value, compact = false }: { value: number; compact?: boolean }) {
  const dash = (value / 100) * 188;
  const color =
    value >= 80 ? "var(--risk-low)" :
    value >= 60 ? "var(--risk-medium)" :
    value >= 40 ? "var(--risk-high)" : "var(--risk-critical)";
  return (
    <div className={cn("relative", compact ? "h-12 w-20" : "h-20 w-32")}>
      <svg viewBox="0 0 120 70" className="w-full h-full">
        <path d="M10 60 A 50 50 0 0 1 110 60" stroke="var(--muted)" strokeWidth="8" fill="none" strokeLinecap="round"/>
        <motion.path d="M10 60 A 50 50 0 0 1 110 60" stroke={color} strokeWidth="8" fill="none" strokeLinecap="round"
          strokeDasharray="188" initial={{ strokeDashoffset: 188 }} animate={{ strokeDashoffset: 188 - dash }} transition={{ duration: 1, ease: "easeOut" }}/>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-0.5">
        <div className={cn("font-display font-bold num", compact ? "text-base leading-none" : "text-2xl")} style={{ color }}>{value}</div>
        {!compact && <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Risk Score</div>}
      </div>
    </div>
  );
}

function RiskGaugeWithReasons({ value, compact = false, reasons }: { value: number; compact?: boolean; reasons: RiskReason[] }) {
  const topReasons = Array.from(reasons)
    .sort((a, b) => {
      const aKey = (a.severity in severityOrder ? a.severity : "low") as SeverityKey;
      const bKey = (b.severity in severityOrder ? b.severity : "low") as SeverityKey;
      return severityOrder[aKey] - severityOrder[bKey];
    })
    .slice(0, 3);

  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div className="cursor-help">
          <RiskGauge value={value} compact={compact} />
        </div>
      </HoverCardTrigger>
      <HoverCardContent align="end" sideOffset={8} className="w-72">
        <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Score reasons</div>
        {topReasons.length === 0 ? (
          <div className="mt-2 text-xs text-muted-foreground">No risk flags available.</div>
        ) : (
          <ul className="mt-2 space-y-2">
            {topReasons.map((reason) => (
              <li key={reason.sn} className="flex gap-2 text-xs">
                <span
                  className={cn(
                    "mt-1 h-2 w-2 rounded-full",
                    severityDot[(reason.severity in severityDot ? reason.severity : "low") as SeverityKey]
                  )}
                />
                <div>
                  <div className="font-medium text-foreground">{reason.flag}</div>
                  <div className="text-[11px] text-muted-foreground">{reason.description}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

function SideNavBody({ path, onNavigate }: { path: string; onNavigate?: () => void }) {
  return (
    <nav className="p-3 space-y-5">
      {nav.map(g => (
        <div key={g.group}>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-2 mb-2">{g.group}</div>
          <ul className="space-y-0.5">
            {g.items.map(it => {
              const subActive = it.subItems?.some((sub) => path === sub.to || path.startsWith(`${sub.to}/`));
              const active = subActive || path === it.to || (it.to !== "/report" && path.startsWith(it.to));
              return (
                <li key={it.to}>
                  <Link to={it.to} onClick={onNavigate} className={cn(
                    "flex items-center gap-2.5 px-2.5 py-1.5 rounded text-xs transition group",
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-sidebar-foreground/70 hover:text-foreground hover:bg-sidebar-accent"
                  )}>
                    <span className={cn("font-mono text-[10px] w-5 tabular-nums",
                      active ? "text-primary" : "text-muted-foreground")}>{it.code}</span>
                    <span className="truncate">{it.label}</span>
                    {active && <span className="ml-auto h-1 w-1 rounded-full bg-primary" />}
                  </Link>
                  {active && it.subItems && (
                    <div className="ml-7 mt-1 space-y-1">
                      {it.subItems.map((sub) => {
                        const subActive = path === sub.to || path.startsWith(`${sub.to}/`);
                        return (
                          <Link
                            key={sub.to}
                            to={sub.to}
                            onClick={onNavigate}
                            className={cn(
                              "block text-[11px] px-2 py-1 rounded transition",
                              subActive
                                ? "bg-primary/15 text-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                            )}
                          >
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function AIPanelBody() {
  const totalCredits = momSummary.reduce((sum, month) => sum + month.totalCredits, 0);
  const totalDebits = momSummary.reduce((sum, month) => sum + month.totalDebits, 0);
  const netCashFlow = momSummary.reduce((sum, month) => sum + month.netFlow, 0);
  const avgBalance = momSummary.reduce((sum, month) => sum + month.abb, 0) / Math.max(momSummary.length, 1);
  const severeFlags = flags.filter((flag) => flag.severity === "critical" || flag.severity === "high");

  return (
    <div className="p-5 space-y-5">
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> AI Verdict
        </div>
        <div className="mt-2 font-display text-base font-semibold">{aiRecommendation.verdict}</div>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{aiRecommendation.rationale}</p>
        <div className="mt-3 flex items-center justify-between text-[10px] font-mono">
          <span className="text-muted-foreground">Confidence</span>
          <span className="text-foreground">{Math.round(riskScore.confidence*100)}%</span>
        </div>
        <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${riskScore.confidence*100}%` }} />
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2">Conditions</div>
        <ul className="space-y-2">
          {aiRecommendation.conditions.map((c, i) => (
            <li key={i} className="text-xs text-foreground/90 flex gap-2">
              <span className="font-mono text-primary">{String(i+1).padStart(2,"0")}</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2">Critical Alerts</div>
        <ul className="space-y-2">
          {flags.filter(f => f.severity === "critical" || f.severity === "high").map(f => (
            <li key={f.sn} className="rounded-md border border-border bg-card p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground">{f.category}</span>
                <span className={cn("h-1.5 w-1.5 rounded-full",
                  f.severity === "critical" ? "bg-[color:var(--risk-critical)]" : "bg-[color:var(--risk-high)]")} />
              </div>
              <div className="text-xs font-medium mt-1">{f.flag}</div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Quick Stats</div>
        <dl className="mt-3 space-y-2 text-xs">
          <div className="flex justify-between"><dt className="text-muted-foreground">Total Credits</dt><dd className="num text-[color:var(--positive)]">{formatINR(totalCredits)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Total Debits</dt><dd className="num">{formatINR(totalDebits)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Net Cash Flow</dt><dd className="num text-[color:var(--positive)]">{formatINR(netCashFlow)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">ABB</dt><dd className="num">{formatINR(avgBalance)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Bounces</dt><dd className="num text-[color:var(--risk-high)]">{bounces.length}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Circular</dt><dd className="num text-[color:var(--risk-critical)]">{circular.length}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">High Risk Flags</dt><dd className="num">{severeFlags.length}</dd></div>
        </dl>
      </div>
    </div>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      {open
        ? <><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>
        : <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>}
    </svg>
  );
}

function readExcelPeriodParams(): Record<string, string> {
  try {
    const raw = localStorage.getItem("bsa-period-scope");
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { mode?: string; monthKey?: string };
    if (parsed.mode === "monthly" && parsed.monthKey) {
      return { period: "monthly", monthKey: parsed.monthKey };
    }
  } catch {
    /* ignore */
  }
  return {};
}

export function ReportLayout() {
  useLatestReportVersion();
  const location = useRouterState({ select: (r) => r.location });
  const [navOpen, setNavOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [downloadingMaster, setDownloadingMaster] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const primaryBank =
    applicant.banks?.[0]?.name || accountInfo?.bank || "";
  const primaryAccount =
    applicant.banks?.[0]?.account || accountInfo?.accountNumber || "";
  const accountSummary =
    primaryBank && primaryAccount
      ? `${primaryBank} · …${primaryAccount.slice(-4)}`
      : primaryBank || "";

  // close drawers on route change
  useEffect(() => { setNavOpen(false); setAiOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const searchId = new URLSearchParams(window.location.search).get("id");
    const analysisId = searchId || getLatestAnalysisId();
    const cachedReport = getLatestReport();

    if (!analysisId || cachedReport) {
      return;
    }

    let cancelled = false;

    void getAnalysis(analysisId)
      .then((result) => {
        if (cancelled || !result.report) return;
        saveLatestReport(result.id, result.report);
      })
      .catch(() => {
        // Keep the sample report visible if the backend is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const handleExportMasterPdf = async () => {
    const analysisId = getLatestAnalysisId();
    if (!analysisId) {
      alert("No analysis report found. Please upload and analyze a bank statement first.");
      return;
    }

    try {
      setDownloadingPdf(true);
      await downloadMasterPdf(analysisId, readExcelPeriodParams());
    } catch (error) {
      console.error("Failed to download PDF:", error);
      const filename = buildMasterSummaryPdfTitle({ applicant, accountInfo });
      const url = `${window.location.origin}/print/master?autoprint=1&filename=${encodeURIComponent(filename)}&id=${encodeURIComponent(analysisId)}`;
      window.open(url, "_blank", "noopener,noreferrer");
      alert("Automatic PDF download failed. Opened the print page as a fallback.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadMaster = async () => {
    const analysisId = getLatestAnalysisId();
    if (!analysisId) {
      alert("No analysis report found. Please upload and analyze a bank statement first.");
      return;
    }

    try {
      setDownloadingMaster(true);
      await downloadMasterExcel(analysisId, readExcelPeriodParams());
    } catch (error) {
      console.error("Failed to download Excel:", error);
      alert("Failed to download Excel file. Please try again.");
    } finally {
      setDownloadingMaster(false);
    }
  };

  return (
    <PeriodProvider>
    <div className="min-h-screen bg-background text-foreground">
      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 md:gap-6 px-3 md:px-5 py-2.5 md:py-3">
          <button
            onClick={() => setNavOpen(v => !v)}
            aria-label="Toggle navigation"
            className="lg:hidden inline-flex items-center gap-2 h-9 px-2.5 sm:px-3 rounded-md border border-border bg-card hover:bg-muted hover:border-primary/40 transition text-xs font-medium text-foreground/80"
          >
            <MenuIcon open={navOpen} />
            <span className="hidden sm:inline tracking-wide">Sections</span>
          </button>

          <Brand compact />
          <div className="hidden md:flex flex-col leading-tight min-w-0">
            <div className="font-display text-sm font-semibold truncate">{applicant.name}</div>
            <div className="text-[11px] text-muted-foreground font-mono truncate">
              {applicant.analysisId} · {applicant.period}
              {accountSummary ? ` · ${accountSummary}` : ""}
            </div>
          </div>
          <div className="hidden xl:flex items-center gap-3 ml-2 text-[11px]">
            {applicant.banks.map(b => (
              <span key={b.account} className="font-mono text-muted-foreground border border-border rounded px-2 py-1">
                {b.name.split(" ")[0]}·{b.account.slice(-4)}
              </span>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2 md:gap-3">
            <PeriodSelector className="hidden lg:flex" />
            <div className="hidden sm:block">
              <RiskGaugeWithReasons value={riskScore.value} reasons={flags} />
            </div>
            <div className="sm:hidden">
              <RiskGaugeWithReasons value={riskScore.value} compact reasons={flags} />
            </div>
            <div className="hidden md:block">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Decision</div>
              <div className="font-display text-sm font-semibold text-[color:var(--risk-medium)]">{riskScore.decision}</div>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 md:border-l md:border-border md:pl-3 md:ml-1">
              <ThemeToggle />
              <button
                onClick={handleDownloadMaster}
                disabled={downloadingMaster}
                className="hidden md:inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs hover:bg-muted transition font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v12m-4-4l4 4 4-4M4 20h16"/></svg>
                {downloadingMaster ? "Downloading..." : "Excel"}
              </button>
              <button
                type="button"
                onClick={handleExportMasterPdf}
                disabled={downloadingPdf}
                className="hidden md:inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-2 text-xs font-medium hover:bg-primary/90 transition"
              >
                {downloadingPdf ? "Downloading..." : "Export PDF"}
              </button>
              <button
                onClick={() => setAiOpen(v => !v)}
                aria-label="Toggle AI panel"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-2.5 sm:px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-sm"
                title="AI Verdict & Alerts"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.39 4.84L20 8l-4 3.9.94 5.5L12 14.77 7.06 17.4 8 11.9 4 8l5.61-1.16L12 2z" strokeLinejoin="round"/></svg>
                <span className="hidden sm:inline whitespace-nowrap">AI Verdict</span>
                <span className="sm:hidden">AI</span>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:hidden border-t border-border px-3 py-2">
          <PeriodSelector />
        </div>

        {/* mobile applicant strip */}
        <div className="md:hidden border-t border-border px-3 py-2 flex items-center justify-between text-[11px]">
          <div className="min-w-0">
            <div className="font-medium truncate">{applicant.name}</div>
            <div className="text-muted-foreground font-mono truncate">
              {applicant.analysisId} · {applicant.period}
              {accountSummary ? ` · ${accountSummary}` : ""}
            </div>
          </div>
          <div className="font-display text-xs font-semibold text-[color:var(--risk-medium)] ml-3 whitespace-nowrap">{riskScore.decision}</div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] min-h-[calc(100vh-64px)]">
        <aside className="hidden lg:block border-r border-sidebar-border bg-sidebar overflow-y-auto sticky top-[64px] max-h-[calc(100vh-64px)]">
          <SideNavBody path={location.pathname} />
        </aside>
        <main className="min-w-0">
          <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto lg:mx-0">
            <Outlet />
          </div>
        </main>
      </div>

      {/* MOBILE NAV DRAWER */}
      <AnimatePresence>
        {navOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setNavOpen(false)}
              className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-[80%] max-w-[300px] bg-sidebar border-r border-sidebar-border overflow-y-auto"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
                <Brand compact />
                <button onClick={() => setNavOpen(false)} aria-label="Close" className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted">
                  <MenuIcon open />
                </button>
              </div>
              <SideNavBody path={location.pathname} onNavigate={() => setNavOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* MOBILE AI PANEL DRAWER */}
      <AnimatePresence>
        {aiOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setAiOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-[88%] max-w-[360px] bg-card border-l border-border overflow-y-auto"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="text-xs uppercase tracking-[0.16em] text-primary">AI Verdict</div>
                <button onClick={() => setAiOpen(false)} aria-label="Close" className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted">
                  <MenuIcon open />
                </button>
              </div>
              <AIPanelBody />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
    </PeriodProvider>
  );
}
