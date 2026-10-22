import { jwtVerify, SignJWT } from "jose";
import { randomBytes } from "node:crypto";

const ISSUER = "billguard";
const AUDIENCE = "billguard-web";
export const SESSION_DAYS = 7;
const SESSION_SECONDS = SESSION_DAYS * 24 * 60 * 60;

const prod = () => process.env.NODE_ENV === "production";

// `__Host-` pins the cookie to this exact host: Secure, Path=/, no Domain attribute.
export const cookieName = () => (prod() ? "__Host-bg_session" : "bg_session");

let devSecret: Uint8Array | null = null;

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return new TextEncoder().encode(s);
  if (prod()) throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters");
  // Development only: a per-process secret, so sessions simply reset when the dev server restarts.
  devSecret ??= randomBytes(32);
  return devSecret;
}

export type SessionClaims = { uid: string; ver: number };

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ ver: claims.ver })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.uid)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER, audience: AUDIENCE, algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.ver !== "number") return null;
    return { uid: payload.sub, ver: payload.ver };
  } catch {
    return null;
  }
}

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

export function sessionCookie(token: string): string {
  return `${cookieName()}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}${prod() ? "; Secure" : ""}`;
}

export function clearedCookie(): string {
  return `${cookieName()}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${prod() ? "; Secure" : ""}`;
}
