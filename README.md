<div align="center">

# 🛡️ BillGuard

### *Every rupee on your bill, cross-examined.*

**An AI tool that audits hospital bills and insurance claims, flags overcharges and wrongful deductions with evidence, and drafts the dispute letter for you.**

<br/>

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js_·_R3F-000000?style=for-the-badge&logo=threedotjs&logoColor=white)

![Claude](https://img.shields.io/badge/Claude_Sonnet_5.5-D97757?style=for-the-badge&logo=anthropic&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white)
![Motion](https://img.shields.io/badge/Motion-FF0055?style=for-the-badge&logo=framer&logoColor=white)

<br/>

[📖 About](#-about) •
[✨ Features](#-features) •
[📸 Screenshots](#-screenshots) •
[🏗️ Architecture](#️-architecture) •
[🚀 Getting Started](#-getting-started) •
[📡 API](#-api-reference) •
[🎨 Design](#-design-system)

<br/>

<img src="docs/screenshots/hero.png" alt="BillGuard landing page with the 3D holographic bill and shield" width="100%" />

</div>

---

## 📖 About

Hospital bills in India are long, coded and easy to pad. Insurance settlement letters are worse: deductions cite "policy terms" without saying which ones. Most patients pay the difference because checking every line against the policy wording takes hours they don't have.

**BillGuard** does that checking for you:

- 🧾 **Upload** the itemised hospital bill and the insurer's settlement letter, plus the policy wording if you have it. PDFs, phone photos and text files all work.
- 🔎 **Cross-examine:** every line item is extracted, then checked for duplicates, bundling errors, MRP violations and price outliers. Every deduction is tested against your policy wording and IRDAI rules.
- ✉️ **Dispute:** you get a ranked list of exactly what to contest, why, and how much, with evidence quoted from your own documents. A dispute letter for the hospital or the insurer is drafted and ready to send.

It's built for **Indian health insurance** (INR, IRDAI regulations, CGHS/NPPA-style benchmarks), but the pipeline is currency-agnostic.

---

## ✨ Features

### 🔍 What it catches

| Check | Engine | What it means |
|---|---|---|
| 📋 **Duplicate charges** | Rules | Same item, same day, same amount billed more than once |
| 📦 **Unbundling** | AI | OT, anaesthesia or nursing billed on top of an all-inclusive package or room tariff |
| 📊 **Benchmark outliers** | Rules | Tests, rooms and drugs priced far above typical ranges |
| 💊 **Above-MRP pharmacy** | Rules | Drugs or consumables sold above the printed MRP |
| 🛏️ **Billing beyond stay** | Rules | More bed-days billed than nights you were admitted |
| 🧮 **Arithmetic errors** | Rules | Qty × rate ≠ amount, or a grand total higher than the sum of lines |
| ✂️ **Proportionate cuts** | Rules + AI | Room-rent cuts applied to ICU, pharmacy, consumables or diagnostics, which IRDAI exempts |
| ％ **Co-pay errors** | AI | Co-pay taken at the wrong rate, or where the policy doesn't apply one |
| 🚫 **Wrong "non-payables"** | AI | Consumables deducted even though your rider covers them |
| 💸 **Settlement gaps** | Rules | Claimed − deductions ≠ approved, so money is missing without explanation |
| 📜 **Policy violations** | AI | Deductions that contradict the policy wording or cite no clause |

### 🧾 The audit report

| Feature | Description |
|---|---|
| 💰 **Recoverable total** | Headline amount you can dispute, next to billed / paid / deducted |
| 🗂️ **Evidence cards** | Each finding quotes the bill line, insurer reason or policy clause behind it, with a severity, the amount at stake and the exact remedy to ask for |
| 🏷️ **Who to raise it with** | Every finding is tagged *hospital* or *insurer*, with totals per party |
| 🤖 **AI vs Rule badges** | You can see whether a finding came from Claude's reading or the deterministic rules engine |
| 📑 **Line-item table** | Every extracted line, with flagged rows highlighted and linked to their findings |
| 🌊 **Settlement waterfall** | Claimed → each deduction → approved, with disputed deductions marked |
| 📤 **Export** | A print-ready **PDF report**, findings and line items as Excel-ready CSV (UTF-8 ₹, formula-injection safe), or the full report as JSON |

### 💸 Recovery plan

| Feature | Description |
|---|---|
| 🥧 **Where your money went** | Bill split into insurer paid / recover from insurer / recover from hospital / genuinely yours, and how much your out-of-pocket drops if the selected points are upheld |
| 📅 **Escalation timeline** | Real dates from the day you send the letter: insurer's 14-day grievance window → Bima Bharosa → Insurance Ombudsman (free, up to ₹50 lakh, within 1 year) → Consumer Commission (within 2 years) |
| ⏱️ **Late-settlement interest** | Insurers must settle within 30 days of the last document; past that you're owed interest at bank rate + 2%. Calculator with editable dates, amount and RBI bank rate |
| 💊 **NPPA routing** | Charges above MRP are flagged as reportable to NPPA's Pharma Jan Samadhan, separately from the refund |
| 🗂️ **Paper-trail checklist** | The eight documents you need for an escalation, remembered per claim in your browser |

### ✉️ Dispute letters

| Feature | Description |
|---|---|
| 🎯 **Pick recipient & points** | Insurer (Grievance Redressal Officer) or hospital (Billing / Patient Relations); choose which findings to include |
| ⚡ **Streams live** | The letter writes itself onto a paper panel in real time |
| ✏️ **Editable** | Tweak the text, then copy, download as `.txt` or print / save as PDF |
| 🏛️ **Escalation built in** | Insurer letters mention the Insurance Ombudsman and the IRDAI Bima Bharosa portal |

### 🌐 Experience

| Feature | Description |
|---|---|
| 🧊 **Full 3D scene** | Holographic bill sheets, a laser scan that pops red pins on flagged rows, and a glass shield with a glowing check, all in React Three Fiber with bloom |
| 🎛️ **Reactive** | The scene follows the mouse, reacts to scroll, speeds up while auditing and settles when the report is ready |
| 🃏 **3D tilt cards** | Glass cards tilt toward the pointer with a moving highlight |
| 🧪 **Demo mode** | Runs without an API key on a built-in sample case, so anyone can try it |
| ⌨️ **Free manual mode** | No documents or API key? Type the bill lines in, import a CSV, or read a text-based PDF / .txt bill, and the rules engine audits them in your browser |
| 🏙️ **City & rate tables** | Pick the hospital's city to scale price bands like CGHS tiers, or upload your own CGHS / PPN / NPPA rates as a CSV; anything over your ceiling is flagged |
| 🌐 **Hindi & Kannada letters** | Draft the dispute letter in English, हिन्दी or ಕನ್ನಡ (AI audits write the whole letter in the language) |
| 📧 **Email it** | Opens the letter pre-filled in your email app or Gmail; you press send |
| 🗂️ **My cases** | Save audits, track status, amount recovered and the 15-day escalation reminder at `/cases`, stored only in your browser, with JSON backup |
| 📱 **Responsive** | From 390px phones to wide desktops; respects `prefers-reduced-motion` |

---

## 📸 Screenshots

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/upload.png" alt="Upload screen" /><p align="center"><b>Upload</b>: bill, insurer letter and policy</p></td>
    <td width="50%"><img src="docs/screenshots/report.png" alt="Audit report" /><p align="center"><b>Audit report</b>: recoverable total and evidence</p></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/letter.png" alt="Dispute letter" /><p align="center"><b>Dispute letter</b>: drafted and editable</p></td>
    <td width="50%"><img src="docs/screenshots/checks.png" alt="Checks section" /><p align="center"><b>What we catch</b></p></td>
  </tr>
  <tr>
    <td colspan="2"><img src="docs/screenshots/plan.png" alt="Recovery plan" /><p align="center"><b>Recovery plan</b>: where the money went, escalation deadlines, late-settlement interest</p></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/manual.png" alt="Manual entry" /><p align="center"><b>Free manual mode</b>: type or import the bill</p></td>
    <td width="50%"><img src="docs/screenshots/pdf-report.png" alt="PDF report" /><p align="center"><b>PDF report</b>: print-ready audit</p></td>
  </tr>
</table>

<div align="center">
<img src="docs/screenshots/mobile.png" alt="Mobile view" width="260" />
<p><b>Mobile</b></p>
</div>

---

## 🏗️ Architecture

```mermaid
flowchart LR
    U["👤 Patient"] -->|"bill · insurer letter · policy<br/>PDF / image / txt"| FE

    subgraph FE["🖥️ Next.js 16 · React 19"]
        UI["Upload · Report · Letter<br/>Tailwind v4 · Motion"]
        R3F["🧊 React Three Fiber scene"]
    end

    subgraph API["⚙️ Route handlers"]
        A["/api/audit"]
        L["/api/letter"]
    end

    subgraph AUDIT["🔎 Audit pipeline"]
        C["🤖 Claude Sonnet 5.5<br/>extract + judge<br/>(Zod structured output)"]
        RU["🧮 Rules engine<br/>maths · duplicates · MRP<br/>stay · benchmarks · settlement"]
        M["🔀 Merge & rank<br/>dedupe · severity · totals"]
    end

    UI --> A --> C --> RU --> M -->|AuditResult| UI
    UI --> L -->|"streamed text"| UI
    L --> C2["🤖 Claude Sonnet 5.5<br/>dispute letter"]
    UI -->|"manual entry / CSV"| RU
```

### How an audit works

1. **Extract + judge (one Claude call).** The documents go to Claude (Sonnet 5.5 by default, set `CLAUDE_MODEL` to change it) with a [Zod](https://zod.dev) schema as structured output. It returns every line item exactly as printed, every deduction with the insurer's wording, the policy limits, and the findings that need judgement (bundling, clause mismatches, co-pay, riders), each with verbatim evidence.
2. **Rules engine.** [`src/lib/rules.ts`](src/lib/rules.ts) re-checks the extracted data deterministically: arithmetic, exact duplicates, bed-days vs stay length, MRP, benchmark outliers, bill totals, settlement maths, co-pay and room-rent deductions against the policy limits, and proportionate cuts on exempt heads. These numbers are reproducible.
3. **Merge & rank.** Rule findings that duplicate an AI finding are dropped; the rest are sorted by severity and amount, and the totals are computed.
4. **Letter.** A second Claude call streams a formal dispute letter that uses only the selected findings' facts.

> 🛟 Both Claude calls have server-side refusal fallback enabled (`fallbacks: "default"`), except on Haiku, which doesn't support it.

### ⌨️ Free manual mode

On `/audit`, **Enter manually** skips the AI entirely: type the bill lines (or import a CSV, including BillGuard's own line-item export), add the insurer's deductions and policy limits, and the same rules engine runs in your browser. It catches arithmetic errors, duplicates, MRP violations, extra bed-days, benchmark outliers, settlement gaps, co-pay above the policy rate, room-rent deductions when the room was within the cap, and proportionate cuts on exempt heads. Bundling and policy-wording checks need the AI.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, route handlers), React 19, TypeScript |
| **Styling** | Tailwind CSS v4, glassmorphism utilities, Space Grotesk · Inter · JetBrains Mono |
| **3D** | Three.js, React Three Fiber, drei (`MeshTransmissionMaterial`, `Float`, `Sparkles`, `Lightformer`), postprocessing (Bloom, Chromatic Aberration, Vignette) |
| **Animation** | Motion (scroll reveals, counters, transitions) |
| **AI** | Anthropic SDK · Claude Sonnet 5.5 (configurable) · adaptive thinking · structured outputs · streaming |
| **Testing** | Vitest |
| **Validation** | Zod v4 |
| **Icons** | Lucide |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 20+**
- An **Anthropic API key** (optional: without one the app runs in demo mode)
- A **Postgres database** for accounts (optional locally: without `DATABASE_URL` the AI audit is open to you on your own machine; in production it is required)

### Install & run

```bash
git clone https://github.com/likith1231/billguard.git
cd billguard
npm install
cp .env.example .env.local     # add your ANTHROPIC_API_KEY (and DATABASE_URL + AUTH_SECRET for accounts)
npm run dev
```

A throwaway local Postgres for accounts:

```bash
docker run -d --name bg-pg -e POSTGRES_PASSWORD=devpw -e POSTGRES_DB=billguard -p 127.0.0.1:55432:5432 postgres:16-alpine
# .env.local
DATABASE_URL=postgres://postgres:devpw@127.0.0.1:55432/billguard
AUTH_SECRET=<openssl rand -hex 32>
```

The tables are created on first use; [`db/schema.sql`](db/schema.sql) has the same schema if you prefer to create them yourself.

Open **http://localhost:3000**, or jump straight to the sample case at **http://localhost:3000/audit?sample=1**.

### 🧪 Try it with the sample documents

[`public/samples/`](public/samples) has a fictitious, internally consistent case: a hospital bill, insurer letter and policy extract. With an API key set, upload them on `/audit` to watch the live pipeline find the same issues as the built-in demo (about **₹63,000** recoverable across 11–12 findings; exact numbers vary slightly between runs).

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest: rules engine, rate tables, bill-text parsing, cases, letters, CSV import/export, AI schema limits, password and session handling |
| `TEST_DATABASE_URL=… npm test` | Also runs the account and AI-gate tests against a real Postgres (sign-up, lockout, quotas, password change, deletion) |

---

## 🔐 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | No | Enables AI audits of uploaded documents and AI-written letters. **Without it**, the sample case and the free manual mode still work, and letters use a deterministic template. |
| `CLAUDE_MODEL` | No | Model for audits and letters. Default `claude-sonnet-5-5`; use `claude-opus-5-5` for the most thorough audits or `claude-haiku-5-5` for the cheapest. |
| `DATABASE_URL` | **Yes in production** | Postgres for accounts (Neon's pooled connection string works). Without it in production the AI audit is switched off; the sample case and manual mode still work. |
| `AUTH_SECRET` | **Yes in production** | Random string of 32+ characters that signs session cookies (`openssl rand -hex 32`). Changing it signs everyone out. |
| `AI_AUDIT_DAILY_LIMIT` | No | AI audits per account per day (UTC). Default `10`. |
| `AI_LETTER_DAILY_LIMIT` | No | AI-written letters per account per day. Default `30`; after that the free template letter is served. |
| `AI_AUDIT_GLOBAL_DAILY_LIMIT` | No | AI audits per day across **all** accounts, a ceiling on your Anthropic bill. Default `200`. |
| `AI_LETTER_GLOBAL_DAILY_LIMIT` | No | The same ceiling for letters. Default `600`. |

> 🔒 `.env.local` is git-ignored. Never commit your key.

---

## 🔑 Accounts

The AI audit and AI-written letters cost money per request, so they need a free account. Everything else stays open:
the sample case, the manual rules-only audit, template letters, exports and saved cases need no account.

| | |
|---|---|
| **Sign-up / sign-in** | Email and password. Passwords are hashed with **Argon2id** (OWASP profile); a login for an unknown email takes the same time and gets the same answer as a wrong password. |
| **Sessions** | A signed JWT (HS256) in an `HttpOnly`, `SameSite=Lax`, `Secure` `__Host-` cookie, valid 7 days. State-changing requests must come from this site (Origin / Sec-Fetch-Site check). |
| **Lockout** | 5 failed sign-ins per account or 20 per network address in 15 minutes pause sign-in for that window; 10 sign-ups per address per hour. |
| **AI quota** | Per account per day (default 10 audits, 30 letters) plus a ceiling across all accounts. Reserved atomically, so parallel requests cannot slip past it, and given back when the AI service fails. |
| **Account page** (`/account`) | Today's AI use, change password (signs out other devices), sign out everywhere, delete account. |
| **What is stored** | Email, optional name, password hash, a token version, failed-login counters (kept 2 days) and per-day AI counts. No bills, audits or letters. |

Not included yet: email verification and password reset by email (they need a mail service). If you forget your password,
an operator can delete the account row so you can sign up again.

---

## 📡 API Reference

### `POST /api/audit`

`multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `bill` | file(s) | **Required.** Hospital bill: PDF, PNG, JPG, WebP or TXT |
| `insurer_letter` | file(s) | Settlement / deduction letter |
| `policy` | file(s) | Policy wording |
| `notes` | string | Optional context from the patient (max 2,000 chars) |
| `city` | string | Optional hospital city (one of the names in `CITIES`) for tier-adjusted price bands |
| `rates` | JSON string | Optional custom rate table: `[{ item, high, low?, unit?, source? }]` |
| `demo` | `"1"` | Return the sample case |

Returns an `AuditResult`: the extraction, ranked `findings[]` (each with `type`, `severity`, `evidence[]`, `disputedAmount`, `lineIds`, `deductionIds`, `action`, `source: "ai" \| "rules"`), `totals` and `mode: "live" \| "demo" \| "manual"`. Limit: 20 MB total.

Errors: `503` when no API key is configured, `402` when the Anthropic account is out of credits, `429` when rate-limited. The UI then points the user to manual mode.

### `POST /api/letter`

`application/json`: `{ audit, recipient: "insurer" | "hospital", findingIds: string[], sender?, lang?: "en" | "hi" | "kn" }`

Streams the letter as `text/plain`. Sample and manual audits (or a failed AI call) use the built-in template letter.

---

## 📁 Project Structure

```
billguard/
├── public/samples/              # Sample bill, insurer letter & policy (fictitious)
├── docs/screenshots/            # README images
└── src/
    ├── app/
    │   ├── page.tsx             # 3D landing page
    │   ├── audit/page.tsx       # Audit app
    │   └── api/
    │       ├── audit/route.ts   # Upload → Claude → rules → AuditResult
    │       └── letter/route.ts  # Streams the dispute letter
    ├── components/
    │   ├── three/Scene.tsx      # R3F scene: bill sheets, scan beam, glass shield
    │   ├── audit/               # Uploader, Scanning, Results, FindingCard,
    │   │                        # LineTable, Settlement (waterfall), LetterPanel,
    │   │                        # RecoveryPlan (money split, deadlines, interest),
    │   │                        # ManualEntry (free rules-only mode), ReportPrint (PDF)
    │   └── ui/                  # Background3D, TiltCard, Nav, Counter, Reveal, Logo
    └── lib/
        ├── schema.ts            # Zod schemas: line items, deductions, findings
        ├── claude.ts            # Anthropic client, audit + letter prompts
        ├── rules.ts             # Deterministic checks, merge & ranking
        ├── benchmarks.ts        # Indicative price bands
        ├── sample.ts            # Demo-mode sample case
        ├── letter-template.ts   # Demo-mode letter
        ├── export.ts            # CSV / JSON exports
        ├── manual.ts            # Manual mode: CSV / text-bill import, form → extraction
        ├── pdf-text.ts          # Browser-side PDF text extraction (pdf.js)
        ├── letter-i18n.ts       # Hindi / Kannada letter wording
        ├── email.ts             # mailto / Gmail links
        ├── cases.ts             # Saved cases (localStorage) + backup
        └── __tests__/           # Vitest suites
        └── format.ts            # Money & label helpers
```

---

## 🎨 Design System

| Swatch | Token | Hex | Usage |
|---|---|---|---|
| ![#04050a](https://placehold.co/20x20/04050a/04050a.png) | `bg` | `#04050A` | Page background |
| ![#4dffb5](https://placehold.co/20x20/4dffb5/4dffb5.png) | `mint` | `#4DFFB5` | Brand: buttons, glow, recoverable amounts |
| ![#8b7bff](https://placehold.co/20x20/8b7bff/8b7bff.png) | `violet` | `#8B7BFF` | Secondary glow, gradients |
| ![#5ad7ff](https://placehold.co/20x20/5ad7ff/5ad7ff.png) | `cyan` | `#5AD7FF` | Low severity, accents |
| ![#ff5d73](https://placehold.co/20x20/ff5d73/ff5d73.png) | `coral` | `#FF5D73` | High severity, flagged lines, disputed deductions |
| ![#ffc857](https://placehold.co/20x20/ffc857/ffc857.png) | `amber` | `#FFC857` | Medium severity, deductions |
| ![#eef1f8](https://placehold.co/20x20/eef1f8/eef1f8.png) | `ink` | `#EEF1F8` | Text |

- 🔤 **Typography:** Space Grotesk (display), Inter (body), JetBrains Mono (evidence & codes)
- 🪟 **Glassmorphism:** `.glass` and `.glass-strong` utilities
- 🧊 **3D background:** one fixed R3F canvas with modes `hero` → `calm` → `scan` → `done`; it fades back behind content as you scroll
- ♿ **Accessible:** severity is shown by label and icon as well as colour; motion is reduced when the OS asks for it

---

## ☁️ Deployment

| Part | Platform | Notes |
|---|---|---|
| 🖥️ App + API | **Vercel** (or any Node host) | Set `ANTHROPIC_API_KEY`, `DATABASE_URL` and `AUTH_SECRET` in the project's environment variables. `/api/audit` sets `maxDuration = 300`, so long bills need a plan that allows 5-minute functions. |
| 🗄️ Accounts DB | **Neon** (free tier) or any Postgres 13+ | Create a database, copy its **pooled** connection string into `DATABASE_URL`. Tables are created on first request. |

---

## ⚠️ Disclaimer

- BillGuard gives an **informational audit, not legal or medical advice**. Check each finding before you send a dispute.
- Benchmarks in [`src/lib/benchmarks.ts`](src/lib/benchmarks.ts) are **indicative ranges, not official tariffs**. Swap in your city's CGHS rates, your insurer's PPN rates or NPPA ceiling prices.
- Regulatory references are to IRDAI's 2024 Master Circular on Health Insurance; **your policy wording governs**.
- Uploaded files are processed in memory and sent only to the Anthropic API. The server stores only your account (email, optional name, password hash) and daily AI counts, never a bill, audit or letter. Manual-mode audits, PDF reading and saved cases stay in your browser, and signing out clears the last report from the tab.
- City tiers scale BillGuard's *indicative* bands; they are not CGHS's official city list or rates. For official figures, upload your own rate table.
- Hindi and Kannada letters are machine-written. Have a fluent reader check them before you send.
- The sample hospital, insurer and patient are fictitious.

---

## 🗺️ Roadmap

- [x] ⌨️ Free rules-only mode: type the bill in or import a CSV, no API key needed
- [x] 📄 Export the audit report as PDF
- [x] 🔌 Parse text-based PDFs in the free mode too (read in the browser with pdf.js)
- [x] 🏥 City tiers (CGHS-style Tier I/II/III scaling) and your own CGHS / PPN / NPPA rate table as a hard ceiling
- [x] 📧 Email the letter: opens pre-filled in your email app or Gmail (you press send)
- [x] 📅 Escalation deadlines & late-settlement interest calculator
- [x] 📤 CSV / JSON export
- [x] 🗃️ Save audits and track dispute status, with a 15-day escalation reminder (stored in your browser, with JSON backup)
- [x] 🌐 Hindi and Kannada letters
- [x] 🔑 Accounts for the AI features: sign-up, sign-in, lockout, daily AI quotas, change password, sign out everywhere, delete account
- [ ] 🔐 Saved cases stored with the account so they follow you across devices
- [ ] 📧 Email verification and password reset (needs a mail service)
- [ ] 📚 Bundled official CGHS / NPPA rate tables (they must be licensed or sourced from the published PDFs)

---

## 🤝 Contributing

Contributions are welcome!

1. 🍴 Fork the repository
2. 🌿 Create a branch: `git checkout -b feature/amazing-feature`
3. 💾 Commit your changes: `git commit -m "Add amazing feature"`
4. 🚀 Push the branch: `git push origin feature/amazing-feature`
5. 📬 Open a pull request

---

<div align="center">

### 🛡️ Built so patients stop paying for billing mistakes

**BillGuard** · *Audit the bill. Prove it. Get it back.*

⭐ **Star this repo if you find it useful!** ⭐

</div>
