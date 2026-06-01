/// <reference lib="dom" />
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import puppeteer from "puppeteer-core";

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

  return process.platform === "darwin"
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : "google-chrome";
}

function buildPrintUrl(options: PdfOptions): string {
  const frontendOrigin =
    options.frontendOrigin || process.env.FRONTEND_ORIGIN || "http://localhost:5173";
  const url = new URL("/print/master", frontendOrigin);
  url.searchParams.set("id", options.analysisId);
  url.searchParams.set("filename", options.filename.replace(/\.pdf$/i, ""));
  url.searchParams.set("pdf", "1");

  for (const [key, value] of Object.entries(options.query || {})) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

async function generateWithSpawnFallback(url: string, outputPath: string): Promise<void> {
  const browser = findBrowserExecutable();
  const tempDir = path.dirname(outputPath);
  const userDataDir = path.join(tempDir, "profile");

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      browser,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--no-pdf-header-footer",
        "--virtual-time-budget=30000",
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
}

export async function generateMasterSummaryPdf(options: PdfOptions): Promise<Buffer> {
  const url = buildPrintUrl(options);
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "bsa-master-pdf-"));
  const outputPath = path.join(tempDir, options.filename);
  const executablePath = findBrowserExecutable();

  try {
    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 1800, deviceScaleFactor: 1 });
      await page.goto(url, { waitUntil: "networkidle0", timeout: 120_000 });

      await page.waitForFunction(
        () => (globalThis as { __BSA_PDF_READY__?: boolean }).__BSA_PDF_READY__ === true,
        { timeout: 120_000 },
      );

      await page.evaluate(() => {
        document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((anchor) => {
          const href = anchor.getAttribute("href");
          if (!href) return;
          try {
            anchor.href = new URL(href, window.location.origin).href;
          } catch {
            /* keep original */
          }
        });
      });

      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: "12mm", bottom: "14mm", left: "10mm", right: "10mm" },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  } catch (puppeteerError) {
    console.warn("Puppeteer PDF export failed, trying Chrome print fallback:", puppeteerError);
    await generateWithSpawnFallback(url, outputPath);
    const pdf = await fs.promises.readFile(outputPath);
    return pdf;
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}
