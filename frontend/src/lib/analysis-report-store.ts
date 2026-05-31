import { useSyncExternalStore } from "react";

const REPORT_KEY = "rmh-bsa.latest-report";
const ANALYSIS_ID_KEY = "rmh-bsa.latest-analysis-id";

type Listener = () => void;

let latestAnalysisId: string | null = null;
let latestReport: unknown | null = null;
let version = 0;
const listeners = new Set<Listener>();

function hydrateFromStorage() {
  if (typeof window === "undefined") return;

  if (latestAnalysisId === null) {
    latestAnalysisId = window.localStorage.getItem(ANALYSIS_ID_KEY);
  }

  if (latestReport === null) {
    const raw = window.localStorage.getItem(REPORT_KEY);
    if (raw) {
      try {
        latestReport = JSON.parse(raw);
      } catch {
        latestReport = null;
      }
    }
  }
}

function notify() {
  version += 1;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeLatestReport(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLatestReportVersion() {
  return useSyncExternalStore(
    subscribeLatestReport,
    () => version,
    () => version,
  );
}

export function saveLatestReport(id: string, report: unknown) {
  if (typeof window === "undefined") return;

  latestAnalysisId = id;
  latestReport = report;
  window.localStorage.setItem(ANALYSIS_ID_KEY, id);
  window.localStorage.setItem(REPORT_KEY, JSON.stringify(report));
  notify();
}

export function getLatestAnalysisId(): string | null {
  hydrateFromStorage();
  if (typeof window === "undefined") return latestAnalysisId;
  return latestAnalysisId ?? window.localStorage.getItem(ANALYSIS_ID_KEY);
}

export function getLatestReport<T = unknown>(): T | null {
  hydrateFromStorage();
  if (typeof window === "undefined") return null;

  return (latestReport ?? null) as T | null;
}
