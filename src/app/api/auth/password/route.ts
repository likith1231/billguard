import { z } from "zod";
import { requireUser } from "@/lib/auth/guard";
import { clientIp, fail, json, readJson, sameOrigin } from "@/lib/auth/http";
import { checkLogin, recordLogin } from "@/lib/auth/limits";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/auth/password";
import { sessionCookie, signSession } from "@/lib/auth/session";
import { changePassword, findById, publicUser } from "@/lib/auth/users";

const body = z.object({ current: z.string().min(1, "Enter your current password.").max(1024), next: z.string().max(1024) });

/** Change the password. Every other device is signed out; this one gets a fresh session. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "Request blocked: it did not come from this site.", "bad_origin");
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  if (auth.dev) return fail(503, "Accounts aren't set up on this server.", "auth_unavailable");

  const parsed = await readJson(req, body);
  if (!parsed.ok) return parsed.response;
  const { current, next } = parsed.data;

  const ip = clientIp(req);
  const throttle = await checkLogin(auth.user.email, ip);
  if (!throttle.allowed) return json({ error: "Too many failed attempts. Try again later.", code: "rate_limited" }, 429, { "Retry-After": String(throttle.retryAfterSec) });

  const row = await findById(auth.user.id);
  if (!row || !(await verifyPassword(row.passwordHash, current))) {
    await recordLogin(auth.user.email, ip, false);
    return fail(400, "Your current password is not correct.", "bad_credentials", { field: "current" });
  }
  const problem = passwordProblem(next, auth.user.email);
  if (problem) return fail(400, problem, "weak_password", { field: "next" });

  const ver = await changePassword(auth.user.id, await hashPassword(next));
  const token = await signSession({ uid: auth.user.id, ver });
  return json({ user: publicUser(auth.user) }, 200, { "Set-Cookie": sessionCookie(token) });
}
