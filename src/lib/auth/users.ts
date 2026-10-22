import { db, ensureSchema } from "./db";

export type User = { id: string; email: string; name: string; tokenVersion: number };
export type UserRow = User & { passwordHash: string };

type Row = { id: string; email: string; name: string; password_hash: string; token_version: number };

const toUser = (r: Row): UserRow => ({ id: r.id, email: r.email, name: r.name, tokenVersion: r.token_version, passwordHash: r.password_hash });

export const publicUser = (u: User) => ({ id: u.id, email: u.email, name: u.name });

export async function createUser(email: string, name: string, passwordHash: string): Promise<UserRow | "exists"> {
  await ensureSchema();
  const rows = await db()<Row[]>`
    insert into users (email, name, password_hash) values (${email}, ${name}, ${passwordHash})
    on conflict (email) do nothing
    returning id, email, name, password_hash, token_version`;
  return rows[0] ? toUser(rows[0]) : "exists";
}

export async function findByEmail(email: string): Promise<UserRow | null> {
  await ensureSchema();
  const rows = await db()<Row[]>`select id, email, name, password_hash, token_version from users where email = ${email}`;
  return rows[0] ? toUser(rows[0]) : null;
}

export async function findById(id: string): Promise<UserRow | null> {
  await ensureSchema();
  // A malformed id (a tampered token cannot get here, but be safe) must not raise a SQL error.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const rows = await db()<Row[]>`select id, email, name, password_hash, token_version from users where id = ${id}`;
  return rows[0] ? toUser(rows[0]) : null;
}

export async function touchLogin(id: string): Promise<void> {
  await db()`update users set last_login_at = now() where id = ${id}`;
}

/** Sets a new password and invalidates every other session; returns the new token version. */
export async function changePassword(id: string, passwordHash: string): Promise<number> {
  const rows = await db()<{ token_version: number }[]>`
    update users set password_hash = ${passwordHash}, token_version = token_version + 1 where id = ${id} returning token_version`;
  return rows[0]?.token_version ?? 0;
}

/** Signs the account out everywhere; returns the new token version. */
export async function revokeSessions(id: string): Promise<number> {
  const rows = await db()<{ token_version: number }[]>`
    update users set token_version = token_version + 1 where id = ${id} returning token_version`;
  return rows[0]?.token_version ?? 0;
}

export async function deleteUser(id: string): Promise<void> {
  await db()`delete from users where id = ${id}`;
}
