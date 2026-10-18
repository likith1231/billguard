import { describe, expect, it } from "vitest";
import { buildAudit, partyFor, runRules } from "../rules";
import { SAMPLE_EXTRACTION } from "../sample";
import type { Extraction, LineItem } from "../schema";

const line = (p: Partial<LineItem> & Pick<LineItem, "id" | "description">): LineItem => ({
  date: "2026-03-02",
  code: null,
  category: "other",
  quantity: 1,
  unitPrice: 100,
  amount: 100,
  mrp: null,
  page: null,
  ...p,
});

const base = (patch: Partial<Extraction> = {}): Extraction => ({
  currency: "INR",
  patient: { name: null, policyNumber: null, claimNumber: null },
  hospital: { name: null, billNumber: null, admissionDate: null, dischargeDate: null, diagnosis: null, billedTotal: null },
  lineItems: [],
  settlement: { insurer: null, claimedAmount: null, approvedAmount: null, deductions: [] },
  policy: { sumInsured: null, roomRentLimitPerDay: null, copayPercent: null, consumablesCovered: null, relevantClauses: [] },
  findings: [],
  summary: "",
  ...patch,
});

const types = (x: Extraction) => runRules(x).map((f) => f.type);

describe("runRules", () => {
  it("flags line arithmetic only when the bill overcharges", () => {
    const x = base({ lineItems: [line({ id: "L1", description: "Saline", quantity: 2, unitPrice: 90, amount: 220 }), line({ id: "L2", description: "Gauze", quantity: 2, unitPrice: 50, amount: 100 })] });
    const f = runRules(x);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ type: "arithmetic_error", lineIds: ["L1"], disputedAmount: 40 });
  });

  it("flags exact duplicates but not repeated uncoded pharmacy issues", () => {
    const x = base({
      lineItems: [
        line({ id: "L1", description: "Consultation Dr A", category: "consultation", amount: 1200, unitPrice: 1200 }),
        line({ id: "L2", description: "Consultation Dr A", category: "consultation", amount: 1200, unitPrice: 1200 }),
        line({ id: "L3", description: "Inj. Pantoprazole", category: "pharmacy" }),
        line({ id: "L4", description: "Inj. Pantoprazole", category: "pharmacy" }),
      ],
    });
    const dup = runRules(x).filter((f) => f.type === "duplicate_charge");
    expect(dup).toHaveLength(1);
    expect(dup[0].disputedAmount).toBe(1200);
  });

  it("allows the discharge day but flags extra bed-days", () => {
    const hospital = { ...base().hospital, admissionDate: "2026-03-01", dischargeDate: "2026-03-04" };
    const ok = base({ hospital, lineItems: [line({ id: "L1", description: "Room", category: "room", quantity: 4, unitPrice: 5000, amount: 20000 })] });
    const over = base({ hospital, lineItems: [line({ id: "L1", description: "Room", category: "room", quantity: 6, unitPrice: 5000, amount: 30000 })] });
    expect(types(ok)).not.toContain("billing_beyond_stay");
    expect(runRules(over).find((f) => f.type === "billing_beyond_stay")?.disputedAmount).toBe(10000);
  });

  it("flags pharmacy above MRP for the overcharged units", () => {
    const x = base({ lineItems: [line({ id: "L1", description: "Inj. X", category: "pharmacy", quantity: 6, unitPrice: 95, amount: 570, mrp: 68 })] });
    expect(runRules(x).find((f) => f.type === "mrp_violation")?.disputedAmount).toBe(162);
  });

  it("flags a settlement that doesn't reconcile", () => {
    const x = base({
      settlement: { insurer: "X", claimedAmount: 10000, approvedAmount: 7000, deductions: [{ id: "D1", description: "NME", amount: 2000, reasonGiven: "Non-medical", relatedLineIds: [] }] },
    });
    expect(runRules(x).find((f) => f.type === "wrongful_deduction")?.disputedAmount).toBe(1000);
  });

  it("flags co-pay above the policy rate and co-pay on a no-co-pay policy", () => {
    const settlement = { insurer: "X", claimedAmount: 100000, approvedAmount: 80000, deductions: [{ id: "D1", description: "Co-payment", amount: 20000, reasonGiven: "Co-pay as per policy", relatedLineIds: [] }] };
    const ten = base({ settlement, policy: { ...base().policy, copayPercent: 10 } });
    const none = base({ settlement, policy: { ...base().policy, copayPercent: 0 } });
    const unknown = base({ settlement });
    expect(runRules(ten).find((f) => f.type === "copay_error")?.disputedAmount).toBe(10000);
    expect(runRules(none).find((f) => f.type === "copay_error")?.disputedAmount).toBe(20000);
    expect(types(unknown)).not.toContain("copay_error");
  });

  it("flags a room-rent deduction when the room was within the cap", () => {
    const x = base({
      lineItems: [line({ id: "L1", description: "Ward", category: "room", quantity: 3, unitPrice: 4000, amount: 12000 })],
      settlement: { insurer: "X", claimedAmount: 12000, approvedAmount: 9000, deductions: [{ id: "D1", description: "Room", amount: 3000, reasonGiven: "Room rent above eligibility", relatedLineIds: ["L1"] }] },
      policy: { ...base().policy, roomRentLimitPerDay: 5000 },
    });
    const f = runRules(x).filter((r) => r.type === "wrongful_deduction");
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ disputedAmount: 3000, deductionIds: ["D1"] });
  });
});

describe("partyFor", () => {
  it("routes hospital billing errors to the hospital even if the insurer deducted them", () => {
    expect(partyFor({ type: "unbundling", deductionIds: ["D1"], lineIds: ["L3"], title: "" })).toBe("hospital");
    expect(partyFor({ type: "copay_error", deductionIds: [], lineIds: [], title: "" })).toBe("insurer");
    expect(partyFor({ type: "arithmetic_error", deductionIds: [], lineIds: [], title: "Settlement letter is short" })).toBe("insurer");
    expect(partyFor({ type: "arithmetic_error", deductionIds: [], lineIds: ["L2"], title: "Line maths" })).toBe("hospital");
  });
});

describe("buildAudit", () => {
  it("produces the documented sample-case totals", () => {
    const a = buildAudit(SAMPLE_EXTRACTION, "demo");
    expect(a.findings).toHaveLength(11);
    expect(a.totals.recoverable).toBeCloseTo(63450.97, 2);
    expect(a.findings.map((f) => f.id)).toEqual(a.findings.map((_, i) => `F${i + 1}`));
  });

  it("drops a rule finding the AI already reported under a different type", () => {
    const x = base({
      settlement: { insurer: "X", claimedAmount: 10000, approvedAmount: 7000, deductions: [{ id: "D1", description: "NME", amount: 2000, reasonGiven: "Non-medical", relatedLineIds: [] }] },
      findings: [
        { type: "arithmetic_error", severity: "medium", title: "Approved amount is short", explanation: "", evidence: [], policyClause: null, disputedAmount: 1000, lineIds: [], deductionIds: [], action: "" },
      ],
    });
    const a = buildAudit(x, "live");
    expect(a.findings).toHaveLength(1);
    expect(a.findings[0].source).toBe("ai");
    expect(a.totals.recoverable).toBe(1000);
  });
});
