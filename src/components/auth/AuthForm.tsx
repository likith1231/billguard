"use client";

import { ArrowRight, Eye, EyeOff, Loader2, Lock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { postJson, safeNext, setUser, useAuth, type AuthUser } from "@/lib/auth/client";

const input =
  "w-full rounded-xl border border-line bg-white/[0.03] px-3.5 py-3 text-sm outline-none transition placeholder:text-muted focus:border-mint/50 focus:bg-white/[0.05] [color-scheme:dark]";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const { configured } = useAuth();
  const signup = mode === "signup";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await postJson<{ user: AuthUser }>(signup ? "/api/auth/signup" : "/api/auth/login", signup ? { name, email, password } : { email, password });
    if (res.ok) {
      setUser(res.data.user);
      router.push(next);
      return;
    }
    setError({ message: res.data.error ?? "Something went wrong. Try again.", field: res.data.field });
    setBusy(false);
  }

  const other = `${signup ? "/login" : "/signup"}${next !== "/audit" ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-6xl items-center px-4 pt-28 pb-16">
      <div className="mx-auto w-full max-w-md">
        <div className="glass-strong rounded-3xl p-7 md:p-9">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-mint/15 glow-ring">
            <Lock className="h-5 w-5 text-mint" />
          </div>
          <h1 className="font-display mt-5 text-3xl font-semibold tracking-tight">{signup ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-2 text-sm text-ink-2">
            {signup
              ? "An account unlocks the AI audit and AI-written letters. The sample case and the free manual mode never need one."
              : "Sign in to run AI audits and get AI-written dispute letters."}
          </p>

          {!configured && (
            <p role="alert" className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
              Accounts aren&apos;t set up on this server yet. The sample case and the free manual mode still work.
            </p>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {signup && (
              <label className="block text-sm">
                <span className="mb-1.5 block text-ink-2">Name <span className="text-muted">(optional)</span></span>
                <input className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} placeholder="Ananya Rao" />
              </label>
            )}
            <label className="block text-sm">
              <span className="mb-1.5 block text-ink-2">Email</span>
              <input
                className={`${input} ${error?.field === "email" ? "border-red-400/60" : ""}`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
                required
                placeholder="you@example.com"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 flex items-center justify-between text-ink-2">
                Password
                <button type="button" onClick={() => setShow((s) => !s)} className="inline-flex items-center gap-1 text-xs text-muted transition hover:text-ink" aria-label={show ? "Hide password" : "Show password"}>
                  {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {show ? "Hide" : "Show"}
                </button>
              </span>
              <input
                className={`${input} ${error?.field === "password" ? "border-red-400/60" : ""}`}
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={signup ? "new-password" : "current-password"}
                required
                minLength={signup ? 10 : undefined}
                placeholder={signup ? "At least 10 characters" : "Your password"}
              />
              {signup && <span className="mt-1.5 block text-xs text-muted">Use a few words you&apos;ll remember. Longer is better than clever.</span>}
            </label>

            {error && (
              <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
                {error.message}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || !email || !password}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-mint px-4 py-3 text-sm font-semibold text-black shadow-[0_0_30px_-6px_var(--mint)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {signup ? "Create account" : "Sign in"}
              {!busy && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-2">
            {signup ? "Already have an account? " : "New to BillGuard? "}
            <Link href={other} className="font-medium text-mint hover:underline">
              {signup ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </div>

        <p className="mx-auto mt-5 flex max-w-sm items-start gap-2 text-xs text-muted">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-mint/70" />
          We store only your email, name and a password hash. Your bills, letters and audits are never saved on our servers.
        </p>
      </div>
    </main>
  );
}
