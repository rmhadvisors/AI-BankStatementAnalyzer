/** Vercel project URLs: bank-statement-analyzer-frontend-{beige|chi|...}.vercel.app */
const VERCEL_FRONTEND_PATTERN =
  /^https:\/\/bank-statement-analyzer-frontend-[a-z0-9-]+\.vercel\.app$/;

const LOCAL_DEV_ORIGINS = ["http://localhost:5173", "http://localhost:5174"];

export function parseFrontendOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

export function isAllowedFrontendOrigin(origin: string, configuredOrigins: string[]): boolean {
  if (LOCAL_DEV_ORIGINS.includes(origin)) return true;
  if (configuredOrigins.includes(origin)) return true;
  if (VERCEL_FRONTEND_PATTERN.test(origin)) return true;
  return false;
}

export function listConfiguredOrigins(): string[] {
  return parseFrontendOrigins(process.env.FRONTEND_ORIGIN);
}
