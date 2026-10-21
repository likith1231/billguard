import { z } from "zod";

/**
 * Everything Claude extracts from the uploaded documents. Kept to plain
 * strings/numbers/enums/nullables so it maps cleanly onto structured outputs.
 *
 * Structured outputs allow at most 16 nullable fields, so optional text is sent
 * to the model as a plain string ("" when absent) and mapped back to null here.
 * `build(true)` is the wire schema given to the model; `build(false)` is the app's.
 * The wire schema is close to the API's compiled-grammar size limit: adding fields
 * to it can make every audit fail with a 400, so test a live request after changes.
 */

export const LineItemCategory = z.enum([
  "room",
  "icu",
  "consultation",
  "procedure",
  "surgery_package",
  "ot_charges",
  "pharmacy",
  "consumables",
  "implant",
  "diagnostics_lab",
  "diagnostics_imaging",
  "nursing",
  "admin",
  "other",
]);
export type LineItemCategory = z.infer<typeof LineItemCategory>;

function build(wire: boolean) {
  const optText = (desc?: string) => {
    const t = wire ? z.string() : z.preprocess((v) => (v === "" ? null : v), z.string().nullable());
    return desc ? t.describe(wire ? `${desc}. Empty string if not shown.` : desc) : wire ? t.describe("Empty string if not shown") : t;
  };

  const LineItem = z.object({
    id: z.string().describe("Stable id like L1, L2 ... in bill order"),
    date: optText("ISO date YYYY-MM-DD if printed"),
    description: z.string(),
    code: optText("Hospital/CPT/batch code if printed"),
    category: LineItemCategory,
    quantity: z.number(),
    unitPrice: z.number(),
    amount: z.number().describe("Amount exactly as printed on the bill"),
    mrp: z.number().nullable().describe("Printed MRP per unit for pharmacy items, else null"),
    page: z.number().nullable(),
  });

  const Deduction = z.object({
    id: z.string().describe("D1, D2 ..."),
    description: z.string(),
    amount: z.number(),
    reasonGiven: z.string().describe("Reason exactly as stated by the insurer/TPA"),
    relatedLineIds: z.array(z.string()),
  });

  const Finding = z.object({
    type: z.enum([
      "duplicate_charge",
      "unbundling",
      "overcharge_vs_benchmark",
      "mrp_violation",
      "arithmetic_error",
      "billing_beyond_stay",
      "wrongful_deduction",
      "proportionate_deduction",
      "non_payable_misclassification",
      "copay_error",
      "policy_violation",
      "other",
    ]),
    severity: z.enum(["high", "medium", "low"]),
    title: z.string(),
    explanation: z.string().describe("Plain-language explanation for a patient"),
    evidence: z
      .array(z.string())
      .describe("Short verbatim quotes from the bill, letter or policy that prove the point"),
    policyClause: optText("Clause number/name from the policy wording, if any"),
    disputedAmount: z.number().describe("Amount in the bill's currency that should be refunded or paid"),
    lineIds: z.array(z.string()),
    deductionIds: z.array(z.string()),
    action: z.string().describe("Exactly what to ask the hospital or insurer for"),
  });

  const Extraction = z.object({
    currency: z.string().describe("ISO currency code, e.g. INR"),
    patient: z.object({
      name: optText(),
      policyNumber: optText(),
      claimNumber: optText(),
    }),
    hospital: z.object({
      name: optText(),
      billNumber: optText(),
      admissionDate: optText(),
      dischargeDate: optText(),
      diagnosis: optText(),
      billedTotal: z.number().nullable().describe("Grand total printed on the bill"),
    }),
    lineItems: z.array(LineItem),
    settlement: z.object({
      insurer: optText(),
      claimedAmount: z.number().nullable(),
      approvedAmount: z.number().nullable(),
      deductions: z.array(Deduction),
    }),
    policy: z.object({
      sumInsured: z.number().nullable(),
      roomRentLimitPerDay: z.number().nullable(),
      copayPercent: z.number().nullable(),
      consumablesCovered: z.boolean().nullable(),
      // Not requested from the model: the full schema would exceed the structured-output grammar
      // limit, and findings already quote the clause they rely on (policyClause + evidence).
      ...(wire ? {} : { relevantClauses: z.array(z.object({ clause: z.string(), text: z.string() })).default([]) }),
    }),
    findings: z.array(Finding),
    summary: z.string().describe("Two or three sentence overview of what went wrong"),
  });

  return { LineItem, Deduction, Finding, Extraction };
}

export const { LineItem, Deduction, Finding, Extraction } = build(false);
/** Sent to the model as the output format; parse its JSON with `Extraction`. */
export const WireExtraction = build(true).Extraction;
export type LineItem = z.infer<typeof LineItem>;
export type Deduction = z.infer<typeof Deduction>;
export type Finding = z.infer<typeof Finding>;
export type Extraction = z.infer<typeof Extraction>;

export type FindingSource = "ai" | "rules";
export type AuditFinding = Finding & { id: string; source: FindingSource };

export type AuditResult = {
  extraction: Extraction;
  findings: AuditFinding[];
  totals: {
    billed: number;
    approved: number | null;
    deducted: number;
    recoverable: number;
    flaggedLines: number;
  };
  /** live = read by Claude, demo = built-in sample, manual = typed in by the user (rules only). */
  mode: "live" | "demo" | "manual";
  /** Price-band settings used for the benchmark check. Absent on audits saved before this existed. */
  rates?: { city: string | null; tier: 1 | 2 | 3 | null; customRates: number };
  generatedAt: string;
};
