import { z } from "zod";

/**
 * Everything Claude extracts from the uploaded documents. Kept to plain
 * strings/numbers/enums/nullables so it maps cleanly onto structured outputs.
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

export const LineItem = z.object({
  id: z.string().describe("Stable id like L1, L2 ... in bill order"),
  date: z.string().nullable().describe("ISO date YYYY-MM-DD if printed, else null"),
  description: z.string(),
  code: z.string().nullable().describe("Hospital/CPT/batch code if printed"),
  category: LineItemCategory,
  quantity: z.number(),
  unitPrice: z.number(),
  amount: z.number().describe("Amount exactly as printed on the bill"),
  mrp: z.number().nullable().describe("Printed MRP per unit for pharmacy items, else null"),
  page: z.number().nullable(),
});
export type LineItem = z.infer<typeof LineItem>;

export const Deduction = z.object({
  id: z.string().describe("D1, D2 ..."),
  description: z.string(),
  amount: z.number(),
  reasonGiven: z.string().describe("Reason exactly as stated by the insurer/TPA"),
  relatedLineIds: z.array(z.string()),
});
export type Deduction = z.infer<typeof Deduction>;

export const Finding = z.object({
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
  policyClause: z.string().nullable().describe("Clause number/name from the policy wording, if any"),
  disputedAmount: z.number().describe("Amount in the bill's currency that should be refunded or paid"),
  lineIds: z.array(z.string()),
  deductionIds: z.array(z.string()),
  action: z.string().describe("Exactly what to ask the hospital or insurer for"),
});
export type Finding = z.infer<typeof Finding>;

export const Extraction = z.object({
  currency: z.string().describe("ISO currency code, e.g. INR"),
  patient: z.object({
    name: z.string().nullable(),
    policyNumber: z.string().nullable(),
    claimNumber: z.string().nullable(),
  }),
  hospital: z.object({
    name: z.string().nullable(),
    billNumber: z.string().nullable(),
    admissionDate: z.string().nullable(),
    dischargeDate: z.string().nullable(),
    diagnosis: z.string().nullable(),
    billedTotal: z.number().nullable().describe("Grand total printed on the bill"),
  }),
  lineItems: z.array(LineItem),
  settlement: z.object({
    insurer: z.string().nullable(),
    claimedAmount: z.number().nullable(),
    approvedAmount: z.number().nullable(),
    deductions: z.array(Deduction),
  }),
  policy: z.object({
    sumInsured: z.number().nullable(),
    roomRentLimitPerDay: z.number().nullable(),
    copayPercent: z.number().nullable(),
    consumablesCovered: z.boolean().nullable(),
    relevantClauses: z.array(z.object({ clause: z.string(), text: z.string() })),
  }),
  findings: z.array(Finding),
  summary: z.string().describe("Two or three sentence overview of what went wrong"),
});
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
  mode: "live" | "demo";
  generatedAt: string;
};
