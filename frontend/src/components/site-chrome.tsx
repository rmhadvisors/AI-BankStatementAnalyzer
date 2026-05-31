import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <div className="relative h-8 w-8">
        <div className="absolute inset-0 rounded-md bg-primary/20 blur-md group-hover:bg-primary/40 transition" />
        <div className="relative h-8 w-8 rounded-md bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 12h3l2-7 4 14 2-7h3M19 12l2 2-2 2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="font-display font-bold text-base tracking-tight">RMH<span className="text-primary">.</span>BSA</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-[0.18em] -mt-0.5">BANK STATEMENT ANALYZER</div>
        </div>
      )}
    </Link>
  );
}

export function SiteHeader() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const onReport = path.startsWith("/report");
  if (onReport) return null;
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border"
    >
      <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between">
        <Brand />
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          <a href="#capabilities" className="hover:text-foreground transition">Capabilities</a>
          <a href="#workflow" className="hover:text-foreground transition">Workflow</a>
          <a href="#security" className="hover:text-foreground transition">Security</a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/upload" className="hidden sm:inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-3 py-2">
            Sign in
          </Link>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition glow-primary"
          >
            Launch Analyzer
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}

export function SiteFooter() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  if (path.startsWith("/report")) return null;
  return (
    <footer className="border-t border-border mt-32">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div className="col-span-2">
          <Brand />
          <p className="text-muted-foreground mt-4 max-w-sm">
            AI-powered bank statement analysis for credit underwriting, fraud detection and financial investigation.
          </p>
        </div>
        <div>
          <div className="font-medium mb-3">Product</div>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/upload" className="hover:text-foreground">Analyzer</Link></li>
            <li><Link to="/report" className="hover:text-foreground">Sample Report</Link></li>
            <li><a href="#capabilities" className="hover:text-foreground">Capabilities</a></li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-3">Company</div>
          <ul className="space-y-2 text-muted-foreground">
            <li>About</li><li>Security</li><li>Contact</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-muted-foreground">
          <div>© 2026 RMH Intelligence. All rights reserved.</div>
          <div className="font-mono">ISO 27001 · SOC 2 Type II · RBI Compliant</div>
        </div>
      </div>
    </footer>
  );
}
