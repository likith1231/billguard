/**
 * Indicative per-unit price ranges (INR) for common hospital line items in
 * Indian private hospitals. These are reference bands for flagging outliers —
 * NOT official tariffs. Swap them for the CGHS rate list for your city,
 * your insurer's PPN package rates, or NPPA ceiling prices for drugs before
 * relying on them for anything other than a first-pass screen.
 */
export type Benchmark = {
  key: string;
  label: string;
  match: RegExp;
  low: number;
  high: number;
  unit: string;
  source: string;
  /** A user-supplied ceiling: anything above `high` is flagged, with no outlier margin. */
  strict?: boolean;
};

export const BENCHMARKS: Benchmark[] = [
  { key: "cbc", label: "Complete blood count (CBC)", match: /\b(cbc|complete blood count|haemogram|hemogram)\b/i, low: 150, high: 450, unit: "test", source: "Indicative private lab range" },
  { key: "lft", label: "Liver function test", match: /\b(lft|liver function)\b/i, low: 300, high: 900, unit: "test", source: "Indicative private lab range" },
  { key: "kft", label: "Kidney / renal function test", match: /\b(kft|rft|renal function|kidney function)\b/i, low: 300, high: 900, unit: "test", source: "Indicative private lab range" },
  { key: "crp", label: "C-reactive protein", match: /\b(crp|c-reactive)\b/i, low: 250, high: 700, unit: "test", source: "Indicative private lab range" },
  { key: "ecg", label: "ECG (12 lead)", match: /\b(ecg|ekg|electrocardiogram)\b/i, low: 150, high: 500, unit: "test", source: "Indicative private hospital range" },
  { key: "xray_chest", label: "X-ray chest PA view", match: /x-?ray.*chest|chest.*x-?ray/i, low: 250, high: 800, unit: "study", source: "Indicative private hospital range" },
  { key: "usg_abd", label: "Ultrasound abdomen", match: /\b(usg|ultrasound|sonography).*(abd|abdomen|kub|pelvis)/i, low: 800, high: 2500, unit: "study", source: "Indicative private hospital range" },
  { key: "ct_head", label: "CT scan head / brain (plain)", match: /\bct\b.*(head|brain)|(head|brain).*\bct\b/i, low: 1800, high: 4500, unit: "study", source: "Indicative private hospital range" },
  { key: "ct_abd", label: "CT abdomen (contrast)", match: /\bcect\b|\bct\b.*abd/i, low: 4000, high: 9000, unit: "study", source: "Indicative private hospital range" },
  { key: "mri_brain", label: "MRI brain", match: /\bmri\b.*(brain|head)/i, low: 4500, high: 10000, unit: "study", source: "Indicative private hospital range" },
  { key: "consult", label: "Specialist consultation / visit", match: /\b(consultation|consultant visit|doctor visit|physician visit)\b/i, low: 500, high: 2000, unit: "visit", source: "Indicative metro private hospital range" },
  { key: "ward", label: "General ward bed (per day)", match: /\bgeneral ward\b/i, low: 1500, high: 4500, unit: "day", source: "Indicative metro private hospital range" },
  { key: "private_room", label: "Private / single room (per day)", match: /\b(private room|single room|deluxe room|single ac)\b/i, low: 3500, high: 9000, unit: "day", source: "Indicative metro private hospital range" },
  { key: "icu", label: "ICU bed (per day)", match: /\b(icu|intensive care|micu|sicu|ccu)\b.*(bed|charges|day)?/i, low: 6000, high: 18000, unit: "day", source: "Indicative metro private hospital range" },
  { key: "ns500", label: "Normal saline 500 ml", match: /(normal saline|\bns\b|sodium chloride 0\.9).*(500)/i, low: 25, high: 60, unit: "bottle", source: "NPPA ceiling-price neighbourhood" },
  { key: "pcm_inj", label: "Paracetamol IV 1 g / 100 ml", match: /paracetamol.*(inj|infusion|iv|100 ?ml)/i, low: 60, high: 250, unit: "vial", source: "NPPA ceiling-price neighbourhood" },
  { key: "ceftriaxone", label: "Ceftriaxone 1 g injection", match: /ceftriaxone.*1 ?g/i, low: 40, high: 120, unit: "vial", source: "NPPA ceiling-price neighbourhood" },
  { key: "gloves", label: "Examination gloves (pair)", match: /\bgloves?\b/i, low: 5, high: 30, unit: "pair", source: "Indicative wholesale range" },
  { key: "cannula", label: "IV cannula", match: /\b(iv )?cannula\b/i, low: 25, high: 150, unit: "piece", source: "Indicative wholesale range" },
  { key: "syringe", label: "Disposable syringe", match: /\bsyringe\b/i, low: 3, high: 20, unit: "piece", source: "Indicative wholesale range" },
];

