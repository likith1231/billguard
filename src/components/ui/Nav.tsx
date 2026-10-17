import Link from "next/link";
import Logo from "./Logo";

export default function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <nav className="glass mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo className="h-7 w-7" />
          <span className="font-display text-lg font-semibold tracking-tight">BillGuard</span>
        </Link>
        <div className="hidden items-center gap-7 text-sm text-ink-2 md:flex">
          <Link href="/#how" className="transition hover:text-ink">How it works</Link>
          <Link href="/#checks" className="transition hover:text-ink">What we catch</Link>
          <Link href="/#evidence" className="transition hover:text-ink">Evidence</Link>
          <Link href="/#privacy" className="transition hover:text-ink">Privacy</Link>
        </div>
        <Link
          href="/audit"
          className="rounded-xl bg-mint px-4 py-2 text-sm font-semibold text-black shadow-[0_0_30px_-6px_var(--mint)] transition hover:brightness-110"
        >
          Audit a bill
        </Link>
      </nav>
    </header>
  );
}
