import { LineItemCategory, type Extraction, type LineItem } from "./schema";

/**
 * Manual mode: the patient types (or imports) the bill instead of uploading it,
 * and only the deterministic rules run. No API key or credits needed.
 */

export type LineDraft = {
  date: string;
  description: string;
  code: string;
  category: LineItemCategory;
  quantity: string;
  unitPrice: string;
  amount: string;
  mrp: string;
};

export type DeductionDraft = { description: string; reasonGiven: string; amount: string; lines: string };

export type ManualDraft = {
  patientName: string;
  claimNumber: string;
  policyNumber: string;
  hospitalName: string;
  billNumber: string;
  admissionDate: string;
  dischargeDate: string;
  billedTotal: string;
  lines: LineDraft[];
  insurer: string;
  claimedAmount: string;
  approvedAmount: string;
  deductions: DeductionDraft[];
  sumInsured: string;
  roomRentLimitPerDay: string;
  copayPercent: string;
};

export const emptyLine = (): LineDraft => ({ date: "", description: "", code: "", category: "other", quantity: "1", unitPrice: "", amount: "", mrp: "" });
export const emptyDeduction = (): DeductionDraft => ({ description: "", reasonGiven: "", amount: "", lines: "" });

export const emptyDraft = (): ManualDraft => ({
  patientName: "",
  claimNumber: "",
  policyNumber: "",
  hospitalName: "",
  billNumber: "",
  admissionDate: "",
  dischargeDate: "",
  billedTotal: "",
  lines: [emptyLine(), emptyLine(), emptyLine()],
  insurer: "",
  claimedAmount: "",
  approvedAmount: "",
  deductions: [],
  sumInsured: "",
  roomRentLimitPerDay: "",
  copayPercent: "",
});

