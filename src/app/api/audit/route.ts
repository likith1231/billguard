import Anthropic from "@anthropic-ai/sdk";
import { AuditError, extractAndAudit, hasCredentials, type UploadedDoc } from "@/lib/claude";
import { z } from "zod";
import { CITIES, type RateContext } from "@/lib/benchmarks";
import { buildAudit } from "@/lib/rules";
import { SAMPLE_EXTRACTION } from "@/lib/sample";

export const maxDuration = 300;

const MAX_BYTES = 20 * 1024 * 1024;
const ROLES = ["bill", "insurer_letter", "policy"] as const;
const ALLOWED = /^(application\/pdf|image\/(png|jpeg|gif|webp)|text\/plain)$/;

const CustomRates = z.array(z.object({ item: z.string().max(120), high: z.number().positive(), low: z.number().optional(), unit: z.string().max(30).optional(), source: z.string().max(80).optional() })).max(2000);

function ratesFrom(form: FormData): RateContext {
  const city = String(form.get("city") ?? "");
  let custom: RateContext["custom"];
  try {
    const raw = form.get("rates");
    if (raw) custom = CustomRates.parse(JSON.parse(String(raw)));
  } catch {}
  return { city: CITIES.some((c) => c.name === city) ? city : null, custom };
}

export async function POST(req: Request) {
  const form = await req.formData();

  if (form.get("demo") === "1") {
    // Small pause so the scanning animation has time to play.
    await new Promise((r) => setTimeout(r, 2200));
    return Response.json(buildAudit(SAMPLE_EXTRACTION, "demo"));
  }

  if (!hasCredentials()) {
    return Response.json(
      { error: "Reading documents needs an Anthropic API key on the server. Try the sample case, or enter the bill manually for a free rules-only audit." },
      { status: 503 },
    );
  }

  const docs: UploadedDoc[] = [];
  let total = 0;
  for (const role of ROLES) {
    for (const entry of form.getAll(role)) {
      if (!(entry instanceof File) || entry.size === 0) continue;
      const mediaType = entry.type || (entry.name.endsWith(".txt") ? "text/plain" : "");
      if (!ALLOWED.test(mediaType)) {
        return Response.json({ error: `${entry.name}: upload a PDF, image (PNG/JPG/WebP) or .txt file.` }, { status: 415 });
      }
      total += entry.size;
      docs.push({ role, name: entry.name, mediaType, data: Buffer.from(await entry.arrayBuffer()) });
    }
  }
  if (!docs.some((d) => d.role === "bill")) {
    return Response.json({ error: "Add at least the hospital bill." }, { status: 400 });
  }
  if (total > MAX_BYTES) {
    return Response.json({ error: "Files are over 20 MB in total. Compress or split them." }, { status: 413 });
  }

  try {
    const notes = String(form.get("notes") ?? "").slice(0, 2000) || undefined;
    const extraction = await extractAndAudit(docs, notes);
    return Response.json(buildAudit(extraction, "live", ratesFrom(form)));
  } catch (e) {
    if (e instanceof AuditError) return Response.json({ error: e.message }, { status: e.status });
    if (e instanceof Anthropic.RateLimitError) return Response.json({ error: "Rate limited — try again in a minute." }, { status: 429 });
    if (e instanceof Anthropic.AuthenticationError) return Response.json({ error: "The server's Anthropic API key is invalid." }, { status: 500 });
    if (e instanceof Anthropic.BadRequestError && /credit balance/i.test(e.message)) {
      return Response.json({ error: "The AI service is out of credits right now. Try the sample case, or enter the bill manually for a free rules-only audit." }, { status: 402 });
    }
    if (e instanceof Anthropic.BadRequestError) return Response.json({ error: `The AI service rejected the request: ${e.message}` }, { status: 400 });
    if (e instanceof Anthropic.APIError) return Response.json({ error: "The AI service is unavailable right now." }, { status: 502 });
    console.error(e);
    return Response.json({ error: "Something went wrong while auditing." }, { status: 500 });
  }
}
