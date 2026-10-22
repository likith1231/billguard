import { dbConfigured } from "@/lib/auth/db";
import { currentUser } from "@/lib/auth/guard";
import { json } from "@/lib/auth/http";
import { usageToday } from "@/lib/auth/limits";
import { publicUser } from "@/lib/auth/users";

/** Who is signed in, and how much AI they have used today. `configured: false` means this server has no accounts. */
export async function GET(req: Request) {
  // Touch the request first. A GET handler that never reads it is prerendered at build time (when no database is
  // configured), which would freeze "accounts are off" into the deployed site. Reading headers makes it dynamic.
  req.headers.get("cookie");
  if (!dbConfigured()) return json({ configured: false, user: null });
  try {
    const user = await currentUser(req);
    if (!user) return json({ configured: true, user: null });
    return json({ configured: true, user: publicUser(user), usage: await usageToday(user.id) });
  } catch (e) {
    console.error("me failed", e);
    return json({ configured: true, user: null, error: "unavailable" }, 503);
  }
}
