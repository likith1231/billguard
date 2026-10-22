"use client";

import { Check, KeyRound, Loader2, LogOut, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { postJson, setUser, useAuth, type AuthUser } from "@/lib/auth/client";

const input =
  "w-full rounded-xl border border-line bg-white/[0.03] px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-mint/50 [color-scheme:dark]";
const button = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

function Card({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="glass rounded-3xl p-6 md:p-7">
      <h2 className="font-display flex items-center gap-2.5 text-lg font-semibold">
        {icon} {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 100;
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-ink-2">{label}</span>
        <span className="font-mono text-xs">
          {used} / {limit}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${pct >= 100 ? "bg-amber-400" : "bg-mint"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AccountPanel() {
  const { loading, configured, user, usage, signOut } = useAuth();
  const router = useRouter();
  // Set when we sign out or delete on purpose, so the redirect below does not race the intended navigation.
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!loading && !user && !leaving) router.replace("/login?next=/account");
  }, [loading, user, router, leaving]);

  if (loading || !user) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-3xl items-center justify-center px-4 pt-28">
        {!configured ? <p className="text-ink-2">Accounts aren&apos;t set up on this server.</p> : <Loader2 className="h-5 w-5 animate-spin text-muted" />}
      </main>
    );
  }

  return (
    <main className="relative mx-auto max-w-3xl px-4 pt-28 pb-20">
      <p className="font-mono text-xs tracking-[0.2em] text-mint uppercase">Account</p>
      <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight">{user.name || "Your account"}</h1>
      <p className="mt-1 text-ink-2">{user.email}</p>

      <div className="mt-8 space-y-5">
        <Card title="AI use today" icon={<Check className="h-5 w-5 text-mint" />}>
          <div className="space-y-4">
            <Meter label="AI audits" used={usage?.audit.used ?? 0} limit={usage?.audit.limit ?? 0} />
            <Meter label="AI-written letters" used={usage?.letter.used ?? 0} limit={usage?.letter.limit ?? 0} />
          </div>
          <p className="mt-4 text-xs text-muted">Resets at midnight UTC. The free manual mode and the template letters have no limit.</p>
          <Link href="/audit" className={`${button} mt-4 bg-mint text-black hover:brightness-110`}>
            Audit a bill
          </Link>
        </Card>

        <ChangePassword email={user.email} />

        <Card title="Sessions" icon={<LogOut className="h-5 w-5 text-mint" />}>
          <p className="text-sm text-ink-2">Signed in on a device you no longer trust? This signs you out of BillGuard everywhere, including here.</p>
          <button
            type="button"
            onClick={async () => {
              setLeaving(true);
              await signOut(true);
              router.push("/login");
            }}
            className={`${button} mt-4 border border-line text-ink-2 hover:border-line-2 hover:text-ink`}
          >
            Sign out everywhere
          </button>
        </Card>

        <DeleteAccount onLeaving={() => setLeaving(true)} />
      </div>
    </main>
  );
}

function ChangePassword({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await postJson<{ user: AuthUser }>("/api/auth/password", { current, next });
    setBusy(false);
    if (res.ok) {
      setUser(res.data.user);
      setCurrent("");
      setNext("");
      setMsg({ ok: true, text: "Password changed. Your other devices were signed out." });
    } else setMsg({ ok: false, text: res.data.error ?? "Could not change the password." });
  }

  return (
    <Card title="Change password" icon={<KeyRound className="h-5 w-5 text-mint" />}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <input type="email" value={email} readOnly hidden autoComplete="username" />
        <input className={input} type="password" placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        <input className={input} type="password" placeholder="New password (at least 10 characters)" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        {msg && (
          <p role="status" className={`rounded-xl border p-3 text-sm ${msg.ok ? "border-mint/30 bg-mint/10 text-mint" : "border-red-400/30 bg-red-400/10 text-red-200"}`}>
            {msg.text}
          </p>
        )}
        <button type="submit" disabled={busy || !current || !next} className={`${button} bg-mint text-black hover:brightness-110`}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Update password
        </button>
      </form>
    </Card>
  );
}

function DeleteAccount({ onLeaving }: { onLeaving: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await postJson("/api/auth/account", { password }, "DELETE");
    if (res.ok) {
      onLeaving();
      setUser(null);
      router.push("/");
      return;
    }
    setError(res.data.error ?? "Could not delete the account.");
    setBusy(false);
  }

  return (
    <Card title="Delete account" icon={<Trash2 className="h-5 w-5 text-red-300" />}>
      <p className="text-sm text-ink-2">Removes your email, name and sign-in details from our database for good. Cases you saved in this browser stay on your device.</p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className={`${button} mt-4 border border-red-400/30 text-red-200 hover:bg-red-400/10`}>
          Delete my account…
        </button>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
          <input className={input} type="password" placeholder="Enter your password to confirm" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" autoFocus />
          {error && (
            <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={busy || !password} className={`${button} bg-red-500 text-white hover:brightness-110`}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Permanently delete
            </button>
            <button type="button" onClick={() => setOpen(false)} className={`${button} border border-line text-ink-2 hover:text-ink`}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}
