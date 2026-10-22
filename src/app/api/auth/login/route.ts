import { z } from "zod";
import { AuthConfigError, dbConfigured } from "@/lib/auth/db";
import { clientIp, emailSchema, fail, json, readJson, sameOrigin } from "@/lib/auth/http";
import { checkLogin, recordLogin } from "@/lib/auth/limits";
import { burnVerify, verifyPassword } from "@/lib/auth/password";
import { sessionCookie, signSession } from "@/lib/auth/session";
import { findByEmail, publicUser, touchLogin } from "@/lib/auth/users";

const body = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password.").max(1024) });

const BAD = "Incorrect email or password.";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "Request blocked: it did not come from this site.", "bad_origin");
  if (!dbConfigured()) return fail(503, "Accounts aren't set up on this server yet.", "auth_unavailable");

  const parsed = await readJson(req, body);
  if (!parsed.ok) return parsed.response;
  const { email, password } = parsed.data;

  try {
    const ip = clientIp(req);
    const throttle = await checkLogin(email, ip);
    if (!throttle.allowed) {
      const mins = Math.ceil(throttle.retryAfterSec / 60);
      return json(
        { error: `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`, code: "rate_limited", retryAfterSec: throttle.retryAfterSec },
        429,
        { "Retry-After": String(throttle.retryAfterSec) },
      );
    }

    const user = await findByEmail(email);
    // Same work and same answer whether the account exists or not.
    const ok = user ? await verifyPassword(user.passwordHash, password) : (await burnVerify(password), false);
    await recordLogin(email, ip, ok);
    if (!ok || !user) return fail(401, BAD, "bad_credentials");

    await touchLogin(user.id);
    const token = await signSession({ uid: user.id, ver: user.tokenVersion });
    return json({ user: publicUser(user) }, 200, { "Set-Cookie": sessionCookie(token) });
  } catch (e) {
    if (e instanceof AuthConfigError) return fail(503, "Accounts aren't set up on this server yet.", "auth_unavailable");
    console.error("login failed", e);
    return fail(500, "Could not sign you in. Try again in a moment.", "server_error");
  }
}
