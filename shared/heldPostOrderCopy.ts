// Post-order "chief of staff" copy builder for the HELD screen.
//
// Truth contract: every fact rendered on the post-order screen must come from
// one of (1) the resident's actual request text, (2) parsed multi_service_plan
// metadata, or (3) real service/order state. When none of those supply a fact,
// the builder falls back to safe generic language that invents nothing.
//
// This module is intentionally pure (no React, no DOM) so the truth rules can
// be unit-tested directly. The UI renders whatever blocks this returns.
import {
  buildCarDetailBookedSentence,
  buildLaundryBookedSentence,
  isCarDetailService,
} from "./heldVendorKnowledge";

export type PostOrderServiceMeta = {
  type: string;
  timing?: string | null;
  deadline?: string | null;
  // Real order/coordination state. A coordinated service may only be described
  // as booked/confirmed when one of these reflects a real provider confirmation.
  orderId?: string | number | null;
  status?: string | null;
  // Per-service facts that exist ONLY when parsed from request/plan metadata.
  dogName?: string | null;
  guestRelation?: string | null;
  // Provider candidates only exist when real coordination metadata supplies
  // them. Absent => the copy must never name a provider or a window.
  providerCandidates?: PostOrderProviderCandidate[] | null;
  bookingDate?: string | null;
  bookingWindow?: string | null;
  pickupWindow?: string | null;
  returnWindow?: string | null;
  serviceLabel?: string | null;
  vendorName?: string | null;
};

export type PostOrderProviderCandidate = {
  name: string;
  window?: string | null;
};

export type PostOrderPlan = {
  displayRequest?: string | null;
  services?: PostOrderServiceMeta[] | null;
  // Plan-level facts when not attached to a specific service row.
  dogName?: string | null;
  guestRelation?: string | null;
};

export type PostOrderServiceRow = {
  label: string;
  body: string;
};

export type PostOrderChiefOfStaffCopy = {
  opening: string;
  subhead: string;
  serviceRows: PostOrderServiceRow[];
  closing: string;
};

const LAUNDRY = /\b(laundry|wash|hamper|dry[\s-]?clean)/i;
const GROOMING = /\b(groom|dog)/i;
const DETAIL = /\b(detail|car wash|car-wash)/i;
const TRANSPORT = /\b(airport|ride|uber|waymo|lax|transport|car service)/i;
const HAIRCUT = /\b(haircut|hair cut|barber|blowout)/i;

// Coordinated services are arranged by Held, never "booked"/"confirmed" on
// their own. Only laundry pickup may legitimately carry a real confirmation.
const COORDINATED_TYPES = new Set([
  "dog_grooming",
  "grooming",
  "car_detail",
  "detail",
  "ride_airport",
  "transport",
  "haircut",
]);

function normalizeType(type: string | undefined | null): string {
  return (type ?? "").toLowerCase();
}

function isLaundry(type: string) {
  return type.includes("laundry") || type.includes("dry_clean") || type.includes("dryclean");
}
function isGrooming(type: string) {
  return type.includes("groom") || type.includes("dog");
}
function isDetail(type: string) {
  return type.includes("detail");
}
function isTransport(type: string) {
  return type.includes("ride") || type.includes("airport") || type.includes("transport");
}
function isHaircut(type: string) {
  return type.includes("haircut") || type.includes("hair");
}

// A coordinated (non-laundry) service may say booked/confirmed only when real
// provider confirmation exists. Resident approval is NOT provider confirmation.
function hasRealConfirmation(service: PostOrderServiceMeta): boolean {
  const status = (service.status ?? "").toLowerCase();
  const confirmed = status === "confirmed" || status === "booked";
  return confirmed || service.orderId != null;
}

// Laundry pickup may say booked/confirmed when the plan carries a real order.
function laundryIsConfirmed(service: PostOrderServiceMeta): boolean {
  return hasRealConfirmation(service);
}

