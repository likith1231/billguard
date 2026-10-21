import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { BENCHMARKS } from "./benchmarks";
import { LANGS, type Lang } from "./letter-i18n";
import { Extraction, WireExtraction, type AuditResult } from "./schema";

/** Override with CLAUDE_MODEL, e.g. claude-opus-5-5 (most thorough) or claude-haiku-5-5 (cheapest). */
export const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";

// Server-side refusal fallback; Haiku has none, so it is only sent for the other models.
const FALLBACK = MODEL.startsWith("claude-haiku")
  ? {}
  : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

let _client: Anthropic | null = null;
export function client() {
  _client ??= new Anthropic();
  return _client;
}

export function hasCredentials() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export type UploadedDoc = {
  role: "bill" | "insurer_letter" | "policy";
  name: string;
  mediaType: string;
  data: Buffer;
};

const ROLE_LABEL: Record<UploadedDoc["role"], string> = {
  bill: "HOSPITAL BILL",
  insurer_letter: "INSURER / TPA SETTLEMENT LETTER",
  policy: "POLICY WORDING",
};

const AUDIT_SYSTEM = `You are BillGuard, a meticulous medical-billing and health-insurance claims auditor working for the patient.

You receive a hospital bill and, when available, the insurer/TPA settlement letter and the policy wording. Do two jobs in one pass:

1. EXTRACT faithfully. Every line item on the bill, with quantity, unit price and amount exactly as printed (do not correct the hospital's arithmetic — downstream code checks it). Every deduction in the settlement letter with the reason exactly as the insurer worded it, linked to the bill lines it relates to. Policy limits (sum insured, room-rent cap, co-pay, consumables cover). Quote the policy wording a finding relies on verbatim in its evidence, with the clause number in policyClause. For anything not present use null (or an empty string for text fields). Never invent values.

2. AUDIT as an advocate for the patient. Flag only issues you can support with evidence quoted from the documents. Look especially for:
- Unbundling: items billed separately that are included in a surgery/procedure package or in room charges (nursing, RMO visits, bed linen, routine monitoring).
- Wrongful deductions: deductions that contradict the policy wording, cite a clause that doesn't say what the insurer claims, or label payable items as non-payable.
- Proportionate (room-rent) deductions applied to heads that are exempt from them.
- Consumables deducted although the policy has a consumables cover/add-on.
- Co-pay applied at a higher percentage, or on a base, other than the policy states.
- Repudiation or deductions without a specific policy clause cited.
- Items priced far outside normal ranges, using the indicative benchmarks below only as a guide.

Indian regulatory context you may rely on (cite it as such and tell the patient to verify against their own policy):
- IRDAI Master Circular on Health Insurance Business (2024): proportionate deductions cannot be applied to ICU charges, pharmacy, consumables, implants, medical devices and diagnostics; insurers must cite the specific policy clause when rejecting or deducting; after 60 continuous months of coverage a claim cannot be contested except for proven fraud; cashless authorisation within 1 hour and final discharge authorisation within 3 hours of request.
- IRDAI's standard list of non-payable items (gloves, masks, admission kits, etc.) — but those are payable when the policy has a consumables cover.
- Charging above the printed MRP is not permitted.

Indicative benchmark bands (INR, per unit; not official tariffs):
${BENCHMARKS.map((b) => `- ${b.label}: ${b.low}–${b.high} per ${b.unit}`).join("\n")}

Leave pure arithmetic, exact-duplicate, length-of-stay and MRP checks to the deterministic engine unless they're entangled with a policy or bundling issue — it will add those itself. For every finding, disputedAmount must be the specific amount you believe should be refunded or paid, never more than the related line or deduction. Write explanations a non-expert can act on. Be precise, not alarmist: if something is merely unusual, mark it low severity.`;

