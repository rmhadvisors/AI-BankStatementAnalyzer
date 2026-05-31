import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-chrome";
import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { createAnalysis } from "@/lib/api";
import { saveLatestReport } from "@/lib/analysis-report-store";

export const Route = createFileRoute("/upload")({
  head: () => ({ meta: [{ title: "Upload Bank Statement - RMH.BSA" }] }),
  component: Upload,
});

type UploadRow = {
  id: string;
  file: File;
  password: string;
};

function Upload() {
  const nav = useNavigate();
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [drag, setDrag] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback((incoming: File[]) => {
    const pdfs = incoming.filter((file) => /\.pdf$/i.test(file.name) || file.type === "application/pdf");
    setRows((prev) => [
      ...prev,
      ...pdfs.map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        password: "",
      })),
    ]);
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDrag(false);
      addFiles(Array.from(event.dataTransfer.files));
    },
    [addFiles],
  );

  const updatePassword = (id: string, password: string) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, password } : row)));
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const start = async () => {
    if (rows.length === 0 || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await createAnalysis({
        files: rows.map((row) => ({ file: row.file, password: row.password })),
      });

      if (result.report) {
        saveLatestReport(result.id, result.report);
      }

      await nav({ to: "/analyzing", search: { id: result.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-3">Step 1 of 3</div>
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">Upload bank statements</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">
          Drop PDF statements from any Indian bank. Client name and bank details are read automatically from each PDF.
        </p>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          className={`mt-10 rounded-xl border-2 border-dashed transition p-12 text-center ${drag ? "border-primary bg-primary/5" : "border-border bg-card/40"}`}
        >
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center text-primary">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="mt-4 font-display text-lg font-semibold">Drop PDF statements here</div>
          <div className="text-sm text-muted-foreground">or click to browse. PDF files up to 25 MB each.</div>
          <label className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium cursor-pointer hover:bg-primary/90 transition">
            Browse files
            <input
              type="file"
              hidden
              multiple
              accept=".pdf,application/pdf"
              onChange={(event) => event.target.files && addFiles(Array.from(event.target.files))}
            />
          </label>
        </div>

        {rows.length > 0 && (
          <div className="mt-8 rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <div className="text-sm font-medium">Uploaded statements</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Enter a password for each PDF if it is protected.
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="px-4 py-2.5 font-medium w-10">#</th>
                    <th className="px-4 py-2.5 font-medium">File</th>
                    <th className="px-4 py-2.5 font-medium w-24">Size</th>
                    <th className="px-4 py-2.5 font-medium min-w-[200px]">PDF password</th>
                    <th className="px-4 py-2.5 font-medium w-16" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-4 py-3 font-mono text-muted-foreground">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="shrink-0 rounded bg-primary/15 text-primary text-[10px] font-mono px-1.5 py-0.5">
                            PDF
                          </span>
                          <span className="truncate font-medium" title={row.file.name}>
                            {row.file.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs whitespace-nowrap">
                        {(row.file.size / 1024 / 1024).toFixed(1)} MB
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="password"
                          value={row.password}
                          onChange={(e) => updatePassword(row.id, e.target.value)}
                          autoComplete="off"
                          placeholder="Optional"
                          className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary/50"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          aria-label={`Remove ${row.file.name}`}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                          </svg>
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-md border border-[color:var(--risk-high)]/40 bg-[color:var(--risk-high)]/10 px-4 py-3 text-sm text-[color:var(--risk-high)]">
            {error}
          </div>
        )}

        <div className="mt-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-border pt-6">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" defaultChecked className="accent-[color:var(--primary)]" />
            Run full forensic analysis
          </label>
          <button
            onClick={start}
            disabled={rows.length === 0 || submitting}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-6 py-3 font-medium hover:bg-primary/90 transition glow-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
          >
            {submitting ? "Uploading..." : "Start AI Analysis"} <span aria-hidden>{"->"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
