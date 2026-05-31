type ReportForExport = {
  applicant?: { name?: string; banks?: Array<{ name?: string }> };
  accountInfo?: { bank?: string; accountName?: string };
};

export function sanitizeFilenamePart(value: string, maxLen = 60): string {
  return (
    value
      .replace(/[<>:"/\\|?*]/g, "")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, maxLen) || "Export"
  );
}

/** Human-readable module slug for download filenames. */
export const MODULE_FILENAME_LABELS: Record<string, string> = {
  "transactions-summary": "Transaction_Summary",
  overview: "Overview",
  mom: "MoM_Summary",
  cashflow: "Cash_Flow",
  salary: "Salary",
  "emi-tracker": "EMI_Tracker",
};

export function buildExcelExportFilename(
  report: ReportForExport,
  options?: { moduleLabel?: string },
): string {
  const rawModule = options?.moduleLabel;
  const moduleLabel = rawModule
    ? MODULE_FILENAME_LABELS[rawModule] ?? rawModule
    : undefined;
  const client = sanitizeFilenamePart(
    report.applicant?.name || report.accountInfo?.accountName || "Client",
  );
  const bank = sanitizeFilenamePart(
    report.accountInfo?.bank || report.applicant?.banks?.[0]?.name || "Bank",
  );
  const modulePart = moduleLabel
    ? `_${sanitizeFilenamePart(moduleLabel, 40)}`
    : "_Master_Report";
  return `${client}_${bank}${modulePart}.xlsx`;
}

export function buildMasterSummaryPdfFilename(report: ReportForExport): string {
  const client = sanitizeFilenamePart(
    report.applicant?.name || report.accountInfo?.accountName || "Client",
  );

  return `MasterSummary_${client}.pdf`;
}
