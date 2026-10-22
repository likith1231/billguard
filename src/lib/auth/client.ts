"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type AuthUser = { id: string; email: string; name: string };
export type Usage = Record<"audit" | "letter", { used: number; limit: number }>;
export type Me = { loading: boolean; configured: boolean; user: AuthUser | null; usage: Usage | null };

// One shared copy of "who am I", so the nav, the uploader and the account page never disagree.
let state: Me = { loading: true, configured: true, user: null, usage: null };
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

// The last audit report is kept in this tab's sessionStorage. On a shared computer it must not outlive the session.
function forgetLocalReport() {
  try {
    sessionStorage.removeItem("billguard:last-audit");
  } catch {}
}
const set = (next: Partial<Me>) => {
  state = { ...state, ...next };
  emit();
};

export function refreshMe(): Promise<void> {
  inflight ??= fetch("/api/auth/me", { cache: "no-store" })
    .then((r) => r.json())
    .then((b: { configured?: boolean; user?: AuthUser | null; usage?: Usage }) =>
      set({ loading: false, configured: b.configured !== false, user: b.user ?? null, usage: b.usage ?? null }),
    )
    .catch(() => set({ loading: false }))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useAuth() {
  const me = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => state,
    () => state,
  );
  useEffect(() => {
    if (state.loading) void refreshMe();
  }, []);
  const signOut = useCallback(async (everywhere = false) => {
    await fetch(`/api/auth/logout${everywhere ? "?all=1" : ""}`, { method: "POST" }).catch(() => {});
    forgetLocalReport();
    set({ user: null, usage: null });
  }, []);
  return { ...me, refresh: refreshMe, signOut };
}

/** Call after a successful sign-in, sign-up or password change so the rest of the page updates at once. */
export function setUser(user: AuthUser | null) {
  if (!user) forgetLocalReport();
  set({ loading: false, user, usage: null });
  if (user) void refreshMe();
}

/** Only follow same-site relative redirects (?next=/audit); never an absolute URL someone put in a link. */
export function safeNext(next: string | null | undefined, fallback = "/audit"): string {
  return next && /^\/(?!\/)/.test(next) && !next.includes("\\") ? next : fallback;
}

export async function postJson<T = unknown>(url: string, body: unknown, method = "POST"): Promise<{ ok: boolean; status: number; data: T & { error?: string; field?: string; code?: string } }> {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