/**
 * CGHS prices every procedure for Tier-I cities and cuts the rate for smaller ones
 * (Tier-II 10% lower, Tier-III 20% lower). We apply the same scaling to the indicative
 * bands. The city list is a convenience grouping, not CGHS's official city notification.
 */
export type CityTier = 1 | 2 | 3;
export const TIER_FACTOR: Record<CityTier, number> = { 1: 1, 2: 0.9, 3: 0.8 };

export const CITIES: { name: string; tier: CityTier }[] = [
  ...["Ahmedabad", "Bengaluru", "Chennai", "Delhi / NCR", "Hyderabad", "Kolkata", "Mumbai"].map((name) => ({ name, tier: 1 as const })),
  ...["Pune", "Jaipur", "Lucknow", "Chandigarh", "Kochi", "Coimbatore", "Indore", "Bhopal", "Nagpur", "Visakhapatnam", "Patna", "Surat", "Mysuru", "Mangaluru"].map((name) => ({ name, tier: 2 as const })),
  { name: "Other city / town", tier: 3 },
];

export function cityTier(city: string | null | undefined): CityTier | null {
  return CITIES.find((c) => c.name === city)?.tier ?? null;
}

/** A user-supplied ceiling, e.g. a line from the CGHS rate list or the insurer's PPN package rates. */
export type CustomRate = { item: string; high: number; low?: number; unit?: string; source?: string };

export type RateContext = { city?: string | null; custom?: CustomRate[] };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Parses a rate table CSV with Item and Max/Rate columns (Min, Unit, Source optional). */
export function parseRateCsv(rows: string[][]): CustomRate[] {
  const [head, ...body] = rows;
  if (!head) throw new Error("The rate table is empty.");
  const find = (re: RegExp) => head.findIndex((h) => re.test(h.trim()));
  const item = find(/item|particular|procedure|service|name|desc/i);
  const high = find(/max|high|ceiling|rate|price|amount|limit/i);
  if (item < 0 || high < 0) throw new Error("Rate table needs an Item column and a Max / Rate column.");
  const low = find(/min|low/i);
  const unit = find(/unit/i);
  const source = find(/source|ref/i);
  const out: CustomRate[] = [];
  for (const r of body) {
    const name = (r[item] ?? "").trim();
    const h = Number((r[high] ?? "").replace(/rs\.?|inr|₹|,|\s/gi, ""));
    if (!name || !Number.isFinite(h) || h <= 0) continue;
    const l = low >= 0 ? Number((r[low] ?? "").replace(/[^\d.]/g, "")) : NaN;
    out.push({ item: name, high: h, ...(Number.isFinite(l) && l > 0 ? { low: l } : {}), unit: unit >= 0 ? r[unit]?.trim() || undefined : undefined, source: source >= 0 ? r[source]?.trim() || undefined : undefined });
  }
  if (!out.length) throw new Error("No usable rows found in the rate table.");
  return out;
}

export const RATE_CSV_TEMPLATE =
  "Item,Min,Max,Unit,Source\r\n" +
  "CBC,,200,test,CGHS list\r\n" +
  "ECG,,150,test,CGHS list\r\n" +
  "Private room,,5000,day,Insurer PPN\r\n";

/**
 * Finds the price band for a bill line. A user-supplied rate wins over the built-in bands;
 * built-in bands are scaled for the city tier.
 */
export function findBenchmark(description: string, ctx: RateContext = {}): Benchmark | undefined {
  const d = norm(description);
  const mine = ctx.custom?.find((c) => d.includes(norm(c.item)));
  if (mine) {
    return {
      key: `custom:${norm(mine.item)}`,
      label: mine.item,
      match: /$^/,
      low: mine.low ?? 0,
      high: mine.high,
      unit: mine.unit ?? "unit",
      source: mine.source ? `Your rate table (${mine.source})` : "Your rate table",
      strict: true,
    };
  }
  const b = BENCHMARKS.find((x) => x.match.test(description));
  const tier = cityTier(ctx.city);
  if (!b || !tier || tier === 1) return b;
  const f = TIER_FACTOR[tier];
  return { ...b, low: Math.round(b.low * f), high: Math.round(b.high * f), source: `${b.source}, Tier-${tier === 2 ? "II" : "III"} city adjustment (×${f})` };
}
