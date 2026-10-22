import { z } from "zod";
import { AuthConfigError, dbConfigured } from "@/lib/auth/db";
import { clientIp, emailSchema, fail, json, nameSchema, readJson, sameOrigin } from "@/lib/auth/http";
import { checkSignup, recordSignup } from "@/lib/auth/limits";
import { hashPassword, passwordProblem } from "@/lib/auth/password";
import { sessionCookie, signSession } from "@/lib/auth/session";
import { createUser, publicUser } from "@/lib/auth/users";

const body = z.object({ email: emailSchema, password: z.string().max(1024), name: nameSchema });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "Request blocked: it did not come from this site.", "bad_origin");
  if (!dbConfigured()) return fail(503, "Accounts aren't set up on this server yet.", "auth_unavailable");

  const parsed = await readJson(req, body);
  if (!parsed.ok) return parsed.response;
  const { email, password, name } = parsed.data;

  const problem = passwordProblem(password, email);
  if (problem) return fail(400, problem, "weak_password", { field: "password" });

  try {
    const ip = clientIp(req);
    const throttle = await checkSignup(ip);
    if (!throttle.allowed) {
      return json({ error: "Too many sign-ups from this network. Try again later.", code: "rate_limited" }, 429, { "Retry-After": String(throttle.retryAfterSec) });
    }
    await recordSignup(ip);

    const user = await createUser(email, name ?? "", await hashPassword(password));
    if (user === "exists") return fail(409, "An account with this email already exists. Sign in instead.", "email_taken", { field: "email" });

    const token = await signSession({ uid: user.id, ver: user.tokenVersion });
    return json({ user: publicUser(user) }, 201, { "Set-Cookie": sessionCookie(token) });
  } catch (e) {
    if (e instanceof AuthConfigError) return fail(503, "Accounts aren't set up on this server yet.", "auth_unavailable");
    console.error("signup failed", e);
    return fail(500, "Could not create the account. Try again in a moment.", "server_error");
  }
}
