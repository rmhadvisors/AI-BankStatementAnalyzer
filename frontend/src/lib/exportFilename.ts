type ReportForExport = {
  applicant?: { name?: string; banks?: Array<{ name?: string }> };
  accountInfo?: { bank?: string; accountName?: string; accountNumber?: string };
};

export function sanitizeFilenamePart(value: string, maxLen = 60): string {
  return (
    value
      .replace(/[<>:"/\\|?*]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLen) || "Export"
  );
}

function formatBankDisplayName(raw: string): string {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return "Bank";
  const upper = text.toUpperCase();
  if (upper.includes("HDFC")) return "HDFC Bank Ltd";
  if (upper.includes("IDFC")) return "IDFC First Bank";
  if (upper.includes("ICICI")) return "ICICI Bank";
  if (upper.includes("AXIS") || upper.includes("UTIB")) return "Axis Bank";
  if (upper.includes("SBI") || upper.includes("STATE BANK")) return "State Bank of India";
  if (upper.includes("KOTAK") || upper.includes("KKBK")) return "Kotak Mahindra Bank";
  if (upper.includes("BARODA") || upper.includes("BARB")) return "Bank of Baroda";
  if (upper.includes("UNION")) return "Union Bank of India";
  if (upper.includes("IDBI")) return "IDBI Bank";
  return text;
}

function accountNumberSuffix(accountNumber: string): string {
  const digits = accountNumber.replace(/\D/g, "");
  if (digits.length >= 4) return digits.slice(-4);
  const cleaned = accountNumber.trim();
  return cleaned.length > 0 ? cleaned.slice(-4) : "0000";
}

function filenameBaseParts(report: ReportForExport): { client: string; bank: string; account: string } {
  const client = sanitizeFilenamePart(
    report.applicant?.name || report.accountInfo?.accountName || "Client",
  );
  const bank = sanitizeFilenamePart(
    formatBankDisplayName(report.accountInfo?.bank || report.applicant?.banks?.[0]?.name || "Bank"),
  );
  const account = sanitizeFilenamePart(
    accountNumberSuffix(report.accountInfo?.accountNumber || ""),
    12,
  );
  return { client, bank, account };
}

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
  const { client, bank, account } = filenameBaseParts(report);
  const modulePart = options?.moduleLabel
    ? `_${sanitizeFilenamePart(MODULE_FILENAME_LABELS[options.moduleLabel] ?? options.moduleLabel, 40)}`
    : "";
  return `${client}_${bank}_${account}${modulePart}.xlsx`;
}

export function buildMasterSummaryPdfTitle(reportOrClientName: ReportForExport | string): string {
  if (typeof reportOrClientName === "string") {
    return `MasterSummary_${sanitizeFilenamePart(reportOrClientName)}`;
  }

  const client = sanitizeFilenamePart(
    reportOrClientName.applicant?.name || reportOrClientName.accountInfo?.accountName || "Client",
  );

  return `MasterSummary_${client}`;
}
