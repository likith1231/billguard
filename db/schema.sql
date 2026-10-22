-- BillGuard accounts schema. The app creates these on first use (src/lib/auth/db.ts); this file is for reference or manual setup.
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
