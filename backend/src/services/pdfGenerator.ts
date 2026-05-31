import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type PdfOptions = {
  filename: string;
  frontendOrigin?: string;
  analysisId: string;
  query?: Record<string, unknown>;
};

const WINDOWS_BROWSER_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

function findBrowserExecutable(): string {
  const envBrowser =
    process.env.CHROME_PATH ||
    process.env.CHROMIUM_PATH ||
    process.env.EDGE_PATH ||
    process.env.BROWSER_PATH;

  if (envBrowser && fs.existsSync(envBrowser)) {
    return envBrowser;
  }

  if (process.platform === "win32") {
    const found = WINDOWS_BROWSER_CANDIDATES.find((candidate) => fs.existsSync(candidate));
    if (found) return found;
  }

  return process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "google-chrome";
}

function buildPrintUrl(options: PdfOptions): string {
  const frontendOrigin =
    options.frontendOrigin || process.env.FRONTEND_ORIGIN || "http://localhost:5173";
  const url = new URL("/print/master", frontendOrigin);
  url.searchParams.set("id", options.analysisId);
  url.searchParams.set("filename", options.filename.replace(/\.pdf$/i, ""));

  for (const [key, value] of Object.entries(options.query || {})) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

export async function generateMasterSummaryPdf(options: PdfOptions): Promise<Buffer> {
  const browser = findBrowserExecutable();
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "bsa-master-pdf-"));
  const outputPath = path.join(tempDir, options.filename);
  const userDataDir = path.join(tempDir, "profile");
  const url = buildPrintUrl(options);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      browser,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--no-pdf-header-footer",
        "--virtual-time-budget=5000",
        `--user-data-dir=${userDataDir}`,
        `--print-to-pdf=${outputPath}`,
        url,
      ],
      { stdio: "ignore" },
    );

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Browser PDF export failed with exit code ${code ?? "unknown"}.`));
    });
  });

  const pdf = await fs.promises.readFile(outputPath);
  await fs.promises.rm(tempDir, { recursive: true, force: true });
  return pdf;
}