function docBlock(d: UploadedDoc): Anthropic.Beta.BetaContentBlockParam {
  if (d.mediaType === "application/pdf") {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: d.data.toString("base64") },
      title: `${ROLE_LABEL[d.role]} — ${d.name}`,
    };
  }
  if (/^image\/(png|jpeg|gif|webp)$/.test(d.mediaType)) {
    return {
      type: "image",
      source: {
        type: "base64",
        media_type: d.mediaType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
        data: d.data.toString("base64"),
      },
    };
  }
  return { type: "text", text: `<document role="${d.role}" name="${d.name}">\n${d.data.toString("utf8")}\n</document>` };
}

export class AuditError extends Error {
  constructor(message: string, readonly status = 500) {
    super(message);
  }
}

export async function extractAndAudit(docs: UploadedDoc[], notes?: string): Promise<Extraction> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const d of docs) {
    content.push({ type: "text", text: `The next attachment is the ${ROLE_LABEL[d.role]} (${d.name}).` });
    content.push(docBlock(d));
  }
  content.push({
    type: "text",
    text: `Audit these documents and return the structured result.${notes ? `\n\nNotes from the patient: ${notes}` : ""}`,
  });

  const stream = client().beta.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    ...FALLBACK,
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: betaZodOutputFormat(WireExtraction) },
    system: AUDIT_SYSTEM,
    messages: [{ role: "user", content }],
  });
  const msg = await stream.finalMessage();

  if (msg.stop_reason === "refusal") throw new AuditError("The model declined to process these documents.", 422);
  if (msg.stop_reason === "max_tokens") throw new AuditError("The bill is too long to audit in one pass. Try splitting it.", 413);

  const text = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  const parsed = Extraction.safeParse(JSON.parse(text));
  if (!parsed.success) throw new AuditError("Couldn't read a valid audit from the model response.", 502);
  return parsed.data;
}

const LETTER_SYSTEM = `You draft formal, firm, courteous dispute letters for patients in India who were overcharged by a hospital or under-paid by a health insurer.

Rules:
- Plain text only, no markdown symbols. Use a standard letter layout: sender block with placeholders in [square brackets] for anything unknown, date, recipient, subject line with policy/claim/bill numbers, body, enclosures, signature.
- Address it to the recipient requested. For an insurer, address the Grievance Redressal Officer and mention that if unresolved within 15 days the patient may approach the Insurance Ombudsman / IRDAI Bima Bharosa portal. For a hospital, address the Billing / Patient Relations department.
- Number each disputed point. For each: what was charged or deducted, why it is wrong (cite the evidence and policy clause or regulation given), the exact amount, and the exact remedy requested.
- End with the total amount requested and a clear deadline for response.
- Only use facts in the audit data. Never invent clause numbers, amounts, or dates.
- Write the entire letter in the language given in the data's "language" field, in a formal register. Keep names, numbers, amounts, dates, policy clause numbers and the acronyms IRDAI and Bima Bharosa as written; render "Insurance Ombudsman" in the target language with the English term in brackets the first time. The "plain text only" rule still applies.`;

export function letterStream(audit: AuditResult, recipient: "insurer" | "hospital", findingIds: string[], sender?: string, lang: Lang = "en") {
  const picked = audit.findings.filter((f) => findingIds.includes(f.id));
  const x = audit.extraction;
  const payload = {
    recipient,
    language: LANGS.find((l) => l.id === lang)!.name,
    sender: sender || null,
    currency: x.currency,
    patient: x.patient,
    hospital: x.hospital,
    insurer: x.settlement.insurer,
    claimed: x.settlement.claimedAmount,
    approved: x.settlement.approvedAmount,
    findings: picked.map(({ title, explanation, evidence, policyClause, disputedAmount, action, lineIds, deductionIds }) => ({
      title, explanation, evidence, policyClause, disputedAmount, action, lineIds, deductionIds,
    })),
    totalRequested: picked.reduce((s, f) => s + f.disputedAmount, 0),
    today: new Date().toISOString().slice(0, 10),
  };
  return client().beta.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system: LETTER_SYSTEM,
    messages: [{ role: "user", content: `Draft the dispute letter from this audit data:\n\n${JSON.stringify(payload, null, 2)}` }],
  });
}
