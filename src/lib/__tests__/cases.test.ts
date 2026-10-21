import { beforeEach, describe, expect, it } from "vitest";
import { daysSince, deleteCase, exportCases, importCases, listCases, parseCases, saveCase, updateCase } from "../cases";
import { emailSubject, gmailUrl, looksLikeEmail, mailtoUrl } from "../email";
import { buildAudit } from "../rules";
import { SAMPLE_EXTRACTION } from "../sample";
import { PHRASES } from "../letter-i18n";
import { templateLetter } from "../letter-template";

// Minimal browser stand-ins for the node test environment.
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  Object.assign(globalThis, {
    localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) },
    window: { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} },
  });
});

const audit = () => buildAudit(SAMPLE_EXTRACTION, "demo");

describe("saved cases", () => {
  it("saves, de-duplicates and updates", () => {
    const a = audit();
    saveCase(a);
    saveCase(a, { status: "sent_insurer", sentOn: "2026-09-01" });
    const [c, ...rest] = listCases();
    expect(rest).toHaveLength(0);
    expect(c).toMatchObject({ id: a.generatedAt, status: "sent_insurer", sentOn: "2026-09-01" });
    updateCase(c.id, { recovered: 12000, notes: "Called TPA" });
    expect(listCases()[0]).toMatchObject({ recovered: 12000, notes: "Called TPA", status: "sent_insurer" });
    deleteCase(c.id);
    expect(listCases()).toHaveLength(0);
  });

  it("round-trips a backup and keeps the newer copy", () => {
    const a = audit();
    saveCase(a);
    const backup = exportCases();
    updateCase(a.generatedAt, { notes: "newer" });
    expect(importCases(backup)).toBe(0); // local copy is newer
    deleteCase(a.generatedAt);
    expect(importCases(backup)).toBe(1);
    expect(listCases()).toHaveLength(1);
  });

  it("ignores corrupt storage and bad backups", () => {
    expect(parseCases("not json")).toEqual([]);
    expect(parseCases('[{"id":1}]')).toEqual([]);
    expect(() => importCases('{"cases":[]}')).toThrow(/No BillGuard cases/);
  });

  it("counts days since the letter was sent", () => {
    expect(daysSince("2026-09-01", new Date("2026-09-17T12:00:00Z"))).toBe(16);
    expect(daysSince(null)).toBeNull();
  });
});

describe("email", () => {
  it("builds a mailto link, falling back when the letter is too long", () => {
    const short = mailtoUrl("a@b.in", "Hi there", "Line 1\nLine 2");
    expect(short.fits).toBe(true);
    expect(short.href).toBe("mailto:a%40b.in?subject=Hi%20there&body=Line%201%0ALine%202");
    const long = mailtoUrl("a@b.in", "s", "x".repeat(3000));
    expect(long.fits).toBe(false);
    expect(decodeURIComponent(long.href)).toContain("copied to your clipboard");
  });

  it("builds subjects and Gmail links", () => {
    expect(emailSubject(audit(), "hospital")).toBe("Dispute of hospital bill — Claim CLM-26-0918-3341, Policy NSH/2023/448812, Bill SMH/IP/26/07712");
    expect(gmailUrl("a@b.in", "S", "B")).toBe("https://mail.google.com/mail/?view=cm&fs=1&to=a%40b.in&su=S&body=B");
    expect(looksLikeEmail("grievance@insurer.co.in")).toBe(true);
    expect(looksLikeEmail("nope")).toBe(false);
  });
});

describe("Hindi and Kannada template letters", () => {
  const a = audit();
  const ids = a.findings.map((f) => f.id);
  const amount = Math.round(a.findings.reduce((s, f) => s + f.disputedAmount, 0)).toLocaleString("en-IN");

  for (const lang of ["hi", "kn"] as const) {
    for (const r of ["insurer", "hospital"] as const) {
      it(`${lang} → ${r}`, () => {
        const t = templateLetter(a, r, ids, "Ananya Rao", lang);
        const p = PHRASES[lang];
        expect(t).toContain(r === "insurer" ? p.toInsurer : p.toHospital);
        expect(t).toContain(p.total(`Rs ${amount}`));
        expect(t).toContain(r === "insurer" ? p.closingInsurer : p.closingHospital);
        expect(t).not.toMatch(/Dear Sir|Yours faithfully|undefined|\[object/);
        for (const f of a.findings) expect(t).toContain(f.title);
      });
    }
  }

  it("English output is unchanged by the language parameter", () => {
    expect(templateLetter(a, "insurer", ids, "X", "en")).toBe(templateLetter(a, "insurer", ids, "X"));
  });
});
