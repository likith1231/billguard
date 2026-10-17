# BillGuard

AI tool that audits hospital bills and insurance claims, flags overcharges and wrongful deductions with evidence, and drafts the dispute letter.

Upload the hospital bill and insurer letter (plus policy wording, optionally). BillGuard extracts every line item, checks them against duplicates, bundling errors and price benchmarks, compares the claim settlement with your policy wording, and tells you exactly what to dispute and why.

## Stack

- **Next.js 16** (App Router) + **Tailwind CSS 4**
- **React Three Fiber / drei / postprocessing**: 3D hero with holographic bill sheets, a scanning beam that lights up flagged rows, and a glass shield
- **Claude Opus 5.5** (`@anthropic-ai/sdk`): one structured-output call extracts the documents and audits them; a second call streams the dispute letter
- **Rules engine** (`src/lib/rules.ts`): deterministic checks for arithmetic, exact duplicates, bed-days beyond stay, above-MRP pharmacy, benchmark outliers, bill-total and settlement maths, and proportionate deductions on exempt heads

## How it works

```
upload (PDF / image / txt)
   └─▶ /api/audit ──▶ Claude: extract line items, deductions, policy clauses + AI findings (zod-validated)
                  └─▶ rules engine: deterministic findings, de-duplicated against the AI ones
                  └─▶ AuditResult { findings, totals }  ─▶ results dashboard
/api/letter ──▶ Claude streams a dispute letter for the selected findings (insurer or hospital)
```

Each finding records whether it came from the AI or the rules engine, who to raise it with (hospital or insurer), the evidence quoted from the documents, the disputed amount, and the remedy to ask for.

## Run it

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

Without an API key the app runs in **demo mode**: audits return the built-in sample case (`src/lib/sample.ts`) and letters use a deterministic template. The matching sample documents are in `public/samples/`. Upload them with a key set to see the live pipeline.

## Notes

- Benchmarks in `src/lib/benchmarks.ts` are **indicative ranges, not official tariffs**. Replace them with your city's CGHS rates, insurer PPN rates, or NPPA ceiling prices.
- Regulatory references are to IRDAI's 2024 Master Circular on Health Insurance. The policy wording governs.
- Uploaded files are processed in memory and sent only to the Anthropic API. Nothing is stored server-side.
- The server-side refusal fallback (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`) is enabled on both Claude calls.
- BillGuard is informational, not legal or medical advice.
