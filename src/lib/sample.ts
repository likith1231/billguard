import type { Extraction } from "./schema";

/**
 * A fictitious, internally consistent case used when no API key is configured
 * (or when the visitor clicks "Try a sample"). It mirrors the documents in
 * public/samples/, so running those through the live pipeline should land on
 * similar findings.
 */
export const SAMPLE_EXTRACTION: Extraction = {
  currency: "INR",
  patient: { name: "Ananya Rao", policyNumber: "NSH/2023/448812", claimNumber: "CLM-26-0918-3341" },
  hospital: {
    name: "Sunrise Multispeciality Hospital (sample)",
    billNumber: "SMH/IP/26/07712",
    admissionDate: "2026-08-11",
    dischargeDate: "2026-08-14",
    diagnosis: "Acute appendicitis — laparoscopic appendectomy",
    billedTotal: 173500,
  },
  lineItems: [
    { id: "L1", date: "2026-08-11", description: "Private Room (Single AC) — bed charges", code: "RM-PVT", category: "room", quantity: 5, unitPrice: 7500, amount: 37500, mrp: null, page: 1 },
    { id: "L2", date: "2026-08-12", description: "Laparoscopic Appendectomy — all-inclusive package", code: "PKG-LAPAPP", category: "surgery_package", quantity: 1, unitPrice: 85000, amount: 85000, mrp: null, page: 1 },
    { id: "L3", date: "2026-08-12", description: "Operation theatre charges", code: "OT-01", category: "ot_charges", quantity: 1, unitPrice: 18000, amount: 18000, mrp: null, page: 1 },
    { id: "L4", date: "2026-08-12", description: "Anaesthetist fee", code: "ANS-01", category: "procedure", quantity: 1, unitPrice: 12000, amount: 12000, mrp: null, page: 1 },
    { id: "L5", date: "2026-08-12", description: "Consultation — Dr. M. Iyer (General Surgery)", code: "CON-GS", category: "consultation", quantity: 1, unitPrice: 1200, amount: 1200, mrp: null, page: 1 },
    { id: "L6", date: "2026-08-12", description: "Consultation — Dr. M. Iyer (General Surgery)", code: "CON-GS", category: "consultation", quantity: 1, unitPrice: 1200, amount: 1200, mrp: null, page: 1 },
    { id: "L7", date: "2026-08-11", description: "Complete Blood Count (CBC)", code: "LAB-CBC", category: "diagnostics_lab", quantity: 1, unitPrice: 1350, amount: 1350, mrp: null, page: 2 },
    { id: "L8", date: "2026-08-11", description: "CT Abdomen with contrast", code: "RAD-CTA", category: "diagnostics_imaging", quantity: 1, unitPrice: 7800, amount: 7800, mrp: null, page: 2 },
    { id: "L9", date: "2026-08-12", description: "Inj. Ceftriaxone 1g", code: "PH-CTX1", category: "pharmacy", quantity: 6, unitPrice: 95, amount: 570, mrp: 68, page: 2 },
    { id: "L10", date: "2026-08-12", description: "Paracetamol IV infusion 1g/100ml", code: "PH-PCM", category: "pharmacy", quantity: 6, unitPrice: 180, amount: 1080, mrp: 190, page: 2 },
    { id: "L11", date: "2026-08-12", description: "Normal Saline 0.9% 500ml", code: "PH-NS500", category: "pharmacy", quantity: 10, unitPrice: 48, amount: 520, mrp: 52, page: 2 },
    { id: "L12", date: "2026-08-12", description: "Surgical gloves (pair)", code: "CS-GLV", category: "consumables", quantity: 40, unitPrice: 22, amount: 880, mrp: null, page: 2 },
    { id: "L13", date: "2026-08-11", description: "Nursing charges", code: "NUR-01", category: "nursing", quantity: 3, unitPrice: 1500, amount: 4500, mrp: null, page: 2 },
    { id: "L14", date: "2026-08-11", description: "Admission kit", code: "ADM-KIT", category: "admin", quantity: 1, unitPrice: 1500, amount: 1500, mrp: null, page: 2 },
    { id: "L15", date: "2026-08-11", description: "ECG 12 lead", code: "CAR-ECG", category: "diagnostics_lab", quantity: 1, unitPrice: 400, amount: 400, mrp: null, page: 2 },
  ],
  settlement: {
    insurer: "Northstar Health Insurance (sample)",
    claimedAmount: 173500,
    approvedAmount: 103518,
    deductions: [
      { id: "D1", description: "Proportionate deduction on associated medical expenses", amount: 41933, reasonGiven: "Room rent eligibility of Rs 5,000/day exceeded; proportionate deduction applied on associated medical expenses", relatedLineIds: ["L2", "L3", "L4", "L7", "L8", "L9", "L10"] },
      { id: "D2", description: "Room rent in excess of eligibility", amount: 12500, reasonGiven: "Room rent above eligible limit of Rs 5,000/day", relatedLineIds: ["L1"] },
      { id: "D3", description: "Non-medical items", amount: 2380, reasonGiven: "Non-medical items as per IRDAI list of non-payable items", relatedLineIds: ["L12", "L14"] },
      { id: "D4", description: "Co-payment 10%", amount: 11669, reasonGiven: "Co-payment as per policy terms", relatedLineIds: [] },
    ],
  },
  policy: {
    sumInsured: 500000,
    roomRentLimitPerDay: 5000,
    copayPercent: 10,
    consumablesCovered: true,
    relevantClauses: [
      { clause: "Clause 4.1 — Room rent", text: "Room rent up to 1% of sum insured per day (Rs 5,000)." },
      { clause: "Clause 5.3 — Co-payment", text: "A co-payment of 10% shall apply on admissible claims where the insured person is aged 61 years or above at entry." },
      { clause: "Section 7.2 — Protect Plus rider", text: "Covers the items listed in Annexure I (list of non-payable items) of the IRDAI guidelines, including gloves and admission kits." },
    ],
  },
  findings: [
    {
      type: "unbundling",
      severity: "high",
      title: "OT and anaesthetist fees billed on top of an all-inclusive package",
      explanation: "The laparoscopic appendectomy was billed as an all-inclusive package, and the hospital's own package note says it covers OT charges and anaesthetist fees. Billing them again as separate lines charges you twice for the same thing.",
      evidence: [
        "L2: Laparoscopic Appendectomy — all-inclusive package — 85,000",
        "Package note: \"includes OT charges, surgeon & anaesthetist fees, OT consumables and standard medicines during surgery\"",
        "L3: Operation theatre charges — 18,000; L4: Anaesthetist fee — 12,000",
      ],
      policyClause: null,
      disputedAmount: 30000,
      lineIds: ["L2", "L3", "L4"],
      deductionIds: [],
      action: "Ask the hospital to remove L3 and L4 and issue a revised final bill.",
    },
    {
      type: "copay_error",
      severity: "high",
      title: "10% co-pay deducted although it only applies to insured aged 61+",
      explanation: "Your policy applies the 10% co-payment only when the insured person joined at 61 or older. The policy schedule shows an entry age of 31, so no co-pay should have been taken.",
      evidence: ["D4: \"Co-payment as per policy terms\" — 11,669", "Clause 5.3: \"...where the insured person is aged 61 years or above at entry.\"", "Policy schedule: \"Insured: Ananya Rao, age at entry 31\""],
      policyClause: "Clause 5.3 — Co-payment",
      disputedAmount: 11669,
      lineIds: [],
      deductionIds: ["D4"],
      action: "Ask the insurer to reverse deduction D4 in full.",
    },
    {
      type: "non_payable_misclassification",
      severity: "medium",
      title: "Gloves and admission kit deducted despite your consumables rider",
      explanation: "The insurer deducted gloves and the admission kit as non-payable, but your Protect Plus rider specifically covers the IRDAI non-payable list, including those items.",
      evidence: ["D3: \"Non-medical items as per IRDAI list of non-payable items\" — 2,380", "Section 7.2: \"Covers the items listed in Annexure I ... including gloves and admission kits.\""],
      policyClause: "Section 7.2 — Protect Plus rider",
      disputedAmount: 2380,
      lineIds: ["L12", "L14"],
      deductionIds: ["D3"],
      action: "Ask the insurer to reverse deduction D3 under the Protect Plus rider.",
    },
    {
      type: "unbundling",
      severity: "medium",
      title: "Nursing charged separately though the room tariff includes it",
      explanation: "The hospital's room tariff says nursing care is included in the private room rate, yet nursing was billed again as its own line.",
      evidence: ["Room tariff note: \"Room tariff includes nursing care, RMO visits and bed linen\"", "L13: Nursing charges 3 × 1,500 = 4,500"],
      policyClause: null,
      disputedAmount: 4500,
      lineIds: ["L13"],
      deductionIds: [],
      action: "Ask the hospital to remove L13.",
    },
  ],
  summary:
    "The hospital billed OT and anaesthesia on top of an all-inclusive package, added an extra bed-day and a duplicate consultation, and sold ceftriaxone above MRP. The insurer then applied a co-pay the policy doesn't allow, deducted items your rider covers, and cut ICU-exempt heads (pharmacy, diagnostics) proportionately.",
};
