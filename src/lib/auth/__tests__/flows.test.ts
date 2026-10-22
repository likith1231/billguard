/**
 * End-to-end tests of the account flows and the AI gate: real route handlers, real Postgres, Claude stubbed.
 * Run with a throwaway database:
 *   TEST_DATABASE_URL=postgres://postgres:devpw@127.0.0.1:55432/billguard npm test
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAudit } from "@/lib/rules";
import { SAMPLE_EXTRACTION } from "@/lib/sample";

const extractAndAudit = vi.fn();
const letterStream = vi.fn();
vi.mock("@/lib/claude", () => ({
  hasCredentials: () => true,
  extractAndAudit: (...a: unknown[]) => extractAndAudit(...a),
  letterStream: (...a: unknown[]) => letterStream(...a),
  AuditError: class AuditError extends Error {
    status: number;
    constructor(message: string, status = 500) {
      super(message);
      this.status = status;
    }
  },
}));

const URL_ = process.env.TEST_DATABASE_URL;

describe.skipIf(!URL_)("accounts and the AI gate (needs TEST_DATABASE_URL)", () => {
  let db: typeof import("../db");
  let signup: typeof import("@/app/api/auth/signup/route");
  let login: typeof import("@/app/api/auth/login/route");
  let logout: typeof import("@/app/api/auth/logout/route");
  let me: typeof import("@/app/api/auth/me/route");
  let password: typeof import("@/app/api/auth/password/route");
  let account: typeof import("@/app/api/auth/account/route");
  let audit: typeof import("@/app/api/audit/route");
  let letter: typeof import("@/app/api/letter/route");

  const HOST = "billguard.test";
  let ipCounter = 0;

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_;
    process.env.AUTH_SECRET = "s".repeat(48);
    db = await import("../db");
    signup = await import("@/app/api/auth/signup/route");
    login = await import("@/app/api/auth/login/route");
    logout = await import("@/app/api/auth/logout/route");
    me = await import("@/app/api/auth/me/route");
    password = await import("@/app/api/auth/password/route");
    account = await import("@/app/api/auth/account/route");
    audit = await import("@/app/api/audit/route");
    letter = await import("@/app/api/letter/route");
  });

  afterAll(async () => {
    await db.resetDb();
  });

  beforeEach(async () => {
    await db.ensureSchema();
    await db.db()`truncate users, auth_attempts, ai_usage restart identity cascade`;
    delete process.env.AI_AUDIT_DAILY_LIMIT;
    delete process.env.AI_LETTER_DAILY_LIMIT;
    delete process.env.AI_AUDIT_GLOBAL_DAILY_LIMIT;
    extractAndAudit.mockReset().mockResolvedValue(SAMPLE_EXTRACTION);
    letterStream.mockReset();
    ipCounter++;
  });

  const ip = () => `203.0.113.${ipCounter}`;
  const jsonReq = (path: string, method: string, body?: unknown, opts: { cookie?: string; origin?: string; ip?: string } = {}) =>
    new Request(`https://${HOST}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        host: HOST,
        origin: opts.origin ?? `https://${HOST}`,
        "x-forwarded-for": opts.ip ?? ip(),
        ...(opts.cookie ? { cookie: opts.cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const cookieOf = (res: Response) => {
    const set = res.headers.get("set-cookie") ?? "";
    const m = set.match(/^(bg_session)=([^;]*)/);
    return m && m[2] ? `${m[1]}=${m[2]}` : "";
  };

  const EMAIL = "Ananya.Rao@Example.com";
  const PW = "a long passphrase 42";
  async function register(email = EMAIL, pw = PW, opts: { ip?: string } = {}) {
    const res = await signup.POST(jsonReq("/api/auth/signup", "POST", { email, password: pw, name: "Ananya" }, opts));
    return { res, cookie: cookieOf(res) };
  }
  const meOf = async (cookie: string) => (await me.GET(jsonReq("/api/auth/me", "GET", undefined, { cookie }))).json();

  function auditReq(cookie: string | null, files: Record<string, File[]> = { bill: [new File(["Room 8000"], "bill.txt", { type: "text/plain" })] }, headers: Record<string, string> = {}) {
    const fd = new FormData();
    for (const [role, list] of Object.entries(files)) list.forEach((f) => fd.append(role, f));
    return new Request(`https://${HOST}/api/audit`, { method: "POST", body: fd, headers: { ...(cookie ? { cookie } : {}), ...headers } });
  }

  describe("sign-up and sign-in", () => {
    it("creates an account, sets a session cookie and reports it via /me", async () => {
      const { res, cookie } = await register();
      expect(res.status).toBe(201);
      expect(res.headers.get("set-cookie")).toMatch(/HttpOnly/);
      expect(cookie).not.toBe("");
      const body = await meOf(cookie);
      expect(body.user).toMatchObject({ email: "ananya.rao@example.com", name: "Ananya" });
      expect(body.usage.audit).toEqual({ used: 0, limit: 10 });
    });

    it("never stores the password in clear text", async () => {
      await register();
      const [row] = await db.db()<{ password_hash: string }[]>`select password_hash from users`;
      expect(row.password_hash.startsWith("$argon2id$")).toBe(true);
      expect(row.password_hash).not.toContain(PW);
    });

    it("rejects a duplicate email (case-insensitively), a weak password, a bad email and a foreign origin", async () => {
      await register();
      expect((await register("ananya.rao@EXAMPLE.com")).res.status).toBe(409);
      expect((await register("new@example.com", "short")).res.status).toBe(400);
      expect((await register("not-an-email")).res.status).toBe(400);
      const foreign = await signup.POST(jsonReq("/api/auth/signup", "POST", { email: "x@example.com", password: PW }, { origin: "https://evil.test" }));
      expect(foreign.status).toBe(403);
    });

    it("signs in with the right password and gives the same answer for a wrong password and an unknown email", async () => {
      await register();
      const ok = await login.POST(jsonReq("/api/auth/login", "POST", { email: EMAIL, password: PW }));
      expect(ok.status).toBe(200);
      expect(cookieOf(ok)).not.toBe("");

      const wrong = await login.POST(jsonReq("/api/auth/login", "POST", { email: EMAIL, password: "not the password" }));
      const unknown = await login.POST(jsonReq("/api/auth/login", "POST", { email: "nobody@example.com", password: "not the password" }));
      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(await wrong.json()).toEqual(await unknown.json());
    });

    it("locks an account for a while after 5 failed attempts, even for the right password", async () => {
      await register();
      for (let i = 0; i < 5; i++) {
        expect((await login.POST(jsonReq("/api/auth/login", "POST", { email: EMAIL, password: "wrong password!" }))).status).toBe(401);
      }
      const locked = await login.POST(jsonReq("/api/auth/login", "POST", { email: EMAIL, password: PW }));
      expect(locked.status).toBe(429);
      expect(Number(locked.headers.get("retry-after"))).toBeGreaterThan(0);
    });

    it("limits sign-ups per network address", async () => {
      for (let i = 0; i < 10; i++) expect((await register(`u${i}@example.com`, PW, { ip: "198.51.100.7" })).res.status).toBe(201);
      expect((await register("u11@example.com", PW, { ip: "198.51.100.7" })).res.status).toBe(429);
      expect((await register("u12@example.com", PW, { ip: "198.51.100.8" })).res.status).toBe(201);
    });
  });

  describe("session lifecycle", () => {
    it("logout clears the cookie", async () => {
      const { cookie } = await register();
      const res = await logout.POST(jsonReq("/api/auth/logout", "POST", undefined, { cookie }));
      expect(res.headers.get("set-cookie")).toMatch(/Max-Age=0/);
    });

    it("changing the password signs out other devices and keeps this one", async () => {
      const { cookie: first } = await register();
      const second = cookieOf(await login.POST(jsonReq("/api/auth/login", "POST", { email: EMAIL, password: PW })));

      const bad = await password.POST(jsonReq("/api/auth/password", "POST", { current: "wrong current pw", next: "a brand new passphrase 9" }, { cookie: first }));
      expect(bad.status).toBe(400);
      const weak = await password.POST(jsonReq("/api/auth/password", "POST", { current: PW, next: "short" }, { cookie: first }));
      expect(weak.status).toBe(400);

      const res = await password.POST(jsonReq("/api/auth/password", "POST", { current: PW, next: "a brand new passphrase 9" }, { cookie: first }));
      expect(res.status).toBe(200);
      const fresh = cookieOf(res);

      expect((await meOf(second)).user).toBeNull();
      expect((await meOf(first)).user).toBeNull();
      expect((await meOf(fresh)).user).not.toBeNull();
      expect((await login.POST(jsonReq("/api/auth/login", "POST", { email: EMAIL, password: PW }))).status).toBe(401);
      expect((await login.POST(jsonReq("/api/auth/login", "POST", { email: EMAIL, password: "a brand new passphrase 9" }))).status).toBe(200);
    });

    it("'sign out everywhere' retires every existing session", async () => {
      const { cookie } = await register();
      const other = cookieOf(await login.POST(jsonReq("/api/auth/login", "POST", { email: EMAIL, password: PW })));
      await logout.POST(jsonReq("/api/auth/logout?all=1", "POST", undefined, { cookie }));
      expect((await meOf(cookie)).user).toBeNull();
      expect((await meOf(other)).user).toBeNull();
    });

    it("deleting the account needs the password and removes everything", async () => {
      const { cookie } = await register();
      expect((await account.DELETE(jsonReq("/api/auth/account", "DELETE", { password: "not my password" }, { cookie }))).status).toBe(400);
      const ok = await account.DELETE(jsonReq("/api/auth/account", "DELETE", { password: PW }, { cookie }));
      expect(ok.status).toBe(200);
      expect((await meOf(cookie)).user).toBeNull();
      const [{ n }] = await db.db()<{ n: string }[]>`select count(*)::text as n from users`;
      expect(n).toBe("0");
      expect((await login.POST(jsonReq("/api/auth/login", "POST", { email: EMAIL, password: PW }))).status).toBe(401);
    });

    it("ignores a garbage or forged cookie", async () => {
      expect((await meOf("bg_session=not.a.jwt")).user).toBeNull();
    });
  });

  describe("/api/audit gate", () => {
    it("lets the sample case through without an account", async () => {
      const fd = new FormData();
      fd.set("demo", "1");
      const res = await audit.POST(new Request(`https://${HOST}/api/audit`, { method: "POST", body: fd }));
      expect(res.status).toBe(200);
      expect((await res.json()).mode).toBe("demo");
      expect(extractAndAudit).not.toHaveBeenCalled();
    });

    it("refuses an AI audit without an account, and never calls Claude", async () => {
      const res = await audit.POST(auditReq(null));
      expect(res.status).toBe(401);
      expect((await res.json()).code).toBe("auth_required");
      expect(extractAndAudit).not.toHaveBeenCalled();
    });

    it("refuses a big upload before even reading it when nobody is signed in", async () => {
      const res = await audit.POST(auditReq(null, undefined, { "content-length": String(5 * 1024 * 1024) }));
      expect(res.status).toBe(401);
    });

    it("runs the audit for a signed-in user and counts it", async () => {
      const { cookie } = await register();
      const res = await audit.POST(auditReq(cookie));
      expect(res.status).toBe(200);
      expect((await res.json()).mode).toBe("live");
      expect(extractAndAudit).toHaveBeenCalledTimes(1);
      expect((await meOf(cookie)).usage.audit.used).toBe(1);
    });

    it("does not charge the quota for a request that is invalid anyway", async () => {
      const { cookie } = await register();
      expect((await audit.POST(auditReq(cookie, { insurer_letter: [new File(["x"], "l.txt", { type: "text/plain" })] }))).status).toBe(400);
      expect((await audit.POST(auditReq(cookie, { bill: [new File(["x"], "b.exe", { type: "application/x-msdownload" })] }))).status).toBe(415);
      expect((await meOf(cookie)).usage.audit.used).toBe(0);
    });

    it("stops at the daily limit with a clear message", async () => {
      process.env.AI_AUDIT_DAILY_LIMIT = "2";
      const { cookie } = await register();
      expect((await audit.POST(auditReq(cookie))).status).toBe(200);
      expect((await audit.POST(auditReq(cookie))).status).toBe(200);
      const third = await audit.POST(auditReq(cookie));
      expect(third.status).toBe(429);
      const body = await third.json();
      expect(body.code).toBe("quota");
      expect(body.error).toMatch(/2 AI audits for today/);
      expect(extractAndAudit).toHaveBeenCalledTimes(2);
    });

    it("cannot be raced past the limit by parallel requests", async () => {
      process.env.AI_AUDIT_DAILY_LIMIT = "3";
      const { cookie } = await register();
      const results = await Promise.all(Array.from({ length: 8 }, () => audit.POST(auditReq(cookie))));
      expect(results.filter((r) => r.status === 200)).toHaveLength(3);
      expect(results.filter((r) => r.status === 429)).toHaveLength(5);
    });

    it("applies a ceiling across all accounts", async () => {
      process.env.AI_AUDIT_GLOBAL_DAILY_LIMIT = "2";
      const a = (await register("a@example.com")).cookie;
      const b = (await register("b@example.com")).cookie;
      const c = (await register("c@example.com")).cookie;
      expect((await audit.POST(auditReq(a))).status).toBe(200);
      expect((await audit.POST(auditReq(b))).status).toBe(200);
      const res = await audit.POST(auditReq(c));
      expect(res.status).toBe(429);
      expect((await res.json()).error).toMatch(/capacity for everyone/);
    });

    it("gives the audit back when the AI service itself fails", async () => {
      const { AuditError } = await import("@/lib/claude");
      extractAndAudit.mockRejectedValueOnce(new AuditError("Couldn't read a valid audit from the model response.", 502));
      const { cookie } = await register();
      expect((await audit.POST(auditReq(cookie))).status).toBe(502);
      expect((await meOf(cookie)).usage.audit.used).toBe(0);
    });
  });

  describe("/api/letter gate", () => {
    const liveAudit = () => buildAudit(SAMPLE_EXTRACTION, "live");
    const firstId = () => liveAudit().findings[0].id;
    const letterReq = (audit: unknown, cookie?: string) => jsonReq("/api/letter", "POST", { audit, recipient: "hospital", findingIds: [firstId()], sender: "A" }, { cookie });
    const fakeStream = (text: string) => {
      const events = [{ type: "content_block_delta", delta: { type: "text_delta", text } }];
      return { abort() {}, async *[Symbol.asyncIterator]() { yield* events; } };
    };

    it("gives anyone the free template letter for a demo or manual audit", async () => {
      const res = await letter.POST(letterReq({ ...liveAudit(), mode: "manual" }));
      expect(res.status).toBe(200);
      expect((await res.text()).length).toBeGreaterThan(100);
      expect(letterStream).not.toHaveBeenCalled();
    });

    it("serves the free template letter, not an error, when nobody is signed in", async () => {
      const res = await letter.POST(letterReq(liveAudit()));
      expect(res.status).toBe(200);
      expect(res.headers.get("x-letter-source")).toBe("template-signin");
      expect((await res.text()).length).toBeGreaterThan(100);
      expect(letterStream).not.toHaveBeenCalled();
    });

    it("streams the Claude letter for a signed-in user and counts it", async () => {
      letterStream.mockReturnValue(fakeStream("Dear Sir/Madam, from Claude"));
      const { cookie } = await register();
      const res = await letter.POST(letterReq(liveAudit(), cookie));
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("Dear Sir/Madam, from Claude");
      expect((await meOf(cookie)).usage.letter.used).toBe(1);
    });

    it("falls back to the free template once the day's AI letters are used up", async () => {
      process.env.AI_LETTER_DAILY_LIMIT = "1";
      letterStream.mockReturnValue(fakeStream("from Claude"));
      const { cookie } = await register();
      await (await letter.POST(letterReq(liveAudit(), cookie))).text();
      const second = await letter.POST(letterReq(liveAudit(), cookie));
      expect(second.status).toBe(200);
      expect(second.headers.get("x-letter-source")).toBe("template-quota");
      expect(letterStream).toHaveBeenCalledTimes(1);
    });
  });
});
