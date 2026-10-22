import { dbConfigured } from "@/lib/auth/db";
import { currentUser } from "@/lib/auth/guard";
import { fail, json, sameOrigin } from "@/lib/auth/http";
import { clearedCookie } from "@/lib/auth/session";
import { revokeSessions } from "@/lib/auth/users";

/** POST /api/auth/logout signs out this browser; POST /api/auth/logout?all=1 signs out every device. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "Request blocked: it did not come from this site.", "bad_origin");
  if (new URL(req.url).searchParams.get("all") === "1" && dbConfigured()) {
    const user = await currentUser(req);
    if (user) await revokeSessions(user.id);
  }
  return json({ ok: true }, 200, { "Set-Cookie": clearedCookie() });
}
