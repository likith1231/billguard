import { describe, expect, it } from "vitest";
import { findingsCsv, linesCsv } from "../export";
import { readFileSync } from "node:fs";
import { CSV_TEMPLATE, draftFromBillText, draftToExtraction, emptyDraft, extractionToDraft, guessCategory, linesFromCsv, num, parseCsv } from "../manual";
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

describe("reading a bill from text", () => {
  const sample = readFileSync("public/samples/hospital-bill.txt", "utf8");

  it("reads the header and every line of the sample bill", () => {
    const { fields, lines } = draftFromBillText(sample);
    expect(lines).toHaveLength(15);
    expect(fields).toMatchObject({ billNumber: "SMH/IP/26/07712", policyNumber: "NSH/2023/448812", patientName: "Ananya Rao", admissionDate: "2026-08-11", dischargeDate: "2026-08-14", billedTotal: "173500" });
    expect(fields.hospitalName).toMatch(/^SUNRISE MULTISPECIALITY HOSPITAL/);
  });

  it("matches the hand-entered sample extraction", () => {
    const { lines } = draftFromBillText(sample);
    const ceftriaxone = lines.find((l) => /ceftriaxone/i.test(l.description))!;
    expect(ceftriaxone).toMatchObject({ date: "2026-08-12", code: "PH-CTX1", quantity: "6", unitPrice: "95", mrp: "68", amount: "570", category: "pharmacy" });
    const room = lines[0];
    expect(room).toMatchObject({ quantity: "5", unitPrice: "7500", amount: "37500", mrp: "" });
    expect(lines.reduce((s, l) => s + Number(l.amount), 0)).toBe(173500);
  });

  it("ignores totals and prose, and copes with two-column rows", () => {
    expect(draftFromBillText("GRAND TOTAL 1,000\nPackage note: includes OT charges\n").lines).toHaveLength(0);
    expect(draftFromBillText("X-Ray chest 450 450\n").lines[0]).toMatchObject({ description: "X-Ray chest", quantity: "1", amount: "450" });
  });
});
