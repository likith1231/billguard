"use client";

import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/client";

/** Sign in / account control for the nav. Reads sign-in state in the browser so every page can stay static. */
export default function AccountMenu() {
  const { loading, configured, user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  // Reserve the space while we find out, so the nav does not jump.
  if (loading) return <div className="h-9 w-20" aria-hidden />;
  if (!configured) return null;

  if (!user) {
    return (
      <Link href="/login" className="rounded-xl border border-line px-3.5 py-2 text-sm text-ink-2 transition hover:border-line-2 hover:text-ink">
        Sign in
      </Link>
    );
  }

  const initial = (user.name || user.email).trim().charAt(0).toUpperCase();
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="grid h-9 w-9 place-items-center rounded-full border border-mint/40 bg-mint/10 text-sm font-semibold text-mint transition hover:bg-mint/20 focus-visible:ring-2 focus-visible:ring-mint focus-visible:outline-none"
      >
        {initial}
      </button>
      {open && (
        <div role="menu" className="glass-strong absolute right-0 mt-2 w-60 rounded-2xl p-2 text-sm shadow-xl">
          <div className="px-3 py-2">
            <div className="truncate font-medium">{user.name || "Your account"}</div>
            <div className="truncate text-xs text-muted">{user.email}</div>
          </div>
          <div className="my-1 h-px bg-line" />
          <Link role="menuitem" href="/account" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-ink-2 transition hover:bg-white/5 hover:text-ink">
            <UserRound className="h-4 w-4" /> Account
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={async () => {
              setOpen(false);
              await signOut();
              router.refresh();
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-ink-2 transition hover:bg-white/5 hover:text-ink"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
