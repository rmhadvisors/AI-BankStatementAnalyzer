export type SummaryTxn = {
  party?: string;
  narration?: string;
  direction?: string;
  category?: string;
  mode?: string;
  debit?: number;
  credit?: number;
  dateText?: string;
};

const FOOTER_PATTERNS = [
  /\*?\s*CLOSING\s+BALANCE/i,
  /EARMARKED\s+FOR\s+HOLD/i,
  /PAGE\s+\d+\s+OF\s+\d+/i,
  /CONTINUED\s+ON\s+NEXT/i,
];

const GARBAGE_ONLY = new Set(["TM", "NP", "DR", "CR", "TXN", "NA", "NIL", "UPI", "REF"]);

const GENERIC_PARTIES = new Set([
  "SELF",
  "OWN",
  "OWN ACCOUNT",
  "UNKNOWN",
  "TRANSACTION",
  "UPI TXN",
  "NEFT CR",
  "NEFT DR",
]);

const STRIP_PREFIX = /^(UPI|IMPS|NEFT|RTGS|ACH|NACH|BIL|POS|ATM|ECS|SI|REV|REF|TO|FROM|BY|DR|CR|TXN|TRANSFER|PAYMENT|PAY|FUND|FUNDS)[\s\-\/]*/i;

const BANK_EVENT_PATTERNS: Array<{ test: RegExp; label: string }> = [
  { test: /\bSWEEP\b/i, label: "BANK SWEEP" },
  { test: /\bSETTLEMENT\b/i, label: "BANK SETTLEMENT" },
  { test: /\bQUARTERLY\s+INTEREST\b/i, label: "BANK INTEREST" },
  { test: /\bINT\.?\s+ON\s+SWCR\b/i, label: "BANK INTEREST" },
  { test: /\bSGST\s+CHARGES?\b/i, label: "BANK CHARGES" },
  { test: /\bCGST\s+CHARGES?\b/i, label: "BANK CHARGES" },
  { test: /\bCHARGES?\/DR\b/i, label: "BANK CHARGES" },
  { test: /\bAUTOPAY\s+SI\b/i, label: "CARD AUTOPAY" },
];

const BANK_CODE_MAP: Record<string, string> = {
  UTIB: "AXIS BANK",
  ICIC: "ICICI BANK",
  SBIN: "STATE BANK OF INDIA",
  HDFC: "HDFC BANK",
  KKBK: "KOTAK MAHINDRA BANK",
  IBKL: "IDBI BANK",
  CBIN: "CENTRAL BANK OF INDIA",
  MAHB: "BANK OF MAHARASHTRA",
  BARB: "BANK OF BARODA",
  YESB: "YES BANK",
  PUNB: "PUNJAB NATIONAL BANK",
};

const MERCHANT_ALIASES: Array<{ test: RegExp; label: string }> = [
  { test: /\bPAY\s*TM\b|\bPAYTM\b|\bPA\s*Y\s*TM\b|\bPAYT\s*M\b/i, label: "PAYTM PAYMENTS" },
  { test: /\bPHONE\s*PE\b|\bPHO\s*NE\s*PE\b/i, label: "PHONEPE" },
  { test: /\bGOOGLE\s*PAY\b|\bGPAY\b/i, label: "GOOGLE PAY" },
  { test: /\bGOOGLE\s*PLAY\b/i, label: "GOOGLE PLAY" },
  { test: /\bAMAZON\b|\bAMZN\b/i, label: "AMAZON" },
  { test: /\bAIRTEL\b/i, label: "AIRTEL" },
  { test: /\bMSEDCL\b/i, label: "MSEDCL" },
  { test: /\bVODAFONE\b|\bVI\s+POST\b/i, label: "VODAFONE IDEA" },
  { test: /\bCBDT\b/i, label: "CBDT" },
  { test: /\bGODADDY\b/i, label: "GODADDY" },
];

