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

export function findBenchmark(description: string): Benchmark | undefined {
  return BENCHMARKS.find((b) => b.match.test(description));
}
