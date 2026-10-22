import { dbConfigured } from "./db";
import { cookieName, clearedCookie, readCookie, verifySession } from "./session";
import { fail } from "./http";
import { findById, type User } from "./users";

export type Authed = { ok: true; user: User; dev: boolean } | { ok: false; response: Response };

/** The signed-in user for this request, or null. Never throws for a bad or expired session. */
export async function currentUser(req: Request): Promise<User | null> {
  if (!dbConfigured()) return null;
  const token = readCookie(req, cookieName());
  if (!token) return null;
  const claims = await verifySession(token);
  if (!claims) return null;
  const user = await findById(claims.uid);
  // Changing the password or "sign out everywhere" bumps token_version, which retires older tokens.
  return user && user.tokenVersion === claims.ver ? user : null;
}

/** Gate for anything that costs money. Accounts are required in production; local development without a database is let through. */
export async function requireUser(req: Request, what = "the AI audit"): Promise<Authed> {
  if (!dbConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      return { ok: true, dev: true, user: { id: "dev", email: "dev@localhost", name: "Developer", tokenVersion: 0 } };
    }
    return {
      ok: false,
      response: fail(503, `Accounts aren't set up on this server yet, so ${what} is switched off. The sample case and the free manual mode still work.`, "auth_unavailable"),
    };
  }
  const user = await currentUser(req);
  if (!user) {
    const res = fail(401, `Sign in to use ${what}. The sample case and the free manual mode need no account.`, "auth_required");
    if (readCookie(req, cookieName())) res.headers.append("Set-Cookie", clearedCookie());
    return { ok: false, response: res };
  }
  return { ok: true, user, dev: false };
}
