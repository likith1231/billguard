import type { Finding, LineItemCategory } from "./schema";

export function money(n: number | null | undefined, currency = "INR", decimals = 0) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sym = currency === "INR" ? "₹" : `${currency} `;
  return sym + n.toLocaleString("en-IN", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

export const TYPE_LABEL: Record<Finding["type"], string> = {
  duplicate_charge: "Duplicate",
  unbundling: "Unbundling",
  overcharge_vs_benchmark: "Above benchmark",
  mrp_violation: "Above MRP",
  arithmetic_error: "Arithmetic",
  billing_beyond_stay: "Beyond stay",
  wrongful_deduction: "Wrongful deduction",
  proportionate_deduction: "Proportionate cut",
  non_payable_misclassification: "Wrong non-payable",
  copay_error: "Co-pay error",
  policy_violation: "Policy violation",
  other: "Other",
};

export const CATEGORY_LABEL: Record<LineItemCategory, string> = {
  room: "Room",
  icu: "ICU",
  consultation: "Consultation",
  procedure: "Procedure",
  surgery_package: "Package",
  ot_charges: "OT",
  pharmacy: "Pharmacy",
  consumables: "Consumables",
  implant: "Implant",
  diagnostics_lab: "Lab",
  diagnostics_imaging: "Imaging",
  nursing: "Nursing",
  admin: "Admin",
  other: "Other",
};

export const SEVERITY_STYLE = {
  high: { chip: "bg-coral/15 text-coral", bar: "bg-coral", label: "High" },
  medium: { chip: "bg-amber/15 text-amber", bar: "bg-amber", label: "Medium" },
  low: { chip: "bg-cyan/15 text-cyan", bar: "bg-cyan", label: "Low" },
} as const;
