/**
 * Merge Laundry Butler handoff JWT identity with an existing bldg_users row.
 * Never replaces stored non-empty values with empty/null from the JWT.
 */

export type WelcomeHandoffExisting = {
  firstName?: string | null;
  lastName?: string | null;
  buildingSlug?: string | null;
  email?: string | null;
  unit?: string | null;
} | null | undefined;

export type WelcomeHandoffIncoming = {
  firstName?: string | null;
  lastName?: string | null;
  /** Resolved from hostname or JWT buildingSlug only — omit default building here */
  buildingCandidate?: string | null;
  email?: string | null;
  unit?: string | null;
  /** Used for new users or when JWT + existing have no building */
  buildingFallback: string;
};

function trimOrEmpty(v: string | null | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Prefer non-empty incoming (JWT/host); else keep existing; building uses candidate, then existing, then fallback.
 */
export function mergeWelcomeHandoffIdentity(
  existing: WelcomeHandoffExisting,
  incoming: WelcomeHandoffIncoming
): { firstName: string | null; lastName: string | null; email: string | null; unit: string | null; buildingSlug: string } {
  const pick = (jwtVal: string | null | undefined, stored: string | null | undefined): string | null => {
    const j = trimOrEmpty(jwtVal ?? undefined);
    if (j) return j;
    const s = trimOrEmpty(stored ?? undefined);
    return s || null;
  };

  const firstName = pick(incoming.firstName, existing?.firstName);
  const lastName = pick(incoming.lastName, existing?.lastName);
  const email = pick(incoming.email, existing?.email);
  const unit = pick(incoming.unit, existing?.unit);

  const cand = trimOrEmpty(incoming.buildingCandidate ?? undefined);
  const storedB = trimOrEmpty(existing?.buildingSlug ?? undefined);
  const fb = trimOrEmpty(incoming.buildingFallback);
  const buildingSlug = cand || storedB || fb;

  return { firstName, lastName, email, unit, buildingSlug };
}