/** Parses "1,20,000", "₹ 450.50", "Rs. 90" etc. Empty or junk → null. */
export function num(s: string | number | null | undefined): number | null {
  if (typeof s === "number") return Number.isFinite(s) ? s : null;
  const t = (s ?? "").replace(/rs\.?|inr|₹|,|\s/gi, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const KEYWORDS: [LineItemCategory, RegExp][] = [
  ["icu", /\bicu\b|intensive care|\bhdu\b|\bccu\b|\bnicu\b/i],
  ["room", /room|ward|bed charge|suite/i],
  ["ot_charges", /\bot\b|operation theat|theatre/i],
  ["surgery_package", /package/i],
  ["consultation", /consult|visit|doctor|dr\./i],
  ["diagnostics_imaging", /x-?ray|\bct\b|mri|usg|ultrasound|scan|echo|doppler/i],
  ["diagnostics_lab", /\bcbc\b|\blft\b|\bkft\b|\bcrp\b|blood|urine|culture|test|panel|profile|lab/i],
  ["implant", /implant|stent|prosthe|mesh|plate|screw/i],
  ["pharmacy", /\binj\b|inj\.|tab\b|tab\.|cap\.|syrup|\bmg\b|\bml\b|infusion|saline|medicine|drug|pharmacy/i],
  ["consumables", /glove|syringe|cannula|gauze|kit|catheter|mask|consumable|dressing/i],
  ["nursing", /nursing|nurse/i],
  ["procedure", /procedure|dressing|surgery|surgeon|anaesth|anesth/i],
  ["admin", /admission|registration|admin|service charge|file|record/i],
];

export function guessCategory(description: string): LineItemCategory {
  return KEYWORDS.find(([, re]) => re.test(description))?.[0] ?? "other";
}

/** Minimal RFC 4180 CSV reader (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const HEADERS: Record<keyof LineDraft, RegExp> = {
  date: /^date|^day/i,
  description: /desc|item|particular|service|name/i,
  code: /code|batch|hsn|cpt/i,
  category: /categ|head|type|dept/i,
  quantity: /qty|quant|units?$|^no/i,
  unitPrice: /unit|rate|price/i,
  amount: /amount|total|value|net/i,
  mrp: /mrp/i,
};

/**
 * Reads line items from a CSV with a header row. Accepts BillGuard's own
 * line-item export, the template, and most hospital/spreadsheet exports.
 */
export function linesFromCsv(text: string): LineDraft[] {
  const [head, ...rows] = parseCsv(text);
  if (!head) throw new Error("The CSV is empty.");
  const col = {} as Record<keyof LineDraft, number>;
  const used = new Set<number>();
  // MRP and unit price first so "Unit price"/"MRP" aren't claimed by looser patterns.
  for (const k of ["mrp", "unitPrice", "quantity", "description", "date", "code", "category", "amount"] as (keyof LineDraft)[]) {
    const i = head.findIndex((h, j) => !used.has(j) && HEADERS[k].test(h.trim()));
    if (i >= 0) {
      col[k] = i;
      used.add(i);
    }
  }
  if (col.description === undefined) throw new Error("Couldn't find a description column. Use the template's headers.");
  if (col.amount === undefined && col.unitPrice === undefined) throw new Error("Couldn't find an amount or rate column.");
  const cell = (r: string[], k: keyof LineDraft) => (col[k] === undefined ? "" : (r[col[k]] ?? "").trim());
  return rows
    .map((r) => {
      const description = cell(r, "description");
      const cat = cell(r, "category").toLowerCase().replace(/[^a-z]+/g, "_");
      return {
        date: cell(r, "date"),
        description,
        code: cell(r, "code"),
        category: LineItemCategory.safeParse(cat).success ? (cat as LineItemCategory) : guessCategory(description),
        quantity: cell(r, "quantity") || "1",
        unitPrice: cell(r, "unitPrice"),
        amount: cell(r, "amount"),
        mrp: cell(r, "mrp"),
      };
    })
    .filter((l) => l.description);
}

export const CSV_TEMPLATE =
  "Date,Description,Code,Category,Quantity,Unit price,Amount,MRP\r\n" +
  "2026-03-02,Private room,,room,3,9000,27000,\r\n" +
  "2026-03-02,CBC,LAB-01,diagnostics_lab,1,650,650,\r\n" +
  "2026-03-03,Inj. Ceftriaxone 1g,B2231,pharmacy,6,95,570,68\r\n";

/** Converts the form into the same Extraction shape Claude returns, minus AI findings. */
export function draftToExtraction(d: ManualDraft): Extraction {
  const lineItems: LineItem[] = d.lines
    .filter((l) => l.description.trim() && (num(l.amount) !== null || num(l.unitPrice) !== null))
    .map((l, i) => {
      const quantity = num(l.quantity) ?? 1;
      const unitPrice = num(l.unitPrice) ?? (num(l.amount) ?? 0) / (quantity || 1);
      return {
        id: `L${i + 1}`,
        date: l.date.trim() || null,
        description: l.description.trim(),
        code: l.code.trim() || null,
        category: l.category,
        quantity,
        unitPrice,
        amount: num(l.amount) ?? quantity * unitPrice,
        mrp: num(l.mrp),
        page: null,
      };
    });
  const ids = new Set(lineItems.map((l) => l.id));
  const text = (s: string) => s.trim() || null;
  return {
    currency: "INR",
    patient: { name: text(d.patientName), policyNumber: text(d.policyNumber), claimNumber: text(d.claimNumber) },
    hospital: {
      name: text(d.hospitalName),
      billNumber: text(d.billNumber),
      admissionDate: text(d.admissionDate),
      dischargeDate: text(d.dischargeDate),
      diagnosis: null,
      billedTotal: num(d.billedTotal),
    },
    lineItems,
    settlement: {
      insurer: text(d.insurer),
      claimedAmount: num(d.claimedAmount),
      approvedAmount: num(d.approvedAmount),
      deductions: d.deductions
        .filter((x) => num(x.amount))
        .map((x, i) => ({
          id: `D${i + 1}`,
          description: x.description.trim() || x.reasonGiven.trim() || "Deduction",
          amount: num(x.amount) ?? 0,
          reasonGiven: x.reasonGiven.trim() || x.description.trim(),
          relatedLineIds: x.lines
            .split(/[\s,]+/)
            .map((s) => s.trim().toUpperCase().replace(/^(\d+)$/, "L$1"))
            .filter((s) => ids.has(s)),
        })),
    },
    policy: {
      sumInsured: num(d.sumInsured),
      roomRentLimitPerDay: num(d.roomRentLimitPerDay),
      copayPercent: num(d.copayPercent),
      consumablesCovered: null,
      relevantClauses: [],
    },
    findings: [],
    summary: "",
  };
}

/** Fills the form from an extraction (used for "Load the sample bill"). */
export function extractionToDraft(x: Extraction): ManualDraft {
  const s = (v: number | string | null) => (v === null ? "" : String(v));
  return {
    patientName: s(x.patient.name),
    claimNumber: s(x.patient.claimNumber),
    policyNumber: s(x.patient.policyNumber),
    hospitalName: s(x.hospital.name),
    billNumber: s(x.hospital.billNumber),
    admissionDate: s(x.hospital.admissionDate),
    dischargeDate: s(x.hospital.dischargeDate),
    billedTotal: s(x.hospital.billedTotal),
    lines: x.lineItems.map((l) => ({
      date: s(l.date),
      description: l.description,
      code: s(l.code),
      category: l.category,
      quantity: s(l.quantity),
      unitPrice: s(l.unitPrice),
      amount: s(l.amount),
      mrp: s(l.mrp),
    })),
    insurer: s(x.settlement.insurer),
    claimedAmount: s(x.settlement.claimedAmount),
    approvedAmount: s(x.settlement.approvedAmount),
    deductions: x.settlement.deductions.map((d) => ({
      description: d.description,
      reasonGiven: d.reasonGiven,
      amount: s(d.amount),
      lines: d.relatedLineIds.join(", "),
    })),
    sumInsured: s(x.policy.sumInsured),
    roomRentLimitPerDay: s(x.policy.roomRentLimitPerDay),
    copayPercent: s(x.policy.copayPercent),
  };
}

/** One-paragraph summary for manual audits, since there's no model to write one. */
export function manualSummary(x: Extraction, count: number, total: number) {
  if (!count) return "The rules engine found no arithmetic, duplicate, MRP, stay-length, benchmark or settlement problems in what you entered. Upload the documents for an AI audit to also check bundling and policy wording.";
  return `The rules engine found ${count} issue${count > 1 ? "s" : ""} worth about ₹${Math.round(total).toLocaleString("en-IN")} in the ${x.lineItems.length} lines you entered. Manual audits cover maths, duplicates, MRP, stay length, benchmarks and settlement arithmetic; an AI audit of the documents also checks package bundling and policy wording.`;
}

/* ---------- Reading a bill from text (text-based PDFs and .txt files) ---------- */

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const NUM_TOKEN = /^(?:₹|rs\.?)?\d[\d,]*(?:\.\d+)?$|^[-–—]$/i;

/** Normalises 11-Aug-26, 11/08/2026 (day first) and 2026-08-11 to ISO; anything else → "". */
export function parseBillDate(s: string): string {
  const t = s.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[-/ .]([A-Za-z]{3})[a-z]*[-/ .,]*(\d{2,4})/.exec(t);
  if (m) {
    const mo = MONTHS.indexOf(m[2].toLowerCase()) + 1;
    if (!mo) return "";
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return `${y}-${String(mo).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(t);
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return "";
}

const DATE_LEAD = /^(\d{4}-\d{2}-\d{2}|\d{1,2}[-/ .][A-Za-z]{3}[a-z]*[-/ .]\d{2,4}|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})\s+/;

/** Parses one bill row such as "12-Aug-26  PH-CTX1  Inj. Ceftriaxone 1g   6  95.00  68.00  570.00". */
export function parseBillRow(raw: string): LineDraft | null {
  let rest = raw.trim().replace(/\s+/g, " ");
  if (!rest || /\b(grand total|sub ?total|net payable|amount payable|balance|advance|discount)\b/i.test(rest)) return null;
  const toks = rest.split(" ");
  const nums: string[] = [];
  while (toks.length > 1 && nums.length < 4 && NUM_TOKEN.test(toks[toks.length - 1])) nums.unshift(toks.pop()!);
  if (nums.length < 2 || /^[-–—]$/.test(nums[nums.length - 1])) return null;
  rest = toks.join(" ");

  let date = "";
  const dm = DATE_LEAD.exec(rest);
  if (dm) {
    date = parseBillDate(dm[1]);
    rest = rest.slice(dm[0].length);
  }
  let code = "";
  const cm = /^([A-Z0-9]{2,}-[A-Z0-9-]+|\d{4,})\s+(?=\S)/.exec(rest);
  if (cm) {
    code = cm[1];
    rest = rest.slice(cm[0].length);
  }
  const description = rest.replace(/^[-–—:\s]+|[-–—:\s]+$/g, "");
  if (!/[a-z]/i.test(description)) return null;

  const v = nums.map((n) => (/^[-–—]$/.test(n) ? null : num(n)));
  const amount = v[v.length - 1];
  if (amount === null) return null;
  const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(1, Math.abs(b) * 0.005);
  let quantity = 1;
  let unitPrice = amount;
  let mrp: number | null = null;
  if (v.length === 4 && v[0] !== null && v[1] !== null && close(v[0] * v[1], amount)) [quantity, unitPrice, mrp] = [v[0], v[1], v[2]];
  else if (v.length === 3 && v[0] !== null && v[1] !== null && close(v[0] * v[1], amount)) [quantity, unitPrice] = [v[0], v[1]];
  const out = (n: number | null) => (n === null ? "" : String(n));
  return {
    date,
    description,
    code,
    category: guessCategory(description),
    quantity: String(quantity),
    unitPrice: String(unitPrice),
    amount: String(amount),
    mrp: out(mrp),
  };
}

/**
 * Best-effort reader for a pasted or extracted text bill: the header details plus the line items.
 * It only covers well-formed tabular bills; the user reviews and edits the result in the form.
 */
export function draftFromBillText(text: string): { fields: Partial<ManualDraft>; lines: LineDraft[] } {
  const rows = text.split(/\r?\n/);
  const lines = rows.map(parseBillRow).filter((l): l is LineDraft => l !== null);
  const fields: Partial<ManualDraft> = {};
  const first = rows.map((r) => r.trim()).find((r) => /[a-z]{3}/i.test(r));
  if (first && !parseBillRow(first)) fields.hospitalName = first.replace(/\s*\((sample|fictitious)[^)]*\)/i, "").replace(/\s*[—-]\s*SAMPLE.*$/i, "").trim();
  const pick = (re: RegExp) => re.exec(text)?.[1]?.trim();
  fields.billNumber = pick(/bill\s*(?:no|number|#)\.?\s*[:\-]?\s*([A-Za-z0-9/_-]+)/i);
  fields.policyNumber = pick(/policy\s*(?:no|number|#)\.?\s*[:\-]?\s*([A-Za-z0-9/_-]+)/i);
  fields.claimNumber = pick(/claim\s*(?:no|number|#)\.?\s*[:\-]?\s*([A-Za-z0-9/_-]+)/i);
  fields.patientName = pick(/patient(?:\s*name)?\s*[:\-]\s*([A-Za-z.' ]+?)(?:\s{2,}|\s+(?:age|sex|uhid|gender)\b|$)/im);
  const adm = pick(/(?:admission|admitted|doa)\s*(?:date)?\s*[:\-]?\s*(\d{1,2}[-/ .][A-Za-z0-9]{2,3}[a-z]*[-/ .]\d{2,4}|\d{4}-\d{2}-\d{2})/i);
  const dis = pick(/(?:discharge|discharged|dod)\s*(?:date)?\s*[:\-]?\s*(\d{1,2}[-/ .][A-Za-z0-9]{2,3}[a-z]*[-/ .]\d{2,4}|\d{4}-\d{2}-\d{2})/i);
  if (adm) fields.admissionDate = parseBillDate(adm);
  if (dis) fields.dischargeDate = parseBillDate(dis);
  const total = pick(/grand total\s*[:\-]?\s*(?:₹|rs\.?)?\s*([\d,]+(?:\.\d+)?)/i);
  if (total) fields.billedTotal = String(num(total));
  for (const k of Object.keys(fields) as (keyof ManualDraft)[]) if (!fields[k]) delete fields[k];
  return { fields, lines };
}
