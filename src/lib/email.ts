import { PHRASES, type Lang } from "./letter-i18n";
import type { AuditResult } from "./schema";

// Mail clients truncate or refuse very long mailto: links, so longer letters are copied instead.
export const MAILTO_BODY_LIMIT = 1800;

export function emailSubject(audit: AuditResult, recipient: "insurer" | "hospital", lang: Lang = "en") {
  const x = audit.extraction;
  const ref = [x.patient.claimNumber && `Claim ${x.patient.claimNumber}`, x.patient.policyNumber && `Policy ${x.patient.policyNumber}`, x.hospital.billNumber && `Bill ${x.hospital.billNumber}`]
    .filter(Boolean)
    .join(", ");
  const lead =
    lang === "en"
      ? recipient === "insurer" ? "Grievance: claim settlement dispute" : "Dispute of hospital bill"
      : (recipient === "insurer" ? PHRASES[lang].subjectInsurer : PHRASES[lang].subjectHospital).replace(/^[^:]+:\s*/, "");
  return ref ? `${lead} — ${ref}` : lead;
}

const enc = encodeURIComponent;

/** Returns the link plus whether the whole letter fit in it (if not, the caller should copy it). */
export function mailtoUrl(to: string, subject: string, body: string) {
  const fits = enc(body).length <= MAILTO_BODY_LIMIT;
  const text = fits ? body : "(The letter is copied to your clipboard — paste it here.)";
  return { href: `mailto:${enc(to.trim())}?subject=${enc(subject)}&body=${enc(text)}`, fits };
}

export function gmailUrl(to: string, subject: string, body: string) {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${enc(to.trim())}&su=${enc(subject)}&body=${enc(body)}`;
}

export const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
