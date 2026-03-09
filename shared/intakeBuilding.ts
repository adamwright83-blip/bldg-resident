/**
 * Intake building resolution: tower identity is address-number based (3545, 3650, 2160, 2170).
 * Full addresses feed the driver/admin app. Legacy slugs normalize to these tower identities.
 *
 * Canonical mapping (source of truth):
 * - 3545.bldg.chat = south tower = 3545 Wilshire Blvd
 * - 3650.bldg.chat = north tower = 3650 6th St
 * - 2170.bldg.chat = south tower = 2170 Century Pk E
 * - 2160.bldg.chat = north tower = 2160 Century Pk E
 *
 * No branded building names in user-facing copy; internal keys are tower numbers.
 */

/** Canonical tower IDs (first-class). */
export const TOWER_IDS = ["3545", "3650", "2160", "2170"] as const;
export type TowerId = (typeof TOWER_IDS)[number];

/** Full address by tower ID (for driver/admin intake payload). Exact strings from building records; no inferred city/state/ZIP. */
const TOWER_ADDRESSES: Record<string, string> = {
  "3545": "3545 Wilshire Blvd",
  "3650": "3650 6th St",
  "2160": "2160 Century Pk E",
  "2170": "2170 Century Pk E",
};

/** Legacy slugs (onboarding, old DB) → canonical tower ID. */
const LEGACY_SLUG_TO_TOWER: Record<string, string> = {
  opusla: "3545",
  "opus-south": "3545",
  "opus-north": "3650",
  "cpe-north": "2160",
  "cpe-south": "2170",
};

/** Used when tower is unknown (no guessed address; avoids silent misrouting). */
const FALLBACK_ADDRESS = "Address unknown";

/**
 * Resolve any session/onboarding building slug to the canonical tower ID
 * used for buildingId and address in the admin intake payload.
 * Tower numbers (3545, 3650, 2160, 2170) pass through; legacy slugs normalize to tower.
 */
export function resolveIntakeBuildingKey(slug: string): string {
  const raw = (slug || "").trim();
  const lower = raw.toLowerCase();
  // First-class: already a known tower number
  if (TOWER_ADDRESSES[raw]) return raw;
  // Legacy slug → tower
  const tower = LEGACY_SLUG_TO_TOWER[lower];
  if (tower) return tower;
  return raw || "";
}

/**
 * Full address for the given tower ID (after resolving slug with resolveIntakeBuildingKey).
 */
export function getAddressForIntakeKey(intakeKey: string): string {
  return TOWER_ADDRESSES[intakeKey] ?? FALLBACK_ADDRESS;
}