const ABBREV_EXPANSIONS: Array<[RegExp, string]> = [
  [/\bASSO\b/gi, "ASSOCIATES"],
  [/\bPVT\b/gi, "PVT"],
  [/\bLTD\b/gi, "LTD"],
  [/\bLLP\b/gi, "LLP"],
];

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function repairOcrSpacing(text: string): string {
  let out = text;
  const repairs: Array<[RegExp, string]> = [
    [/\bPH\s+ONE\b/gi, "PHONE"],
    [/\bPHO\s+NE\b/gi, "PHONE"],
    [/\bP\s+HONE\b/gi, "PHONE"],
    [/\bPAYT\s+M\b/gi, "PAYTM"],
    [/\bPA\s+YTM\b/gi, "PAYTM"],
    [/\bSERVI\s+CES\b/gi, "SERVICES"],
    [/\bAUT\s+OMATION\b/gi, "AUTOMATION"],
    [/\bENTER\s+PRISE\b/gi, "ENTERPRISE"],
    [/\bTRAINI\s+NG\b/gi, "TRAINING"],
    [/\bOVERSEA\s+S\b/gi, "OVERSEAS"],
    [/\bMANUFACTURI\s+NG\b/gi, "MANUFACTURING"],
    [/\bRAJ\s+ESH\b/gi, "RAJESH"],
    [/\bIN\s+DIA\b/gi, "INDIA"],
    [/\bCOM\s+FORT\b/gi, "COMFORT"],
    [/\bZE\s+ENAT\b/gi, "ZEENAT"],
    [/\bRAM\s+ZAN\b/gi, "RAMZAN"],
    [/\bHAS\s+NANI\b/gi, "HASNANI"],
    [/\bJAL\s+PA\b/gi, "JALPA"],
    [/\bRA\s+ITHATHA\b/gi, "RAITHATHA"],
    [/\bMANSO\s+ORALI\b/gi, "MANSOORALI"],
    [/\bCHANDRASHEKHA\s+R\b/gi, "CHANDRASHEKHAR"],
  ];
  for (const [pattern, replacement] of repairs) {
    out = out.replace(pattern, replacement);
  }
  return normalizeWhitespace(out);
}

function isFooterGarbage(text: string): boolean {
  return FOOTER_PATTERNS.some((p) => p.test(text));
}

function stripReferenceTokens(tokens: string[]): string[] {
  return tokens.filter((token) => {
    const t = token.toUpperCase();
    if (GARBAGE_ONLY.has(t)) return false;
    if (/^[A-Z]{4}\d{6,}$/.test(t)) return false;
    if (/^[A-Z0-9]{10,}$/.test(t) && /\d/.test(t)) return false;
    if (/^\d{5,}$/.test(t)) return false;
    if (/^XX\d+$/i.test(t)) return false;
    return true;
  });
}

