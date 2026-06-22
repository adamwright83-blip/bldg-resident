export const DEFAULT_ADMIN_API_BASE_URL = "https://bldg-admin-api-production.up.railway.app";

/** Brand/deployment identity for the admin-api's TenantId union ("default" | "laundry_farm"). Not resident- or building-specific. */
const RESIDENT_APP_TENANT_ID = process.env.RESIDENT_APP_TENANT_ID || "default";

export type ResidentProposalCard = {
  proposal_id: string;
  proposal_version_id: string;
  service_category: string;
  service_label: string;
  resident_safe_summary: string;
  vendor_display_name: string;
  vendor_source_display_type: string | null;
  offered_window: { start: string; end: string; label: string } | null;
  quoted_price: { amount_cents: number; currency: string; label: string } | null;
  proposal_expiry: string;
  readiness: string;
  truth_language: { availability: string | null; authority: string; disclaimer: string };
  truth_flags: Record<string, boolean>;
  fit: { sentence: string } | null;
  reputation: { summary: string; source_display_type: string } | null;
  evidence_labels: string[];
  cta: { visible: boolean; primary_text: string; reassurance: string; authority_only: true };
  state_mutated: false;
  llm_called: false;
};

export type ResidentProposalListResult =
  | { ok: true; items: ResidentProposalCard[]; hasMore: boolean }
  | { ok: false; reason: "unauthorized" | "network_error" };

export type ResidentProposalGetResult =
  | { ok: true; card: ResidentProposalCard }
  | { ok: false; reason: "not_found" | "unauthorized" | "network_error" };

export type ResidentProposalConsentResult =
  | { ok: true; status: "consent_recorded" | "consent_already_recorded"; consentedAt: string | null }
  | { ok: false; reason: "invalid_request" | "unauthorized" | "not_allowed" | "network_error" };

function baseUrl(): string {
  const configured = process.env.RESIDENT_PROPOSALS_API_BASE_URL;
  return (configured || DEFAULT_ADMIN_API_BASE_URL).replace(/\/$/, "");
}

function authHeaders(bldgUserId: number): Record<string, string> {
  return {
    "x-app-shared-secret": process.env.APP_SHARED_API_SECRET || "",
    "x-resident-session-verified": "true",
    "x-bldg-user-id": String(bldgUserId),
    "x-tenant-id": RESIDENT_APP_TENANT_ID,
  };
}

/**
 * Server-only read client for the admin-api's resident-safe proposal endpoints.
 * `bldgUserId` must already be verified server-side (e.g. via getBldgUserIdFromRequest)
 * before calling this -- it is never accepted from request body/query/client input,
 * and tenant/session headers are never derived from the inbound request either.
 */
export async function fetchResidentProposalList(
  bldgUserId: number,
  opts: { limit?: number; offset?: number } = {},
): Promise<ResidentProposalListResult> {
  const params = new URLSearchParams();
  if (opts.limit !== undefined) params.set("limit", String(opts.limit));
  if (opts.offset !== undefined) params.set("offset", String(opts.offset));
  const query = params.toString();
  const url = `${baseUrl()}/api/resident/proposals${query ? `?${query}` : ""}`;

  try {
    const res = await fetch(url, { method: "GET", headers: authHeaders(bldgUserId) });
    if (res.status === 401 || res.status === 403) return { ok: false, reason: "unauthorized" };
    if (!res.ok) return { ok: false, reason: "network_error" };
    const body = await res.json();
    return { ok: true, items: Array.isArray(body?.items) ? body.items : [], hasMore: Boolean(body?.page?.hasMore) };
  } catch {
    return { ok: false, reason: "network_error" };
  }
}

export async function fetchResidentProposalDetail(
  bldgUserId: number,
  versionId: string,
): Promise<ResidentProposalGetResult> {
  const url = `${baseUrl()}/api/resident/proposals/${encodeURIComponent(versionId)}`;

  try {
    const res = await fetch(url, { method: "GET", headers: authHeaders(bldgUserId) });
    if (res.status === 401 || res.status === 403) return { ok: false, reason: "unauthorized" };
    if (res.status === 404) return { ok: false, reason: "not_found" };
    if (!res.ok) return { ok: false, reason: "network_error" };
    const card = await res.json();
    return { ok: true, card };
  } catch {
    return { ok: false, reason: "network_error" };
  }
}

export async function submitResidentProposalConsent(
  bldgUserId: number,
  versionId: string,
): Promise<ResidentProposalConsentResult> {
  const url = `${baseUrl()}/api/resident/proposals/${encodeURIComponent(versionId)}/consent`;

  try {
    const res = await fetch(url, { method: "POST", headers: authHeaders(bldgUserId) });
    if (res.status === 401 || res.status === 403) return { ok: false, reason: "unauthorized" };
    if (res.status === 404) return { ok: false, reason: "not_allowed" };
    if (res.status === 400) return { ok: false, reason: "invalid_request" };
    if (!res.ok) return { ok: false, reason: "network_error" };
    const body = await res.json();
    const status = body?.status === "consent_already_recorded" ? "consent_already_recorded" : "consent_recorded";
    return { ok: true, status, consentedAt: body?.consentedAt ?? null };
  } catch {
    return { ok: false, reason: "network_error" };
  }
}
