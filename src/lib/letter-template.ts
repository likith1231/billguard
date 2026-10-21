import { LANGS, PHRASES, type Lang } from "./letter-i18n";
import type { AuditResult } from "./schema";

// Findings are phrased for the patient ("Ask the insurer to…"); a letter speaks to the recipient.
function remedy(action: string) {
  return action
    .replace(/^Ask (?:the )?(?:insurer|hospital) to /i, "Please ")
    .replace(/^Ask (?:the )?(?:insurer|hospital) for /i, "Please provide ")
    .replace(/^Ask for /i, "Please provide ");
}

/** Deterministic dispute letter used in demo mode (no API key). */
export function templateLetter(audit: AuditResult, recipient: "insurer" | "hospital", findingIds: string[], sender?: string, lang: Lang = "en") {
  if (lang !== "en") return localisedLetter(audit, recipient, findingIds, sender, lang);
  const x = audit.extraction;
  const picked = audit.findings.filter((f) => findingIds.includes(f.id));
  const cur = x.currency === "INR" ? "Rs" : x.currency;
  const money = (n: number) => `${cur} ${Math.round(n).toLocaleString("en-IN")}`;
  const total = picked.reduce((s, f) => s + f.disputedAmount, 0);
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const name = sender || x.patient.name || "[Your name]";

  const to =
    recipient === "insurer"
      ? `The Grievance Redressal Officer\n${x.settlement.insurer ?? "[Insurer name]"}\n[Insurer address]`
      : `The Billing & Patient Relations Department\n${x.hospital.name ?? "[Hospital name]"}\n[Hospital address]`;

  const ref = [
    x.patient.policyNumber && `Policy No. ${x.patient.policyNumber}`,
    x.patient.claimNumber && `Claim No. ${x.patient.claimNumber}`,
    x.hospital.billNumber && `Bill No. ${x.hospital.billNumber}`,
  ].filter(Boolean).join(", ");

  const points = picked
    .map((f, i) => {
      const ev = f.evidence.map((e) => `     - ${e}`).join("\n");
      return `${i + 1}. ${f.title}\n   ${f.explanation}\n   Evidence:\n${ev}${f.policyClause ? `\n   Reference: ${f.policyClause}` : ""}\n   Amount in dispute: ${money(f.disputedAmount)}\n   Remedy requested: ${remedy(f.action)}`;
    })
    .join("\n\n");

  const closing =
    recipient === "insurer"
      ? `If this grievance is not resolved within 15 days, I will escalate it to the Insurance Ombudsman and register it on the IRDAI Bima Bharosa portal.`
      : `Please share a revised, itemised final bill and process the refund within 15 days. If unresolved, I will raise the matter with my insurer and the appropriate consumer forum.`;

  return `${name}
[Address]
[Phone] | [Email]

${today}

To,
${to}

Subject: Dispute of ${recipient === "insurer" ? "claim settlement" : "hospital bill"} — ${ref || "[reference numbers]"}

Dear Sir/Madam,

I am writing about the hospitalisation of ${x.patient.name ?? "[patient]"} at ${x.hospital.name ?? "[hospital]"} from ${x.hospital.admissionDate ?? "[date]"} to ${x.hospital.dischargeDate ?? "[date]"}${x.hospital.diagnosis ? ` for ${x.hospital.diagnosis}` : ""}. After reviewing the ${recipient === "insurer" ? "settlement letter against my policy wording" : "itemised bill"}, I dispute the following:

${points}

In total I request ${money(total)}. ${closing}

Enclosures:
1. Itemised hospital bill${x.hospital.billNumber ? ` (${x.hospital.billNumber})` : ""}
2. ${recipient === "insurer" ? "Claim settlement letter and policy wording" : "Discharge summary"}

Yours faithfully,

${name}
`;
}

/** Hindi / Kannada template: the letter frame is translated, the per-point details stay as the audit wrote them. */
function localisedLetter(audit: AuditResult, recipient: "insurer" | "hospital", findingIds: string[], sender: string | undefined, lang: Exclude<Lang, "en">) {
  const t = PHRASES[lang];
  const x = audit.extraction;
  const picked = audit.findings.filter((f) => findingIds.includes(f.id));
  const money = (n: number) => `Rs ${Math.round(n).toLocaleString("en-IN")}`;
  const total = picked.reduce((s, f) => s + f.disputedAmount, 0);
  const locale = LANGS.find((l) => l.id === lang)!.locale;
  const today = new Date().toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
  const name = sender || x.patient.name || t.placeholder.name;

  const ref = [
    x.patient.policyNumber && `${t.refs.policy} ${x.patient.policyNumber}`,
    x.patient.claimNumber && `${t.refs.claim} ${x.patient.claimNumber}`,
    x.hospital.billNumber && `${t.refs.bill} ${x.hospital.billNumber}`,
  ].filter(Boolean).join(", ");

  const to =
    recipient === "insurer"
      ? `${t.toInsurer}\n${x.settlement.insurer ?? t.insurerPlaceholder}\n${t.addressPlaceholder}`
      : `${t.toHospital}\n${x.hospital.name ?? t.hospitalPlaceholder}\n${t.addressPlaceholder}`;

  const points = picked
    .map((f, i) => {
      const ev = f.evidence.map((e) => `     - ${e}`).join("\n");
      return `${i + 1}. ${f.title}\n   ${f.explanation}\n   ${t.evidence}:\n${ev}${f.policyClause ? `\n   ${t.reference}: ${f.policyClause}` : ""}\n   ${t.amount}: ${money(f.disputedAmount)}\n   ${t.remedy}: ${remedy(f.action)}`;
    })
    .join("\n\n");

  return `${name}
${t.addr}
${t.contact}

${today}

${t.to}
${to}

${recipient === "insurer" ? t.subjectInsurer : t.subjectHospital} — ${ref || t.placeholder.ref}

${t.salutation}

${t.patient}: ${x.patient.name ?? t.placeholder.patient}
${t.hospital}: ${x.hospital.name ?? t.hospitalPlaceholder}
${t.stay(x.hospital.admissionDate ?? t.placeholder.date, x.hospital.dischargeDate ?? t.placeholder.date)}

${t.intro(recipient)}
${t.detailsNote}

${points}

${t.total(money(total))} ${recipient === "insurer" ? t.closingInsurer : t.closingHospital}

${t.enclosures}
1. ${t.encBill}
2. ${recipient === "insurer" ? t.encInsurer : t.encHospital}

${t.sign}

${name}
`;
}
