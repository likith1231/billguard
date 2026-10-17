import Link from "next/link";
import {
  ArrowRight,
  BadgeIndianRupee,
  Bed,
  Calculator,
  Copy,
  FileSearch,
  FileText,
  Layers,
  Lock,
  Percent,
  Pill,
  Scale,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Split,
  Upload,
} from "lucide-react";
import Background3D from "@/components/ui/Background3D";
import Counter from "@/components/ui/Counter";
import Logo from "@/components/ui/Logo";
import Nav from "@/components/ui/Nav";
import Reveal from "@/components/ui/Reveal";
import TiltCard from "@/components/ui/TiltCard";

const STEPS = [
  {
    icon: Upload,
    n: "01",
    title: "Upload",
    body: "Drop in the itemised hospital bill and the insurer's settlement letter. Add your policy wording for the sharpest audit. PDF, photo or text.",
  },
  {
    icon: ScanLine,
    n: "02",
    title: "Cross-examine",
    body: "Every line item is extracted, then checked for duplicates, bundling errors, MRP and benchmark outliers. Each deduction is checked against your policy wording.",
  },
  {
    icon: FileText,
    n: "03",
    title: "Dispute",
    body: "You get a ranked list of what to contest, with the evidence quoted, and a dispute letter for the hospital or insurer drafted and ready to send.",
  },
];

const CHECKS = [
  { icon: Copy, title: "Duplicate charges", body: "Same test, same day, billed twice." },
  { icon: Layers, title: "Unbundling", body: "OT, anaesthesia or nursing billed on top of an all-inclusive package." },
  { icon: Scale, title: "Benchmark outliers", body: "Rates far above typical ranges for tests, rooms and drugs." },
  { icon: Pill, title: "Above-MRP pharmacy", body: "Drugs and consumables sold above the printed MRP." },
  { icon: Bed, title: "Billing beyond stay", body: "More bed-days billed than nights you were admitted." },
  { icon: Split, title: "Proportionate cuts", body: "Room-rent cuts applied to ICU, pharmacy and diagnostics, which IRDAI rules exempt." },
  { icon: Percent, title: "Co-pay errors", body: "Co-pay taken at the wrong rate, or where your policy doesn't apply one." },
  { icon: BadgeIndianRupee, title: "Wrongful 'non-payables'", body: "Consumables deducted although your rider covers them." },
  { icon: Calculator, title: "Settlement maths", body: "Gaps between what was claimed, deducted and actually paid." },
];

