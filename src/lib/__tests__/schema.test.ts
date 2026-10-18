import { z } from "zod";
import { describe, expect, it } from "vitest";
import { Extraction, WireExtraction } from "../schema";

describe("wire schema", () => {
  it("stays within the structured-output limit of 16 nullable fields", () => {
    const js = JSON.stringify(z.toJSONSchema(WireExtraction));
    const unions = (js.match(/"anyOf"/g) ?? []).length + (js.match(/"type":\[/g) ?? []).length;
    expect(unions).toBeLessThanOrEqual(16);
  });

  it("maps empty strings from the model back to null", () => {
    const x = Extraction.parse({
      currency: "INR",
      patient: { name: "", policyNumber: "P1", claimNumber: "" },
      hospital: { name: "H", billNumber: "", admissionDate: "", dischargeDate: "", diagnosis: "", billedTotal: null },
      lineItems: [{ id: "L1", date: "", description: "x", code: "", category: "room", quantity: 1, unitPrice: 1, amount: 1, mrp: null, page: null }],
      settlement: { insurer: "", claimedAmount: null, approvedAmount: null, deductions: [] },
      policy: { sumInsured: null, roomRentLimitPerDay: null, copayPercent: null, consumablesCovered: null },
      findings: [],
      summary: "",
    });
    expect(x.patient).toEqual({ name: null, policyNumber: "P1", claimNumber: null });
    expect(x.lineItems[0].date).toBeNull();
    expect(x.policy.relevantClauses).toEqual([]);
  });
});
