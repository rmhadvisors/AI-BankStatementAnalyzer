import { useCallback, useState } from "react";
import { downloadMasterPdf } from "@/lib/api";
import { getLatestAnalysisId } from "@/lib/analysis-report-store";
import { useExcelPeriodParams } from "@/contexts/PeriodContext";

export function useMasterPdfDownload() {
  const [downloading, setDownloading] = useState(false);
  const periodParams = useExcelPeriodParams();

  const downloadPdf = useCallback(async () => {
    const analysisId = getLatestAnalysisId();
    if (!analysisId) {
      alert("No analysis report found. Please upload and analyze a bank statement first.");
      return;
    }

    try {
      setDownloading(true);
      await downloadMasterPdf(analysisId, periodParams);
    } catch (error) {
      console.error("Failed to download PDF:", error);
      alert(
        "Failed to download the PDF. Ensure the backend is running and Chrome or Edge is installed (or set CHROME_PATH).",
      );
      throw error;
    } finally {
      setDownloading(false);
    }
  }, [periodParams]);

  return { downloading, downloadPdf };
}
