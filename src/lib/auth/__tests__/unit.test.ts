import { describe, expect, it, beforeAll } from "vitest";
import { hashPassword, passwordProblem, verifyPassword } from "../password";
import { clearedCookie, readCookie, sessionCookie, signSession, verifySession } from "../session";
import { sameOrigin, clientIp } from "../http";

beforeAll(() => {
  process.env.AUTH_SECRET = "x".repeat(40);
});

describe("passwordProblem", () => {
  it("accepts a reasonable passphrase", () => {
    expect(passwordProblem("correct horse battery", "a@b.co")).toBeNull();
  });
  it.each([
    ["short", "Use at least 10"],
    ["password123", "too common"],
    ["aaaaaaaaaaaa", "mix of different"],
    ["ananya.rao-2026", "email"],
  ])("rejects %s", (pw, msg) => {
    expect(passwordProblem(pw, "ananya.rao@example.com")).toContain(msg);
  });
  it("rejects very long input", () => {
    expect(passwordProblem("a1".repeat(80))).toContain("at most");
  });
});

describe("password hashing", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const h = await hashPassword("a long enough password");
    expect(h.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(h, "a long enough password")).toBe(true);
    expect(await verifyPassword(h, "a long enough passworD")).toBe(false);
  });
  it("never throws on a malformed stored hash", async () => {
    expect(await verifyPassword("not-a-hash", "whatever")).toBe(false);
  });
  it("salts: the same password hashes differently", async () => {
    expect(await hashPassword("same password here")).not.toBe(await hashPassword("same password here"));
  });
});

describe("session tokens", () => {
  it("round-trips the claims", async () => {
    const t = await signSession({ uid: "abc", ver: 3 });
    expect(await verifySession(t)).toEqual({ uid: "abc", ver: 3 });
  });
  it("rejects a tampered token", async () => {
    const t = await signSession({ uid: "abc", ver: 0 });
    const [h, p, s] = t.split(".");
    const forged = `${h}.${Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p, "base64url").toString()), sub: "someone-else" })).toString("base64url")}.${s}`;
    expect(await verifySession(forged)).toBeNull();
  });
  it("rejects a token signed with another secret", async () => {
    const t = await signSession({ uid: "abc", ver: 0 });
    process.env.AUTH_SECRET = "y".repeat(40);
    expect(await verifySession(t)).toBeNull();
    process.env.AUTH_SECRET = "x".repeat(40);
  });
  it("rejects garbage", async () => {
    expect(await verifySession("")).toBeNull();
    expect(await verifySession("a.b.c")).toBeNull();
  });
});

describe("cookies", () => {
  it("reads a named cookie among others", () => {
    const req = new Request("https://x.test", { headers: { cookie: "a=1; bg_session=tok%3D; b=2" } });
    expect(readCookie(req, "bg_session")).toBe("tok=");
    expect(readCookie(req, "missing")).toBeNull();
  });
  it("sets HttpOnly + SameSite and clears with Max-Age=0", () => {
    expect(sessionCookie("t")).toMatch(/HttpOnly; SameSite=Lax; Max-Age=604800/);
    expect(clearedCookie()).toMatch(/Max-Age=0/);
  });
});

describe("sameOrigin", () => {
  const mk = (h: Record<string, string>) => new Request("https://billguard.test/api/auth/login", { method: "POST", headers: h });
  it("accepts the same host and rejects another site", () => {
    expect(sameOrigin(mk({ origin: "https://billguard.test", host: "billguard.test" }))).toBe(true);
    expect(sameOrigin(mk({ origin: "https://evil.test", host: "billguard.test" }))).toBe(false);
  });
  it("falls back to Sec-Fetch-Site, and refuses a request that says nothing", () => {
    expect(sameOrigin(mk({ "sec-fetch-site": "same-origin", host: "billguard.test" }))).toBe(true);
    expect(sameOrigin(mk({ "sec-fetch-site": "cross-site", host: "billguard.test" }))).toBe(false);
    expect(sameOrigin(mk({ host: "billguard.test" }))).toBe(false);
  });
  it("prefers the forwarded host behind a proxy", () => {
    expect(sameOrigin(mk({ origin: "https://billguard.test", "x-forwarded-host": "billguard.test", host: "internal:3000" }))).toBe(true);
  });
});

describe("clientIp", () => {
  it("takes the first forwarded address", () => {
    expect(clientIp(new Request("https://x.test", { headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" } }))).toBe("203.0.113.9");
    expect(clientIp(new Request("https://x.test"))).toBe("unknown");
  });
});
