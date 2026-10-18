import { TYPE_LABEL } from "./format";
import { partyFor } from "./rules";
import type { AuditResult } from "./schema";

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  // Quote everything; neutralise leading =+-@ so spreadsheets don't run it as a formula.
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};
const csv = (rows: unknown[][]) => rows.map((r) => r.map(cell).join(",")).join("\r\n");

export function findingsCsv(r: AuditResult) {
  return csv([
    ["ID", "Type", "Severity", "Raise with", "Title", "Disputed amount", "Currency", "Bill lines", "Deductions", "Policy clause", "Explanation", "Evidence", "Action", "Source"],
    ...r.findings.map((f) => [
      f.id,
      TYPE_LABEL[f.type],
      f.severity,
      partyFor(f),
      f.title,
      f.disputedAmount.toFixed(2),
      r.extraction.currency,
      f.lineIds.join(" "),
      f.deductionIds.join(" "),
      f.policyClause,
      f.explanation,
      f.evidence.join(" | "),
      f.action,
      f.source,
    ]),
  ]);
}

export function linesCsv(r: AuditResult) {
  const flags = new Map<string, string[]>();
  for (const f of r.findings) for (const id of f.lineIds) flags.set(id, [...(flags.get(id) ?? []), f.id]);
  return csv([
    ["ID", "Date", "Description", "Code", "Category", "Quantity", "Unit price", "Amount", "MRP", "Page", "Flagged by"],
    ...r.extraction.lineItems.map((l) => [l.id, l.date, l.description, l.code, l.category, l.quantity, l.unitPrice, l.amount, l.mrp, l.page, (flags.get(l.id) ?? []).join(" ")]),
  ]);
}

export function download(name: string, body: string, type: string) {
  // BOM so Excel opens UTF-8 (₹) correctly.
  const blob = new Blob([type.startsWith("text/csv") ? "﻿" + body : body], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
