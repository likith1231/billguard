import { z } from "zod";

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export function fail(status: number, error: string, code?: string, extra: Record<string, unknown> = {}): Response {
  return json({ error, ...(code ? { code } : {}), ...extra }, status);
}

/** The caller's address as seen by the platform proxy (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  const first = fwd?.split(",")[0]?.trim();
  return first || req.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * CSRF defence for cookie-authenticated POSTs, on top of SameSite=Lax: the request must come from this site.
 * Browsers always send Origin on cross-origin POSTs, and Sec-Fetch-Site on same-origin ones.
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  const site = req.headers.get("sec-fetch-site");
  return site === "same-origin" || site === "none";
}

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .email("Enter a valid email address.");

export const nameSchema = z.string().trim().max(80).optional();

export async function readJson<T extends z.ZodType>(req: Request, schema: T): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: Response }> {
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return { ok: false, response: fail(415, "Send JSON.") };
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: fail(400, "That request was not valid JSON.") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, response: fail(400, issue?.message ?? "Check the form and try again.", "invalid", { field: issue?.path[0] }) };
  }
  return { ok: true, data: parsed.data };
}
