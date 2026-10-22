import postgres from "postgres";

/**
 * Postgres for accounts only. Audits, bills and letters are never stored: the tables below hold an
 * email, a display name, a password hash, throttling counters and a per-day AI usage count.
 */
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  name          text NOT NULL DEFAULT '',
  password_hash text NOT NULL,
  token_version integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (email);

CREATE TABLE IF NOT EXISTS auth_attempts (
  id   bigserial PRIMARY KEY,
  kind text NOT NULL,
  key  text NOT NULL,
  ok   boolean NOT NULL DEFAULT false,
  at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_attempts_lookup ON auth_attempts (kind, key, at);

CREATE TABLE IF NOT EXISTS ai_usage (
  user_id uuid    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day     date    NOT NULL,
  kind    text    NOT NULL,
  count   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day, kind)
);
`;

export class AuthConfigError extends Error {}

let client: postgres.Sql | null = null;
let ready: Promise<void> | null = null;

export function dbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function db(): postgres.Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new AuthConfigError("DATABASE_URL is not set");
  if (!client) {
    const local = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
    client = postgres(url, {
      ssl: local ? false : "require",
      max: 3,
      idle_timeout: 20,
      connect_timeout: 10,
      // Neon's pooled connection string (PgBouncer, transaction mode) does not support prepared statements.
      prepare: false,
      // "already exists, skipping" notices from CREATE ... IF NOT EXISTS are expected; keep them out of the logs.
      onnotice: () => {},
    });
  }
  return client;
}

/** Creates the tables on first use. Safe to call on every request and from concurrent serverless instances. */
export function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = db()
      .begin(async (tx) => {
        await tx`select pg_advisory_xact_lock(727001)`;
        await tx.unsafe(SCHEMA);
      })
      .then(() => undefined)
      .catch((e) => {
        ready = null;
        throw e;
      });
  }
  return ready;
}

/** For tests: forget the cached client so a different DATABASE_URL can be used. */
export async function resetDb(): Promise<void> {
  const c = client;
  client = null;
  ready = null;
  if (c) await c.end({ timeout: 2 });
}
