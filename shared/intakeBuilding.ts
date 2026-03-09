/**
 * Intake building resolution: maps session/onboarding slugs to the building key
 * and address expected by the admin intake API. Use address-based or neutral
 * keys; avoid building-name branding in user-facing copy.
 *
 * Session slugs (e.g. from onboarding) may differ from admin intake keys;
 * this module is the single place to resolve that mapping.
 */

/** Map session/onboarding slug -> intake building key (must match admin API / vendor_service_coverage). */
const SLUG_TO_INTAKE_KEY: Record<string, string> = {
  opusla: "opus_la",
};

/** Address by intake building key. Fallback used when key is unknown. */
const INTAKE_ADDRESSES: Record<string, string> = {
  opus_la: "12655 Bluff Creek Dr, Los Angeles, CA 90094",
  "opus-south": "3545 S Figueroa St, Los Angeles, CA 90007",
  "opus-north": "3650 S Figueroa St, Los Angeles, CA 90007",
  "cpe-north": "2160 Century Park E, Los Angeles, CA 90067",
  "cpe-south": "2170 Century Park E, Los Angeles, CA 90067",
};

const FALLBACK_ADDRESS = "10000 Santa Monica Blvd, Los Angeles, CA 90067";

/**
 * Resolve session/onboarding building slug to the intake building key used
 * for address lookup and buildingId in the admin intake payload.
 */
export function resolveIntakeBuildingKey(slug: string): string {
  const normalized = (slug || "").trim().toLowerCase();
  return (SLUG_TO_INTAKE_KEY[normalized] ?? normalized) || "";
}

/**
 * Get the full address for an intake building key (after resolving slug).
 */
export function getAddressForIntakeKey(intakeKey: string): string {
  return INTAKE_ADDRESSES[intakeKey] ?? FALLBACK_ADDRESS;
}
