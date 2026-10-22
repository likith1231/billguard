import { z } from "zod";
import { requireUser } from "@/lib/auth/guard";
import { clientIp, fail, json, readJson, sameOrigin } from "@/lib/auth/http";
import { checkLogin, recordLogin } from "@/lib/auth/limits";
import { verifyPassword } from "@/lib/auth/password";
import { clearedCookie } from "@/lib/auth/session";
import { deleteUser, findById } from "@/lib/auth/users";

const body = z.object({ password: z.string().min(1, "Enter your password to confirm.").max(1024) });

/** Delete the account and everything stored about it (email, name, password hash, usage counters). */
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return fail(403, "Request blocked: it did not come from this site.", "bad_origin");
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  if (auth.dev) return fail(503, "Accounts aren't set up on this server.", "auth_unavailable");

  const parsed = await readJson(req, body);
  if (!parsed.ok) return parsed.response;

  const ip = clientIp(req);
  const throttle = await checkLogin(auth.user.email, ip);
  if (!throttle.allowed) return json({ error: "Too many failed attempts. Try again later.", code: "rate_limited" }, 429, { "Retry-After": String(throttle.retryAfterSec) });

  const row = await findById(auth.user.id);
  if (!row || !(await verifyPassword(row.passwordHash, parsed.data.password))) {
    await recordLogin(auth.user.email, ip, false);
    return fail(400, "That password is not correct.", "bad_credentials", { field: "password" });
  }
  await deleteUser(auth.user.id);
  return json({ ok: true }, 200, { "Set-Cookie": clearedCookie() });
}
