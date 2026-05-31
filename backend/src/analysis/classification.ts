import type { TransactionDirection } from "./types";

export function cleanNarration(value: string): string {
  return value.replace(/\s+/g, " ").replace(/[|]+/g, " ").trim();
}

export function classifyMode(narration: string): string {
  const text = narration.toUpperCase();
  if (/\bUPI\b/.test(text)) return "UPI";
  if (/\bRTGS\b/.test(text)) return "RTGS";
  if (/\bNEFT\b/.test(text)) return "NEFT";
  if (/\bIMPS\b/.test(text)) return "IMPS";
  if (/\bECS\b|\bNACH\b|\bACH\b/.test(text)) return "ECS/NACH";
  if (/\bATM\b/.test(text)) return "ATM";
  if (/\bCASH\b/.test(text)) return "CASH";
  if (/\bCHQ\b|\bCHEQUE\b|\bCLG\b/.test(text)) return "CHEQUE";
  return "OTHER";
}

export function classifyCategory(narration: string, direction: TransactionDirection): string {
  const text = narration.toUpperCase();
  if (/\bSALARY\b|\bPAYROLL\b|\bWAGES\b/.test(text)) return "Salary";
  if (/\bEMI\b|\bLOAN\b|\bFINANCE\b|\bNACH\b|\bECS\b/.test(text)) return "Loan & EMI";
  if (/\bGST\b|\bTDS\b|\bTAX\b|\bPF\b|\bESIC\b/.test(text)) return "Statutory";
  if (/\bELECTRIC|POWER|MSEB|UTILITY|GAS|WATER|BILL\b|AIRTEL|JIO|VODAFONE/.test(text)) return "Utilities";
  if (/\bRENT\b|\bLEASE\b/.test(text)) return "Rent";
  if (/\bCASH\b/.test(text)) return direction === "Credit" ? "Cash Deposit" : "Cash Withdrawal";
  if (/\bCHARGE\b|\bPENAL\b|\bBOUNCE\b|\bRETURN\b|\bINSUFFICIENT\b/.test(text)) return "Bank Charges";
  if (/\bUPI\b|\bPOS\b|\bCARD\b/.test(text)) return "Digital Payments";
  return direction === "Credit" ? "Trade Credit" : "Trade Debit";
}

const GENERIC_PARTY_TOKENS = new Set([
  "CR", "DR", "TRF", "TRANSFER", "TO", "FROM", "BY", "PAYMENT", "PAY", "CREDIT", "DEBIT",
  "UPI", "IMPS", "NEFT", "RTGS", "ACH", "NACH", "FUND", "FUNDS", "BIL", "REF", "REJECT",
  "FUNDS", "INSUFFICIENT", "INSUFFICENT", "MB", "TPT", "INF", "INFT", "REV", "REVERSAL",
]);

function isLikelyPartyToken(token: string): boolean {
  const upper = token.toUpperCase();
  if (GENERIC_PARTY_TOKENS.has(upper)) return false;
  if (/^\d{1,4}$/.test(token)) return false;
  if (/^\d{2}:\d{2}:\d{2}$/.test(token)) return false;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(token)) return false;
  if (/^\d{2}-\d{2}-\d{4}$/.test(token)) return false;
  if (/^(19|20)\d{2}$/.test(token)) return false;
  if (/^[A-Z0-9]{10,}$/.test(upper)) return false;
  if (/^[A-Z]{2,5}\d{6,}[A-Z0-9]*$/i.test(token)) return false;
  return token.length >= 3;
}

function pickBestPartyCandidate(candidates: string[]): string | null {
  const cleaned = candidates
    .map((value) => cleanNarration(value).replace(/[^A-Za-z0-9 .&()/-]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (const candidate of cleaned) {
    const tokens = candidate.split(/\s+/).filter(isLikelyPartyToken);
    if (tokens.length === 0) continue;
    const label = tokens.join(" ");
    if (label.length >= 3) return label.slice(0, 80);
  }

  return cleaned.find((value) => /[A-Za-z]{3,}/.test(value) && !/^\d+$/.test(value))?.slice(0, 80) ?? null;
}

export function extractParty(narration: string): string {
  const text = cleanNarration(narration);
  const upper = text.toUpperCase();

  const patterns: RegExp[] = [
    /\bNEFT[\s-]+(?:CR|DR|IN|OUT)?[\s-]*(?:[A-Z0-9]+[\s-]+){0,3}([A-Z][A-Z0-9 .&()/-]{2,60}?)(?:\s{2,}|$|-\d)/i,
    /\bRTGS[\s-]+(?:CR|DR|IN|OUT)?[\s-]*(?:[A-Z0-9]+[\s-]+){0,3}([A-Z][A-Z0-9 .&()/-]{2,60}?)(?:\s{2,}|$|-\d)/i,
    /\bIMPS[\s/:-]+(?:\d+[\s/:-]+){0,2}([A-Z][A-Z0-9 .&()/-]{2,60}?)(?:\s{2,}|$|\d{2}:\d{2})/i,
    /\bUPI[\s/:-]+(?:\d+[\s/:-]+){0,2}([A-Z][A-Z0-9 .&()/-]{2,60}?)(?:\s{2,}|$|\d{2}:\d{2})/i,
    /\b(?:TO|BY|FROM|DR|CR)[\s/-]+([A-Z][A-Z0-9 .&()/-]{2,60}?)(?:\s{2,}|$|-\d)/i,
    /\b(?:M\/S|MRS|MR|MS)\.?\s+([A-Z][A-Z0-9 .&()/-]{2,60}?)(?:\s{2,}|$)/i,
    /-\s*([A-Z][A-Z0-9 .&()/-]{3,60})$/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const picked = pickBestPartyCandidate([match[1]]);
      if (picked) return picked;
    }
  }

  const slashParts = text.split(/[-/]/).map((part) => cleanNarration(part)).filter(Boolean);
  const pickedFromParts = pickBestPartyCandidate(slashParts.reverse());
  if (pickedFromParts) return pickedFromParts;

  const words = upper.split(/\s+/).filter(isLikelyPartyToken);
  if (words.length > 0) return words.slice(0, 4).join(" ").slice(0, 80);

  return cleanNarration(text).slice(0, 80);
}