// Derive parsed services from raw request text only when the plan supplied
// none. This never invents a service that isn't named in the text.
function inferServicesFromText(request: string): PostOrderServiceMeta[] {
  const services: PostOrderServiceMeta[] = [];
  if (LAUNDRY.test(request)) services.push({ type: "laundry_pickup" });
  if (GROOMING.test(request)) services.push({ type: "dog_grooming" });
  if (DETAIL.test(request)) services.push({ type: "car_detail" });
  if (TRANSPORT.test(request)) services.push({ type: "ride_airport" });
  if (HAIRCUT.test(request)) services.push({ type: "haircut" });
  return services;
}

// Resolve a dog name strictly from real sources: explicit service/plan metadata
// first, then a possessive/name pattern actually present in the request text
// (e.g. "Theo's grooming", "groom Theo", "my dog Theo"). Returns null otherwise.
function resolveDogName(
  request: string,
  service: PostOrderServiceMeta | undefined,
  plan: PostOrderPlan,
): string | null {
  const metaName = service?.dogName ?? plan.dogName ?? null;
  if (metaName && metaName.trim()) return metaName.trim();

  const patterns = [
    /\b([A-Z][a-z]+)'s\s+(?:dog\s+)?groom/,
    /\bgroom(?:ing)?\s+(?:for\s+|my\s+dog\s+|the\s+dog\s+)?([A-Z][a-z]+)\b/,
    /\b(?:my|the)\s+dog\s+([A-Z][a-z]+)\b/,
  ];
  for (const pattern of patterns) {
    const match = request.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

// Resolve a guest relation strictly from real sources. Returns the actual
// parsed relation phrase (e.g. "wife's mother", "mother-in-law") or null. The
// builder never substitutes one relation for another or invents one.
const GUEST_RELATIONS = [
  /\bmother[\s-]in[\s-]law\b/i,
  /\bfather[\s-]in[\s-]law\b/i,
  /\b(?:my\s+)?wife's\s+mother\b/i,
  /\b(?:my\s+)?wife's\s+father\b/i,
  /\b(?:my\s+)?husband's\s+mother\b/i,
  /\b(?:my\s+)?husband's\s+father\b/i,
  /\bin[\s-]laws\b/i,
  /\bparents\b/i,
];

function resolveGuestRelation(
  request: string,
  service: PostOrderServiceMeta | undefined,
  plan: PostOrderPlan,
): string | null {
  const metaRelation = service?.guestRelation ?? plan.guestRelation ?? null;
  if (metaRelation && metaRelation.trim()) return metaRelation.trim();

  for (const pattern of GUEST_RELATIONS) {
    const match = request.match(pattern);
    if (match?.[0]) return match[0].toLowerCase().replace(/^my\s+/, "");
  }
  return null;
}

function laundryRow(service: PostOrderServiceMeta): PostOrderServiceRow {
  const timing = service.timing?.trim();
  if (laundryIsConfirmed(service)) {
    return {
      label: "LAUNDRY",
      body: buildLaundryBookedSentence(),
    };
  }
  if (timing) {
    return {
      label: "LAUNDRY",
      body: `I’m picking it up ${timing} and keeping the return protected.`,
    };
  }
  return {
    label: "LAUNDRY",
    body: "I’m getting pickup moving and keeping the return protected.",
  };
}

function groomingRow(
  service: PostOrderServiceMeta,
  request: string,
  plan: PostOrderPlan,
): PostOrderServiceRow {
  const dogName = resolveDogName(request, service, plan);
  const label = dogName ? `${dogName.toUpperCase()}’S GROOMING` : "GROOMING";

  // Real provider confirmation is the only path to "confirmed" language.
  if (hasRealConfirmation(service)) {
    const subject = dogName ? `grooming for ${dogName}` : "grooming";
    return { label, body: `I’ve got ${subject} confirmed and I’m holding the window.` };
  }

  const candidates = service.providerCandidates ?? [];

  // Provider names/windows may appear ONLY when real candidate metadata exists.
  if (candidates.length > 0) {
    const primary = candidates[0];
    const windowPhrase = primary.window?.trim() ? ` ${primary.window.trim()} open` : " an open window";
    let body = `${primary.name} has${windowPhrase}. I’m holding that window`;
    if (candidates.length > 1 && candidates[1]?.name) {
      body += ` unless you choose ${candidates[1].name} instead.`;
    } else {
      body += " unless you tell me otherwise.";
    }
    const subject = dogName ? `grooming for ${dogName}` : "grooming";
    return { label, body: `I’m lining up ${subject}. ${body}` };
  }

  const subject = dogName ? `grooming for ${dogName}` : "grooming";
  return {
    label,
    body: `I’m lining up ${subject} and will come back only if there’s a real decision.`,
  };
}

function coordinatedRow(
  service: PostOrderServiceMeta,
  label: string,
  noun: string,
  request: string,
): PostOrderServiceRow {
  if (isDetail(normalizeType(service.type)) && service.status === "booked_internal") {
    return {
      label,
      body: buildCarDetailBookedSentence(service, request),
    };
  }

  // Non-laundry coordinated services never claim booked/confirmed unless a real
  // provider confirmation exists in the plan/order state.
  if (hasRealConfirmation(service)) {
    if (isCarDetailService(service.type)) {
      return { label, body: buildCarDetailBookedSentence(service, request) };
    }
    return { label, body: `I’ve got ${noun} confirmed and I’m holding the window.` };
  }
  return {
    label,
    body: `I’m lining up ${noun} and will come back only if there’s a real decision.`,
  };
}

function buildRow(
  service: PostOrderServiceMeta,
  request: string,
  plan: PostOrderPlan,
): PostOrderServiceRow {
  const type = normalizeType(service.type);
  if (isLaundry(type)) return laundryRow(service);
  if (isGrooming(type)) return groomingRow(service, request, plan);
  if (isDetail(type)) return coordinatedRow(service, "DETAILING", "the detail", request);
  if (isTransport(type)) return coordinatedRow(service, "TRANSPORT", "the ride", request);
  if (isHaircut(type)) return coordinatedRow(service, "HAIRCUT", "the haircut", request);
  return {
    label: "REQUEST",
    body: "I’ve taken it in and I’m moving on it.",
  };
}

export function buildPostOrderChiefOfStaffCopy(
  plan: PostOrderPlan | null | undefined,
  originalRequest?: string | null,
): PostOrderChiefOfStaffCopy {
  const safePlan: PostOrderPlan = plan ?? {};
  const request = (originalRequest ?? safePlan.displayRequest ?? "").trim();

  let services = (safePlan.services ?? []).filter(s => s && s.type);
  if (services.length === 0 && request) {
    services = inferServicesFromText(request);
  }

  const opening = "I’ve taken in the request — I’m moving on it.";
  const subhead =
    services.length > 1
      ? "Here’s where each piece sits — I’ll only come back to you when something needs a yes."
      : "Here’s where it sits — I’ll only come back to you when something needs a yes.";

  const serviceRows = services.map(service => buildRow(service, request, safePlan));

  const closing = buildClosing(services);

  return { opening, subhead, serviceRows, closing };
}

function buildClosing(services: PostOrderServiceMeta[]): string {
  const hasPendingCoordination = services.some(service => {
    const type = normalizeType(service.type);
    return (
      (COORDINATED_TYPES.has(type) ||
        isGrooming(type) ||
        isDetail(type) ||
        isTransport(type) ||
        isHaircut(type)) &&
      !hasRealConfirmation(service) &&
      service.status !== "booked_internal"
    );
  });

  return hasPendingCoordination
    ? "I’ll keep the open threads moving and come back only when something needs a real decision."
    : "Nothing else needed right now.";
}
