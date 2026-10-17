import { findBenchmark } from "./benchmarks";
import type { AuditFinding, AuditResult, Extraction, Finding, LineItem } from "./schema";

/**
 * Deterministic checks that don't need a model: arithmetic, duplicates,
 * stay length, MRP, benchmark outliers and settlement maths. They run on the
 * extracted data and are merged with Claude's findings so every number on the
 * results screen has a reproducible basis.
 */

const fmt = (n: number) => Math.round(n * 100) / 100;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function days(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const d = (Date.parse(b) - Date.parse(a)) / 86_400_000;
  return Number.isFinite(d) ? Math.max(1, Math.round(d)) : null;
}

function rule(f: Omit<Finding, "deductionIds" | "policyClause"> & Partial<Finding>): Finding {
  return { deductionIds: [], policyClause: null, ...f };
}

export function runRules(x: Extraction): Finding[] {
  const out: Finding[] = [];
  const cur = x.currency || "INR";
  const money = (n: number) => `${cur} ${fmt(n).toLocaleString("en-IN")}`;

  // 1. Arithmetic: quantity × unit price must equal the printed amount.
  for (const li of x.lineItems) {
    const expected = li.quantity * li.unitPrice;
    const diff = li.amount - expected;
    if (li.unitPrice > 0 && diff > Math.max(1, expected * 0.01)) {
      out.push(rule({
        type: "arithmetic_error",
        severity: "medium",
        title: `Line maths doesn't add up: ${li.description}`,
        explanation: `${li.quantity} × ${money(li.unitPrice)} = ${money(expected)}, but the bill charges ${money(li.amount)}.`,
        evidence: [`${li.description} — qty ${li.quantity} @ ${li.unitPrice} = ${li.amount}`],
        disputedAmount: fmt(diff),
        lineIds: [li.id],
        action: `Ask the hospital to correct line ${li.id} to ${money(expected)}.`,
      }));
    }
  }

  // 2. Duplicates: same description, date and amount appearing more than once.
  const groups = new Map<string, LineItem[]>();
  for (const li of x.lineItems) {
    if (li.category === "pharmacy" || li.category === "consumables") {
      // Repeated drug issues are normal; only flag exact same code + date + amount.
      if (!li.code) continue;
    }
    const k = [norm(li.description), li.code ?? "", li.date ?? "", li.amount].join("|");
    groups.set(k, [...(groups.get(k) ?? []), li]);
  }
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const extra = g.slice(1).reduce((s, l) => s + l.amount, 0);
    out.push(rule({
      type: "duplicate_charge",
      severity: g[0].category === "pharmacy" ? "medium" : "high",
      title: `Charged ${g.length}× on the same day: ${g[0].description}`,
      explanation: `The same item, date and amount appears ${g.length} times. Unless it was genuinely performed more than once, ${money(extra)} is a duplicate.`,
      evidence: g.map((l) => `${l.id}: ${l.date ?? "undated"} — ${l.description} — ${l.amount}`),
      disputedAmount: fmt(extra),
      lineIds: g.map((l) => l.id),
      action: `Ask for the clinical record proving each instance, or removal of ${g.length - 1} duplicate line(s).`,
    }));
  }

  // 3. Room / ICU days billed beyond the length of stay.
  const stay = days(x.hospital.admissionDate, x.hospital.dischargeDate);
  if (stay) {
    const bedLines = x.lineItems.filter((l) => l.category === "room" || l.category === "icu");
    const bedDays = bedLines.reduce((s, l) => s + l.quantity, 0);
    // Many hospitals bill the discharge day too, so allow stay + 1.
    if (bedDays > stay + 1 && bedLines.length) {
      const avg = bedLines.reduce((s, l) => s + l.amount, 0) / bedDays;
      const over = bedDays - (stay + 1);
      out.push(rule({
        type: "billing_beyond_stay",
        severity: "high",
        title: `${bedDays} bed-days billed for a ${stay}-night stay`,
        explanation: `Admission ${x.hospital.admissionDate} to discharge ${x.hospital.dischargeDate} is ${stay} night(s). Even counting the discharge day, at most ${stay + 1} bed-days can be billed.`,
        evidence: bedLines.map((l) => `${l.id}: ${l.description} × ${l.quantity}`),
        disputedAmount: fmt(over * avg),
        lineIds: bedLines.map((l) => l.id),
        action: `Ask the hospital to reduce bed charges by ${over} day(s).`,
      }));
    }
  }

  // 4. Pharmacy above printed MRP.
  for (const li of x.lineItems) {
    if (li.mrp && li.unitPrice > li.mrp * 1.001) {
      out.push(rule({
        type: "mrp_violation",
        severity: "high",
        title: `Sold above MRP: ${li.description}`,
        explanation: `The pack's printed MRP is ${money(li.mrp)} per unit but you were charged ${money(li.unitPrice)}. Charging above MRP is not permitted under the Legal Metrology (Packaged Commodities) Rules.`,
        evidence: [`${li.description} — MRP ${li.mrp}, charged ${li.unitPrice} × ${li.quantity}`],
        disputedAmount: fmt((li.unitPrice - li.mrp) * li.quantity),
        lineIds: [li.id],
        action: `Ask for a refund of the amount charged over MRP on line ${li.id}.`,
      }));
    }
  }

  // 5. Benchmark outliers (> 1.5× the top of the indicative band).
  for (const li of x.lineItems) {
    const b = findBenchmark(li.description);
    if (!b || li.unitPrice <= b.high * 1.5) continue;
    out.push(rule({
      type: "overcharge_vs_benchmark",
      severity: li.unitPrice > b.high * 3 ? "high" : "medium",
      title: `${li.description} priced ${(li.unitPrice / b.high).toFixed(1)}× the usual range`,
      explanation: `${b.label} typically costs ${money(b.low)}–${money(b.high)} per ${b.unit} (${b.source}). You were charged ${money(li.unitPrice)}.`,
      evidence: [`${li.id}: ${li.description} @ ${li.unitPrice}`, `Benchmark: ${b.label} ${b.low}–${b.high}/${b.unit}`],
      disputedAmount: fmt((li.unitPrice - b.high) * li.quantity),
      lineIds: [li.id],
      action: `Ask the hospital to justify the rate or bill line ${li.id} at its published tariff.`,
    }));
  }

  // 6. Bill total vs sum of lines.
  const sum = x.lineItems.reduce((s, l) => s + l.amount, 0);
  if (x.hospital.billedTotal && x.hospital.billedTotal - sum > Math.max(10, sum * 0.005)) {
    out.push(rule({
      type: "arithmetic_error",
      severity: "high",
      title: "Grand total is higher than the sum of the line items",
      explanation: `The line items add up to ${money(sum)} but the bill's total is ${money(x.hospital.billedTotal)}.`,
      evidence: [`Printed total ${x.hospital.billedTotal}`, `Sum of ${x.lineItems.length} lines ${fmt(sum)}`],
      disputedAmount: fmt(x.hospital.billedTotal - sum),
      lineIds: [],
      action: "Ask for an itemised reconciliation of the grand total.",
    }));
  }

  // 7. Settlement maths: claimed − deductions should equal approved.
  const s = x.settlement;
  const ded = s.deductions.reduce((t, d) => t + d.amount, 0);
  if (s.claimedAmount && s.approvedAmount !== null && s.claimedAmount - ded - s.approvedAmount > 10) {
    const gap = s.claimedAmount - ded - s.approvedAmount;
    out.push(rule({
      type: "wrongful_deduction",
      severity: "high",
      title: "Unexplained gap in the settlement",
      explanation: `Claimed ${money(s.claimedAmount)} minus listed deductions ${money(ded)} should leave ${money(s.claimedAmount - ded)}, but only ${money(s.approvedAmount)} was approved. ${money(gap)} is unaccounted for.`,
      evidence: [`Claimed ${s.claimedAmount}`, `Deductions listed ${fmt(ded)}`, `Approved ${s.approvedAmount}`],
      disputedAmount: fmt(gap),
      lineIds: [],
      action: "Ask the insurer for a deduction-wise breakup of the unexplained amount.",
    }));
  }

  // 8. Proportionate deduction applied to heads that are exempt from it.
  const exempt = new Set(["icu", "pharmacy", "consumables", "implant", "diagnostics_lab", "diagnostics_imaging"]);
  for (const d of s.deductions) {
    if (!/proportion|room rent|room category|eligib/i.test(d.reasonGiven)) continue;
    const related = x.lineItems.filter((l) => d.relatedLineIds.includes(l.id));
    const lines = related.filter((l) => exempt.has(l.category));
    if (!lines.length) continue;
    // Only the share of the cut that landed on exempt heads is disputable.
    const relatedSum = related.reduce((t, l) => t + l.amount, 0);
    const share = relatedSum ? lines.reduce((t, l) => t + l.amount, 0) / relatedSum : 1;
    out.push(rule({
      type: "proportionate_deduction",
      severity: "high",
      title: `Room-rent proportionate cut applied to ${[...new Set(lines.map((l) => l.category.replace(/_/g, " ")))].join(", ")}`,
      explanation: "IRDAI's Master Circular on Health Insurance (2024) says proportionate deductions for a higher room category cannot be applied to ICU charges, pharmacy, consumables, implants, medical devices or diagnostics. Check your policy wording too.",
      evidence: [`${d.id}: "${d.reasonGiven}" — ${money(d.amount)}`, ...lines.map((l) => `${l.id}: ${l.description} (${l.category.replace(/_/g, " ")})`)],
      deductionIds: [d.id],
      policyClause: "IRDAI Master Circular on Health Insurance Business, 2024",
      disputedAmount: fmt(d.amount * share),
      lineIds: lines.map((l) => l.id),
      action: `Ask the insurer to reverse the part of deduction ${d.id} applied to exempt heads.`,
    }));
  }

  return out;
}