function stripTrailingNumericCodes(text: string): string {
  return text
    .replace(/\b([A-Z]{3,8})\d{4,}\b/gi, "$1")
    .replace(/\b[A-Z]{2,4}\d{10,}\b/gi, "")
    .replace(/\d{6,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFromSiMandate(narration: string): string | null {
  const match = narration.match(/\bSI\s+[A-Z0-9]{8,}\s+(.+)$/i);
  if (match?.[1]) return normalizeWhitespace(match[1]);
  return null;
}

function extractBankCodeEntity(text: string): string | null {
  const upper = text.toUpperCase();
  for (const [code, bank] of Object.entries(BANK_CODE_MAP)) {
    if (new RegExp(`\\b${code}\\b`).test(upper)) return bank;
  }
  if (/\bBARB0[A-Z0-9]+\b/i.test(upper)) return "BANK OF BARODA";
  return null;
}

function matchMerchantAlias(text: string): string | null {
  for (const alias of MERCHANT_ALIASES) {
    if (alias.test.test(text)) return alias.label;
  }
  return null;
}

function expandAbbreviations(text: string): string {
  let out = text;
  for (const [pattern, replacement] of ABBREV_EXPANSIONS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

export function entityClusterKey(label: string): string {
  let key = repairOcrSpacing(label.toUpperCase());
  key = key.replace(/[^A-Z0-9\s]/g, " ");
  key = normalizeWhitespace(key);
  key = stripTrailingNumericCodes(key);
  const tokens = stripReferenceTokens(key.split(/\s+/));
  if (tokens.length === 0) return "UNRECOGNIZED";
  return tokens.join(" ");
}

function scoreEntity(label: string): number {
  const tokens = label.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;
  if (label === "UNRECOGNIZED") return 0;
  let score = Math.min(40, tokens.length * 8);
  if (/\b(LTD|LLP|PVT|ASSOCIATES|BANK|HOMES|ENTERPRISE|STUDIES)\b/i.test(label)) score += 20;
  if (label.length >= 8) score += 15;
  if (/^[A-Z]{2,4}$/.test(label)) score -= 20;
  return score;
}

export function extractEntityFromText(raw: string): { entity: string; confidence: number } {
  if (!raw || isFooterGarbage(raw)) {
    return { entity: "UNRECOGNIZED", confidence: 0 };
  }

  for (const { test, label } of BANK_EVENT_PATTERNS) {
    if (test.test(raw) && raw.length < 80) {
      return { entity: label, confidence: 85 };
    }
  }

  const aliasHit = matchMerchantAlias(raw);
  if (aliasHit) return { entity: aliasHit, confidence: 95 };

  let text = repairOcrSpacing(raw.toUpperCase());
  text = text.replace(/[-_/:,@()#]+/g, " ");
  text = normalizeWhitespace(text);
  text = text.replace(STRIP_PREFIX, "");
  text = stripTrailingNumericCodes(text);

  const siMerchant = extractFromSiMandate(raw);
  if (siMerchant) {
    const siAlias = matchMerchantAlias(siMerchant);
    if (siAlias) return { entity: siAlias, confidence: 92 };
    const siClean = expandAbbreviations(repairOcrSpacing(siMerchant.toUpperCase()));
    if (siClean.length >= 3) return { entity: siClean, confidence: 88 };
  }

  const bankEntity = extractBankCodeEntity(text);
  if (bankEntity && text.split(/\s+/).length <= 4) {
    return { entity: bankEntity, confidence: 75 };
  }

  let tokens = stripReferenceTokens(text.split(/\s+/).filter(Boolean));
  tokens = tokens.filter((t) => !GENERIC_PARTIES.has(t) && t.length > 1);
  if (tokens.length === 0) return { entity: "UNRECOGNIZED", confidence: 0 };

  let entity = expandAbbreviations(tokens.join(" "));
  entity = normalizeWhitespace(entity);

  const aliasAfter = matchMerchantAlias(entity);
  if (aliasAfter) return { entity: aliasAfter, confidence: 93 };

  if (/^[0-9\s]+$/.test(entity)) return { entity: "UNRECOGNIZED", confidence: 0 };
  if (entity.length < 3) return { entity: "UNRECOGNIZED", confidence: 5 };
  if (tokens.length === 1 && tokens[0].length <= 4) return { entity: "UNRECOGNIZED", confidence: 10 };

  return { entity, confidence: scoreEntity(entity) };
}

export function extractEntityFromTransaction(txn: SummaryTxn): { entity: string; confidence: number } {
  const narration = (txn.narration ?? "").toString();
  const party = (txn.party ?? "").toString().trim();

  if (/\bEMI\b/i.test(narration) && !isRecognizablePartyName(party)) {
    return { entity: "EMI PAYMENT", confidence: 80 };
  }

  const attempts: string[] = [];
  if (party && !GENERIC_PARTIES.has(party.toUpperCase())) {
    attempts.push(party);
  }
  attempts.push(narration);
  if (party && narration) attempts.push(`${party} ${narration}`);

  let best = { entity: "UNRECOGNIZED", confidence: 0 };
  for (const attempt of attempts) {
    const result = extractEntityFromText(attempt);
    if (result.confidence > best.confidence) best = result;
  }

  if (best.confidence < 25 && party) {
    const partyResult = extractEntityFromText(party);
    if (partyResult.confidence > best.confidence) best = partyResult;
  }

  return best;
}

function isRecognizablePartyName(party: string): boolean {
  const raw = party.trim().toUpperCase();
  if (!raw || GENERIC_PARTIES.has(raw)) return false;
  const hasLetters = /[A-Z]/.test(raw);
  const isAllDigits = /^[0-9]+$/.test(raw);
  const isIdLike = /^(?=.*\d)[A-Z0-9]{8,}$/.test(raw);
  return hasLetters && !isAllDigits && !isIdLike && raw.length >= 4;
}

export function classifySummaryLabelForTransaction(txn: SummaryTxn): string {
  const { entity, confidence } = extractEntityFromTransaction(txn);
  if (confidence >= 20 && entity !== "UNRECOGNIZED") return entity;
  return "UNRECOGNIZED";
}

export type TransactionSummaryRow = {
  party: string;
  txnCount: number;
  debit: number;
  credit: number;
  net: number;
};

function pickCanonicalLabel(labels: string[]): Map<string, string> {
  const canonical = new Map<string, string>();
  const sorted = [...labels].sort((a, b) => b.length - a.length);

  for (const label of sorted) {
    const key = entityClusterKey(label);
    if (canonical.has(key)) continue;

    let best = label;
    for (const other of sorted) {
      if (other === label) continue;
      const otherKey = entityClusterKey(other);
      if (otherKey === key) {
        if (other.length > best.length) best = other;
      } else if (tokenSimilarity(key, otherKey) >= 0.85) {
        if (other.length > best.length) best = other;
        canonical.set(otherKey, best);
      }
    }
    canonical.set(key, best);
  }
  return canonical;
}

function tokenSimilarity(a: string, b: string): number {
  const ta = new Set(a.split(/\s+/).filter(Boolean));
  const tb = new Set(b.split(/\s+/).filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  ta.forEach((t) => {
    if (tb.has(t)) inter += 1;
  });
  return inter / Math.max(ta.size, tb.size);
}

export function groupTransactionsByParty(transactions: SummaryTxn[]): Map<string, SummaryTxn[]> {
  const labels = transactions.map((txn) => classifySummaryLabelForTransaction(txn));
  const canonicalMap = pickCanonicalLabel([...new Set(labels)]);
  const map = new Map<string, SummaryTxn[]>();

  transactions.forEach((txn, index) => {
    const party = canonicalMap.get(entityClusterKey(labels[index])) ?? labels[index];
    const list = map.get(party) ?? [];
    list.push(txn);
    map.set(party, list);
  });
  return map;
}

export function buildTransactionSummary(transactions: SummaryTxn[]): TransactionSummaryRow[] {
  const rawLabels: string[] = [];
  const perTxn: Array<{ label: string; debit: number; credit: number }> = [];

  transactions.forEach((txn) => {
    const label = classifySummaryLabelForTransaction(txn);
    rawLabels.push(label);
    perTxn.push({ label, debit: Number(txn.debit || 0), credit: Number(txn.credit || 0) });
  });

  const canonicalMap = pickCanonicalLabel([...new Set(rawLabels)]);

  const summary: Record<string, { party: string; txnCount: number; debit: number; credit: number }> = {};

  perTxn.forEach(({ label, debit, credit }) => {
    const party = canonicalMap.get(entityClusterKey(label)) ?? label;
    if (!summary[party]) {
      summary[party] = { party, txnCount: 0, debit: 0, credit: 0 };
    }
    summary[party].txnCount += 1;
    summary[party].debit += debit;
    summary[party].credit += credit;
  });

  return Object.values(summary)
    .map((row) => ({ ...row, net: row.credit - row.debit }))
    .sort((a, b) => {
      if (b.txnCount !== a.txnCount) return b.txnCount - a.txnCount;
      return b.credit + b.debit - (a.credit + a.debit);
    });
}
