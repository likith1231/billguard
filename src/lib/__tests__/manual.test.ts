import { describe, expect, it } from "vitest";
import { findingsCsv, linesCsv } from "../export";
import { CSV_TEMPLATE, draftToExtraction, emptyDraft, extractionToDraft, guessCategory, linesFromCsv, num, parseCsv } from "../manual";
import { buildAudit } from "../rules";
import { SAMPLE_EXTRACTION } from "../sample";

describe("num", () => {
  it("reads Indian-formatted amounts", () => {
    expect(num("1,20,000")).toBe(120000);
    expect(num("₹ 450.50")).toBe(450.5);
    expect(num("Rs. 90")).toBe(90);
    expect(num("")).toBeNull();
    expect(num("abc")).toBeNull();
  });
});

describe("CSV", () => {
  it("parses quoted fields, escaped quotes and CRLF", () => {
    expect(parseCsv('a,"b, c","say ""hi"""\r\n1,2,3\r\n')).toEqual([
      ["a", "b, c", 'say "hi"'],
      ["1", "2", "3"],
    ]);
  });

  it("imports the template", () => {
    const lines = linesFromCsv(CSV_TEMPLATE);
    expect(lines).toHaveLength(3);
    expect(lines[2]).toMatchObject({ description: "Inj. Ceftriaxone 1g", category: "pharmacy", quantity: "6", unitPrice: "95", mrp: "68" });
  });

  it("round-trips BillGuard's own line export", () => {
    const audit = buildAudit(SAMPLE_EXTRACTION, "demo");
    const lines = linesFromCsv(linesCsv(audit));
    expect(lines).toHaveLength(SAMPLE_EXTRACTION.lineItems.length);
    expect(lines.map((l) => Number(l.amount))).toEqual(SAMPLE_EXTRACTION.lineItems.map((l) => l.amount));
  });

  it("guesses categories for unfamiliar headers", () => {
    const lines = linesFromCsv("Particulars,Rate,Net\nICU charges,9000,9000\nCBC,650,650\n");
    expect(lines.map((l) => l.category)).toEqual(["icu", "diagnostics_lab"]);
    expect(guessCategory("Private room")).toBe("room");
  });

  it("neutralises spreadsheet formulas in exports", () => {
    const audit = buildAudit(SAMPLE_EXTRACTION, "demo");
    audit.findings[0].title = "=HYPERLINK(1)";
    expect(findingsCsv(audit)).toContain(`"'=HYPERLINK(1)"`);
  });
});

describe("manual draft", () => {
  it("round-trips the sample and gives the same rule findings", () => {
    const x = draftToExtraction(extractionToDraft(SAMPLE_EXTRACTION));
    expect(x.lineItems).toEqual(SAMPLE_EXTRACTION.lineItems.map((l) => ({ ...l, page: null })));
    expect(x.settlement.deductions.map((d) => d.relatedLineIds)).toEqual(SAMPLE_EXTRACTION.settlement.deductions.map((d) => d.relatedLineIds));
    expect(buildAudit(x, "manual").findings.length).toBeGreaterThan(0);
  });

  it("skips blank rows and fills amount from quantity × rate", () => {
    const d = emptyDraft();
    d.lines[0] = { ...d.lines[0], description: "CBC", quantity: "2", unitPrice: "650" };
    const x = draftToExtraction(d);
    expect(x.lineItems).toHaveLength(1);
    expect(x.lineItems[0]).toMatchObject({ id: "L1", amount: 1300, date: null });
  });
});