const INSURER_TYPES = new Set<Finding["type"]>([
  "wrongful_deduction",
  "proportionate_deduction",
  "non_payable_misclassification",
  "copay_error",
  "policy_violation",
]);

/** Who the patient should raise this finding with. */
export function partyFor(f: Pick<Finding, "type" | "deductionIds">): "insurer" | "hospital" {
  return INSURER_TYPES.has(f.type) || f.deductionIds.length > 0 ? "insurer" : "hospital";
}

/** Merge AI and rule findings, dropping rule findings that duplicate an AI one. */
export function buildAudit(x: Extraction, mode: AuditResult["mode"]): AuditResult {
  const ai = x.findings;
  const rules = runRules(x).filter(
    (r) =>
      !ai.some(
        (a) =>
          a.type === r.type &&
          (r.lineIds.some((id) => a.lineIds.includes(id)) ||
            r.deductionIds.some((id) => a.deductionIds.includes(id)) ||
            (r.lineIds.length === 0 && Math.abs(a.disputedAmount - r.disputedAmount) < 1)),
      ),
  );
  const sev = { high: 0, medium: 1, low: 2 } as const;
  const findings: AuditFinding[] = [
    ...ai.map((f) => ({ ...f, source: "ai" as const })),
    ...rules.map((f) => ({ ...f, source: "rules" as const })),
  ]
    .sort((a, b) => sev[a.severity] - sev[b.severity] || b.disputedAmount - a.disputedAmount)
    .map((f, i) => ({ ...f, id: `F${i + 1}` }));

  const billed = x.hospital.billedTotal ?? x.lineItems.reduce((s, l) => s + l.amount, 0);
  const deducted = x.settlement.deductions.reduce((s, d) => s + d.amount, 0);
  return {
    extraction: x,
    findings,
    totals: {
      billed: fmt(billed),
      approved: x.settlement.approvedAmount,
      deducted: fmt(deducted),
      recoverable: fmt(findings.reduce((s, f) => s + Math.max(0, f.disputedAmount), 0)),
      flaggedLines: new Set(findings.flatMap((f) => f.lineIds)).size,
    },
    mode,
    generatedAt: new Date().toISOString(),
  };
}
