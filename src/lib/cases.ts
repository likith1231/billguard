import type { AuditResult } from "./schema";

/**
 * Saved cases live in this browser's localStorage: there is no server or account, so a case
 * never leaves the device. `exportCases` / `importCases` move them between browsers.
 */
export const CASE_STATUSES = [
  { id: "draft", label: "Not sent yet" },
  { id: "sent_hospital", label: "Sent to hospital" },
  { id: "sent_insurer", label: "Sent to insurer" },
  { id: "escalated", label: "Escalated (ombudsman / forum)" },
  { id: "resolved", label: "Resolved" },
  { id: "closed", label: "Closed without recovery" },
] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number]["id"];

export type SavedCase = {
  id: string;
  savedAt: string;
  updatedAt: string;
  status: CaseStatus;
  /** yyyy-mm-dd the dispute letter went out, for the 15-day reminder. */
  sentOn: string | null;
  recovered: number | null;
  notes: string;
  audit: AuditResult;
};

export const CASES_KEY = "billguard:cases";
export const OPEN_KEY = "billguard:last-audit";
const EVENT = "billguard:cases-changed";
/** Days an insurer or hospital gets to reply before the case should be escalated. */
export const ESCALATE_AFTER_DAYS = 15;

const isStatus = (s: unknown): s is CaseStatus => CASE_STATUSES.some((c) => c.id === s);

export function parseCases(raw: string | null): SavedCase[] {
  try {
    const list = JSON.parse(raw ?? "[]");
    if (!Array.isArray(list)) return [];
    return list.filter((c): c is SavedCase => !!c && typeof c.id === "string" && !!c.audit?.extraction && Array.isArray(c.audit.findings) && isStatus(c.status));
  } catch {
    return [];
  }
}

export const readRaw = () => {
  try {
    return localStorage.getItem(CASES_KEY);
  } catch {
    return null;
  }
};
export const listCases = () => parseCases(readRaw());

function write(cases: SavedCase[]) {
  localStorage.setItem(CASES_KEY, JSON.stringify(cases));
  window.dispatchEvent(new Event(EVENT));
}

/** For useSyncExternalStore: fires on changes from this tab (custom event) or another one (storage). */
export function subscribeCases(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Saves an audit as a case (re-saving the same audit updates it instead of duplicating). */
export function saveCase(audit: AuditResult, patch: Partial<Pick<SavedCase, "status" | "sentOn">> = {}): SavedCase {
  const all = listCases();
  const now = new Date().toISOString();
  const found = all.find((c) => c.id === audit.generatedAt);
  const next: SavedCase = found
    ? { ...found, ...patch, audit, updatedAt: now }
    : { id: audit.generatedAt, savedAt: now, updatedAt: now, status: "draft", sentOn: null, recovered: null, notes: "", audit, ...patch };
  write([next, ...all.filter((c) => c.id !== next.id)]);
  return next;
}

export function updateCase(id: string, patch: Partial<Pick<SavedCase, "status" | "sentOn" | "recovered" | "notes">>) {
  write(listCases().map((c) => (c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c)));
}

export function deleteCase(id: string) {
  write(listCases().filter((c) => c.id !== id));
}

export const exportCases = () => JSON.stringify({ app: "billguard", version: 1, cases: listCases() }, null, 2);

/** Merges a backup file into the saved cases; returns how many were new or newer. */
export function importCases(text: string): number {
  const incoming = parseCases(JSON.stringify(JSON.parse(text).cases ?? []));
  if (!incoming.length) throw new Error("No BillGuard cases found in that file.");
  const byId = new Map(listCases().map((c) => [c.id, c]));
  let n = 0;
  for (const c of incoming) {
    const have = byId.get(c.id);
    if (!have || have.updatedAt < c.updatedAt) {
      byId.set(c.id, c);
      n++;
    }
  }
  write([...byId.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  return n;
}

/** Whole days since the letter went out, or null if it hasn't. */
export function daysSince(sentOn: string | null, now = new Date()) {
  if (!sentOn) return null;
  const d = (now.getTime() - Date.parse(sentOn)) / 86_400_000;
  return Number.isFinite(d) ? Math.max(0, Math.floor(d)) : null;
}

export const caseTitle = (c: SavedCase) => c.audit.extraction.hospital.name ?? c.audit.extraction.patient.name ?? "Hospital bill";
