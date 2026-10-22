import { hash, verify } from "@node-rs/argon2";

// Argon2id at the OWASP minimum profile (19 MiB, 2 passes, 1 lane): strong, and light enough for serverless.
const OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const MIN_PASSWORD = 10;
export const MAX_PASSWORD = 128;

const COMMON = new Set([
  "password", "password1", "password12", "password123", "passw0rd123", "qwertyuiop", "qwerty12345",
  "1234567890", "12345678910", "0123456789", "123456789a", "iloveyou123", "welcome123", "admin12345",
  "letmein1234", "abc1234567", "billguard123", "hospital123", "changeme123", "0987654321",
]);

/** Returns a message if the password is not acceptable, otherwise null. */
export function passwordProblem(password: string, email = ""): string | null {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (password.length > MAX_PASSWORD) return `Use at most ${MAX_PASSWORD} characters.`;
  const lower = password.toLowerCase();
  if (COMMON.has(lower)) return "That password is too common. Pick something less guessable.";
  if (new Set(password).size < 4) return "Use a mix of different characters.";
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  if (local.length >= 4 && lower.includes(local)) return "Don't include your email address in the password.";
  return null;
}

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTS);
}

export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  try {
    return await verify(stored, password);
  } catch {
    return false;
  }
}

let dummy: Promise<string> | null = null;

/** Spend the same time as a real check, so a missing account is not distinguishable from a wrong password. */
export async function burnVerify(password: string): Promise<void> {
  dummy ??= hashPassword("not-a-real-account-password");
  await verifyPassword(await dummy, password);
}
