import { describe, expect, it } from "vitest";
import { findBenchmark, parseRateCsv, RATE_CSV_TEMPLATE } from "../benchmarks";
import { parseCsv } from "../manual";
import { buildAudit } from "../rules";
import { SAMPLE_EXTRACTION } from "../sample";
import type { Extraction } from "../schema";

const withLine = (description: string, unitPrice: number): Extraction => ({
  ...SAMPLE_EXTRACTION,
  findings: [],
  settlement: { ...SAMPLE_EXTRACTION.settlement, deductions: [] },
  hospital: { ...SAMPLE_EXTRACTION.hospital, billedTotal: unitPrice },
  lineItems: [{ id: "L1", date: null, description, code: null, category: "diagnostics_lab", quantity: 1, unitPrice, amount: unitPrice, mrp: null, page: null }],
});
const benchmarkFindings = (x: Extraction, rates = {}) => buildAudit(x, "manual", rates).findings.filter((f) => f.type === "overcharge_vs_benchmark");

describe("city tiers", () => {
  it("scales bands down for smaller cities", () => {
    expect(findBenchmark("CBC")?.high).toBe(450);
    expect(findBenchmark("CBC", { city: "Mumbai" })?.high).toBe(450);
    expect(findBenchmark("CBC", { city: "Jaipur" })?.high).toBe(405);
    expect(findBenchmark("CBC", { city: "Other city / town" })?.high).toBe(360);
  });

  it("flags a price in a small town that a metro would tolerate", () => {
    const x = withLine("CBC", 600); // 600 < 1.5 × 450, but 600 > 1.5 × 360
    expect(benchmarkFindings(x, { city: "Mumbai" })).toHaveLength(0);
    expect(benchmarkFindings(x, { city: "Other city / town" })).toHaveLength(1);
  });

  it("records the settings on the audit", () => {
    expect(buildAudit(withLine("CBC", 100), "manual", { city: "Pune" }).rates).toEqual({ city: "Pune", tier: 2, customRates: 0 });
  });
});

describe("custom rate tables", () => {
  const custom = parseRateCsv(parseCsv(RATE_CSV_TEMPLATE));

  it("parses the template", () => {
    expect(custom).toHaveLength(3);
    expect(custom[0]).toMatchObject({ item: "CBC", high: 200, unit: "test", source: "CGHS list" });
  });

  it("treats the rate as a hard ceiling that overrides built-in bands", () => {
    const x = withLine("CBC", 250); // inside the built-in band, above the user's ceiling
    expect(benchmarkFindings(x)).toHaveLength(0);
    const [f] = benchmarkFindings(x, { custom });
    expect(f.disputedAmount).toBe(50);
    expect(f.explanation).toMatch(/capped at .*200.*CGHS list/);
  });

  it("does not flag a price at the ceiling", () => {
    expect(benchmarkFindings(withLine("CBC", 200), { custom })).toHaveLength(0);
  });

  it("rejects tables without the needed columns", () => {
    expect(() => parseRateCsv([["Foo", "Bar"]])).toThrow(/Item column/);
    expect(() => parseRateCsv([["Item", "Max"], ["", "x"]])).toThrow(/No usable rows/);
  });
});