export default function Home() {
  return (
    <>
      <Background3D mode="hero" trackScroll />
      <Nav />

      <main className="relative z-10">
        {/* HERO */}
        <section className="mx-auto flex min-h-dvh max-w-6xl flex-col justify-center px-4 pt-28 pb-16 md:pt-24">
          <div className="max-w-xl max-md:mt-[34vh]">
            <Reveal>
              <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-ink-2">
                <Sparkles className="h-3.5 w-3.5 text-mint" /> AI audit for hospital bills &amp; insurance claims
              </span>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="font-display mt-6 text-5xl leading-[1.02] font-semibold tracking-tight md:text-7xl">
                Every rupee on your bill, <span className="text-gradient">cross-examined.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-2">
                BillGuard audits hospital bills and insurance claims, flags overcharges and wrongful deductions with evidence,
                and drafts the dispute letter for you.
              </p>
            </Reveal>
            <Reveal delay={0.24}>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href="/audit"
                  className="group inline-flex items-center gap-2 rounded-2xl bg-mint px-6 py-3.5 font-semibold text-black shadow-[0_0_50px_-10px_var(--mint)] transition hover:brightness-110"
                >
                  Audit my bill <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
                <Link href="/audit?sample=1" className="glass inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 font-medium transition hover:border-line-2 hover:bg-white/5">
                  <FileSearch className="h-4 w-4 text-mint" /> Try a sample case
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.32}>
              <dl className="mt-14 grid max-w-md grid-cols-3 gap-6">
                {[
                  { v: 12, s: "", l: "audit checks" },
                  { v: 3, s: "", l: "documents cross-read" },
                  { v: 1, s: "", l: "letter, ready to send" },
                ].map((x) => (
                  <div key={x.l}>
                    <dt className="font-display text-3xl font-semibold">
                      <Counter value={x.v} />
                      {x.s}
                    </dt>
                    <dd className="mt-1 text-xs text-muted">{x.l}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </section>

        {/* MARQUEE */}
        <div className="glass overflow-hidden border-x-0 py-4">
          <div className="marquee flex w-max gap-10 font-mono text-sm whitespace-nowrap text-muted">
            {Array.from({ length: 2 }).flatMap((_, k) =>
              ["DUPLICATE CONSULTATION −₹1,200", "OT CHARGES INSIDE PACKAGE −₹18,000", "CEFTRIAXONE ABOVE MRP −₹162", "CO-PAY NOT IN POLICY +₹11,669", "PROPORTIONATE CUT ON PHARMACY +₹3,600", "EXTRA BED-DAY −₹7,500", "CBC AT 3× RANGE −₹900"].map((t) => (
                <span key={`${k}${t}`} className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-coral shadow-[0_0_10px_var(--coral)]" /> {t}
                </span>
              )),
            )}
          </div>
        </div>

        {/* HOW */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-28">
          <Reveal>
            <p className="font-mono text-xs tracking-[0.3em] text-mint">HOW IT WORKS</p>
            <h2 className="font-display mt-3 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">From a confusing bill to a sent dispute in minutes.</h2>
          </Reveal>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.1}>
                <TiltCard className="glass h-full rounded-3xl p-7">
                  <div className="tilt-pop">
                    <div className="flex items-center justify-between">
                      <div className="glow-ring grid h-12 w-12 place-items-center rounded-2xl bg-mint/10">
                        <s.icon className="h-5 w-5 text-mint" />
                      </div>
                      <span className="font-mono text-sm text-muted">{s.n}</span>
                    </div>
                    <h3 className="font-display mt-8 text-2xl font-semibold">{s.title}</h3>
                    <p className="mt-3 leading-relaxed text-ink-2">{s.body}</p>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CHECKS */}
        <section id="checks" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-20">
          <Reveal>
            <p className="font-mono text-xs tracking-[0.3em] text-mint">WHAT WE CATCH</p>
            <h2 className="font-display mt-3 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
              Deterministic checks for the maths. <span className="text-gradient">AI for the fine print.</span>
            </h2>
            <p className="mt-5 max-w-2xl text-ink-2">
              A rules engine checks arithmetic, duplicates, stay length, MRP and benchmarks, so those numbers are reproducible. Claude reads the policy wording,
              package notes and insurer reasons for the judgement calls, and quotes its evidence.
            </p>
          </Reveal>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CHECKS.map((c, i) => (
              <Reveal key={c.title} delay={(i % 3) * 0.08}>
                <TiltCard max={14} className="glass group h-full rounded-2xl p-6 transition hover:border-mint/30">
                  <div className="tilt-pop flex gap-4">
                    <c.icon className="mt-0.5 h-5 w-5 shrink-0 text-mint transition group-hover:drop-shadow-[0_0_8px_var(--mint)]" />
                    <div>
                      <h3 className="font-semibold">{c.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{c.body}</p>
                    </div>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </section>

        {/* EVIDENCE */}
        <section id="evidence" className="mx-auto grid max-w-6xl scroll-mt-28 items-center gap-12 px-4 py-28 md:grid-cols-2">
          <Reveal>
            <p className="font-mono text-xs tracking-[0.3em] text-mint">EVIDENCE, NOT VIBES</p>
            <h2 className="font-display mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Every flag comes with its proof.</h2>
            <p className="mt-5 text-ink-2">
              Each finding quotes the exact bill line, insurer reason or policy clause behind it, states the amount at stake, and tells you precisely what to ask
              for. You decide what goes in the letter.
            </p>
            <div className="mt-8 flex items-end gap-3">
              <span className="font-display text-6xl font-semibold text-mint">
                <Counter value={63451} prefix="₹" />
              </span>
              <span className="pb-2 text-sm text-muted">recoverable in the sample case</span>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <TiltCard max={8} className="glass-strong rounded-3xl p-6">
              <div className="tilt-pop">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-coral/15 px-2.5 py-1 text-xs font-semibold text-coral">HIGH · Insurer</span>
                  <span className="font-display text-2xl font-semibold">₹11,669</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">10% co-pay deducted although it only applies to insured aged 61+</h3>
                <div className="mt-4 space-y-2 font-mono text-xs leading-relaxed text-ink-2">
                  <p className="rounded-lg border-l-2 border-coral bg-white/[0.03] px-3 py-2">D4: &ldquo;Co-payment as per policy terms&rdquo; — 11,669</p>
                  <p className="rounded-lg border-l-2 border-mint bg-white/[0.03] px-3 py-2">Clause 5.3: &ldquo;…where the insured person is aged 61 years or above at entry.&rdquo;</p>
                  <p className="rounded-lg border-l-2 border-mint bg-white/[0.03] px-3 py-2">Policy schedule: &ldquo;age at entry 31&rdquo;</p>
                </div>
                <p className="mt-4 text-sm text-ink-2">
                  <span className="text-mint">Ask for →</span> reversal of deduction D4 in full.
                </p>
              </div>
            </TiltCard>
          </Reveal>
        </section>

        {/* PRIVACY + CTA */}
        <section id="privacy" className="mx-auto max-w-6xl scroll-mt-28 px-4 pb-28">
          <Reveal>
            <div className="glass-strong relative overflow-hidden rounded-[2rem] p-10 md:p-16">
              <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-mint/20 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-violet/20 blur-3xl" />
              <div className="relative grid gap-10 md:grid-cols-[1.4fr_1fr] md:items-center">
                <div>
                  <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Stop paying for other people&apos;s mistakes.</h2>
                  <p className="mt-4 max-w-lg text-ink-2">Run your first audit now. No account needed. You can try the sample case without uploading anything.</p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link href="/audit" className="inline-flex items-center gap-2 rounded-2xl bg-mint px-6 py-3.5 font-semibold text-black transition hover:brightness-110">
                      Start an audit <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link href="/audit?sample=1" className="glass inline-flex items-center rounded-2xl px-6 py-3.5 font-medium hover:bg-white/5">
                      See the sample
                    </Link>
                  </div>
                </div>
                <ul className="space-y-4 text-sm text-ink-2">
                  <li className="flex gap-3"><Lock className="h-5 w-5 shrink-0 text-mint" /> Files are processed in memory, sent only to the AI model for the audit, and never stored by BillGuard.</li>
                  <li className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-mint" /> Findings cite IRDAI rules and your own policy wording. Always verify before you send.</li>
                </ul>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="relative z-10 border-t border-line px-4 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 text-sm text-muted md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <Logo className="h-5 w-5" /> BillGuard
          </div>
          <p className="max-w-xl">
            BillGuard gives an informational audit, not legal or medical advice. Benchmarks are indicative ranges, not official tariffs.
          </p>
        </div>
      </footer>
    </>
  );
}
