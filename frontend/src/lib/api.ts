import { getLatestReport } from "@/lib/analysis-report-store";
import { buildExcelExportFilename, buildMasterSummaryPdfTitle } from "@/lib/exportFilename";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

type AnalysisResponse = {
  id: string;
  status: "completed" | "failed";
  report?: unknown;
  code?: string;
  message?: string;
};

function getFilenameFromDisposition(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback;

  const match = disposition.match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i);
  if (!match || !match[1]) return fallback;

  const raw = match[1].trim();
  try {
    return decodeURIComponent(raw.replace(/\"/g, ""));
  } catch {
    return raw.replace(/\"/g, "");
  }
}

async function triggerDownload(response: Response, fallbackName: string): Promise<void> {
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  const filename = getFilenameFromDisposition(response.headers.get("Content-Disposition"), fallbackName);

  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function createAnalysis(params: {
  files: Array<{ file: File; password?: string }>;
}): Promise<AnalysisResponse> {
  const formData = new FormData();
  params.files.forEach(({ file, password }) => {
    formData.append("statement", file);
    formData.append("passwords", password || "");
  });

  const response = await fetch(`${API_BASE_URL}/api/analysis`, {
    method: "POST",
    body: formData,
  });
  const payload = (await response.json().catch(() => ({}))) as AnalysisResponse;

  if (!response.ok) {
    throw new Error(payload.message || "Analysis failed.");
  }

  return payload;
}

export async function getAnalysis(id: string): Promise<AnalysisResponse> {
  const response = await fetch(`${API_BASE_URL}/api/analysis/${encodeURIComponent(id)}`);
  const payload = (await response.json().catch(() => ({}))) as AnalysisResponse;

  if (!response.ok) {
    throw new Error(payload.message || "Could not load analysis.");
  }

  return payload;
}

/**
 * Download Excel file for a specific module
 */
export async function downloadModuleExcel(
  analysisId: string,
  moduleName: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<void> {
  const query = params
    ? "?" + new URLSearchParams(
        Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
          if (value === undefined || value === null || value === "") return acc;
          acc[key] = String(value);
          return acc;
        }, {}),
      ).toString()
    : "";

  const response = await fetch(
    `${API_BASE_URL}/api/analysis/${encodeURIComponent(analysisId)}/excel/${encodeURIComponent(moduleName)}${query}`
  );

  if (!response.ok) {
    throw new Error('Failed to download Excel file');
  }

  const report = getLatestReport<Parameters<typeof buildExcelExportFilename>[0]>() ?? {};
  await triggerDownload(
    response,
    buildExcelExportFilename(report, { moduleLabel: moduleName }),
  );
}

/**
 * Download master Excel file for the full report
 */
export async function downloadMasterExcel(
  analysisId: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<void> {
  const query = params
    ? "?" + new URLSearchParams(
        Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
          if (value === undefined || value === null || value === "") return acc;
          acc[key] = String(value);
          return acc;
        }, {}),
      ).toString()
    : "";

  const response = await fetch(
    `${API_BASE_URL}/api/analysis/${encodeURIComponent(analysisId)}/excel/master${query}`
  );

  if (!response.ok) {
    throw new Error("Failed to download Excel file");
  }

  const report = getLatestReport<Parameters<typeof buildExcelExportFilename>[0]>() ?? {};
  await triggerDownload(response, buildExcelExportFilename(report));
}

export async function downloadMasterPdf(
  analysisId: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<void> {
  const query = params
    ? "?" + new URLSearchParams(
        Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
          if (value === undefined || value === null || value === "") return acc;
          acc[key] = String(value);
          return acc;
        }, {}),
      ).toString()
    : "";

  const response = await fetch(
    `${API_BASE_URL}/api/analysis/${encodeURIComponent(analysisId)}/pdf/master${query}`,
  );

  if (!response.ok) {
    throw new Error("Failed to download PDF file");
  }

  const report = getLatestReport<Parameters<typeof buildMasterSummaryPdfTitle>[0]>() ?? {};
  await triggerDownload(response, `${buildMasterSummaryPdfTitle(report)}.pdf`);
}
