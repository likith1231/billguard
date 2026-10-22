import { db, ensureSchema } from "./db";

export type AiKind = "audit" | "letter";

const num = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
};

/** Per account, per day (UTC). Each AI audit reads documents with Claude, so these are the cost caps. */
export const userLimit = (kind: AiKind) => (kind === "audit" ? num("AI_AUDIT_DAILY_LIMIT", 10) : num("AI_LETTER_DAILY_LIMIT", 30));
/** Across every account: a ceiling on the day's bill even if someone creates many accounts. */
export const globalLimit = (kind: AiKind) => (kind === "audit" ? num("AI_AUDIT_GLOBAL_DAILY_LIMIT", 200) : num("AI_LETTER_GLOBAL_DAILY_LIMIT", 600));

const WINDOW_MIN = 15;
const LOGIN_PER_EMAIL = 5;
const LOGIN_PER_IP = 20;
const SIGNUP_PER_IP_HOUR = 10;

type Throttle = { allowed: true } | { allowed: false; retryAfterSec: number };

async function failures(kind: string, key: string, minutes: number): Promise<{ n: number; oldest: Date | null }> {
  const rows = await db()<{ n: string; oldest: Date | null }[]>`
    select count(*)::text as n, min(at) as oldest from auth_attempts
    where kind = ${kind} and key = ${key} and ok = false and at > now() - make_interval(mins => ${minutes})`;
  return { n: Number(rows[0]?.n ?? 0), oldest: rows[0]?.oldest ?? null };
}

function wait(oldest: Date | null, minutes: number): number {
  const until = (oldest ? oldest.getTime() : Date.now()) + minutes * 60_000;
  return Math.max(1, Math.ceil((until - Date.now()) / 1000));
}

export async function checkLogin(email: string, ip: string): Promise<Throttle> {
  await ensureSchema();
  const [byEmail, byIp] = await Promise.all([failures("login", email, WINDOW_MIN), failures("login-ip", ip, WINDOW_MIN)]);
  if (byEmail.n >= LOGIN_PER_EMAIL) return { allowed: false, retryAfterSec: wait(byEmail.oldest, WINDOW_MIN) };
  if (byIp.n >= LOGIN_PER_IP) return { allowed: false, retryAfterSec: wait(byIp.oldest, WINDOW_MIN) };
  return { allowed: true };
}

export async function recordLogin(email: string, ip: string, ok: boolean): Promise<void> {
  const sql = db();
  if (ok) {
    // A good sign-in clears that account's failure count; the per-IP counter keeps running.
    await sql`delete from auth_attempts where kind = 'login' and key = ${email}`;
  } else {
    await sql`insert into auth_attempts (kind, key, ok) values ('login', ${email}, false), ('login-ip', ${ip}, false)`;
  }
  if (Math.random() < 0.02) await sql`delete from auth_attempts where at < now() - interval '2 days'`;
}

export async function checkSignup(ip: string): Promise<Throttle> {
  await ensureSchema();
  const f = await failures("signup", ip, 60);
  return f.n >= SIGNUP_PER_IP_HOUR ? { allowed: false, retryAfterSec: wait(f.oldest, 60) } : { allowed: true };
}

export async function recordSignup(ip: string): Promise<void> {
  // Counted whether or not it succeeds: the point is to slow down account farming.
  await db()`insert into auth_attempts (kind, key, ok) values ('signup', ${ip}, false)`;
}

export type Quota = { allowed: true; used: number; limit: number } | { allowed: false; reason: "user" | "global"; used: number; limit: number };

/** Reserve one AI call. Atomic, so parallel requests cannot slip past the limit. */
export async function consumeQuota(userId: string, kind: AiKind): Promise<Quota> {
  await ensureSchema();
  const sql = db();
  const limit = userLimit(kind);
  const cap = globalLimit(kind);

  const [{ total }] = await sql<{ total: string }[]>`select coalesce(sum(count), 0)::text as total from ai_usage where day = (now() at time zone 'utc')::date and kind = ${kind}`;
  if (Number(total) >= cap) return { allowed: false, reason: "global", used: Number(total), limit: cap };

  const rows = await sql<{ count: number }[]>`
    insert into ai_usage (user_id, day, kind, count) values (${userId}, (now() at time zone 'utc')::date, ${kind}, 1)
    on conflict (user_id, day, kind) do update set count = ai_usage.count + 1
    where ai_usage.count < ${limit}
    returning count`;
  if (!rows[0]) return { allowed: false, reason: "user", used: limit, limit };
  return { allowed: true, used: rows[0].count, limit };
}

/** Give the reservation back when the call failed because of us (the AI service), not because of the request. */
export async function refundQuota(userId: string, kind: AiKind): Promise<void> {
  await db()`update ai_usage set count = greatest(count - 1, 0) where user_id = ${userId} and kind = ${kind} and day = (now() at time zone 'utc')::date`;
}

export async function usageToday(userId: string): Promise<Record<AiKind, { used: number; limit: number }>> {
  await ensureSchema();
  const rows = await db()<{ kind: AiKind; count: number }[]>`select kind, count from ai_usage where user_id = ${userId} and day = (now() at time zone 'utc')::date`;
  const used = (k: AiKind) => rows.find((r) => r.kind === k)?.count ?? 0;
  return { audit: { used: used("audit"), limit: userLimit("audit") }, letter: { used: used("letter"), limit: userLimit("letter") } };
}
