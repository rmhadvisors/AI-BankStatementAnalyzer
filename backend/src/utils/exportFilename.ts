import type { ExtractedStatement } from "../analysis/types";
import {
  accountId,
  accountNumberSuffix,
  bankName,
  formatBankDisplayName,
  resolveAccountHolderName,
} from "../analysis/utils";

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

export function buildStatementExcelFilename(
  statement: Pick<ExtractedStatement, "accountInfo" | "fileName">,
  options?: { moduleLabel?: string },
): string {
  const pseudo: ExtractedStatement = {
    fileName: statement.fileName,
    accountInfo: statement.accountInfo,
    transactions: [],
  };
  const client = sanitizeFilenamePart(resolveAccountHolderName(pseudo));
  const bank = sanitizeFilenamePart(bankName(pseudo));
  const account = sanitizeFilenamePart(accountNumberSuffix(accountId(pseudo, 0)), 12);
  const modulePart = options?.moduleLabel
    ? `_${sanitizeFilenamePart(MODULE_FILENAME_LABELS[options.moduleLabel] ?? options.moduleLabel, 40)}`
    : "";
  return `${client}_${bank}_${account}${modulePart}.xlsx`;
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
  const { client, bank, account } = filenameBaseParts(report);
  const modulePart = options?.moduleLabel
    ? `_${sanitizeFilenamePart(MODULE_FILENAME_LABELS[options.moduleLabel] ?? options.moduleLabel, 40)}`
    : "";
  return `${client}_${bank}_${account}${modulePart}.xlsx`;
}

export function buildMasterSummaryPdfFilename(report: ReportForExport): string {
  const client = sanitizeFilenamePart(
    report.applicant?.name || report.accountInfo?.accountName || "Client",
  );

  return `MasterSummary_${client}.pdf`;
}
