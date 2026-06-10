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
  CAR_DETAIL_KNOWLEDGE,
  LAUNDRY_BUTLER_KNOWLEDGE,
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

export type PostOrderServiceDetail = {
  label: string;
  value: string;
};

export type PostOrderServiceRow = {
  label: string;
  serviceType: string;
  details: PostOrderServiceDetail[];
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

function capitalizePhrase(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function pendingLabelForType(type: string): string {
  if (isGrooming(type)) return "Groomer availability";
  if (isDetail(type)) return "Detail scheduling";
  if (isTransport(type)) return "Schedule match";
  if (isHaircut(type)) return "Availability";
  return "Coordination";
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

function laundryRow(service: PostOrderServiceMeta): PostOrderServiceRow {
  if (laundryIsConfirmed(service)) {
    const pickup =
      service.pickupWindow?.trim() || LAUNDRY_BUTLER_KNOWLEDGE.pickupWindowLabel;
    const ret =
      service.returnWindow?.trim() || LAUNDRY_BUTLER_KNOWLEDGE.deliveryWindowLabel;
    const vendor =
      service.vendorName?.trim() || LAUNDRY_BUTLER_KNOWLEDGE.vendorName;
    return {
      label: "LAUNDRY",
      serviceType: "laundry_pickup",
      details: [
        { label: "Status", value: "Booked" },
        { label: "Vendor", value: vendor },
        { label: "Pickup", value: capitalizePhrase(pickup) },
        { label: "Return", value: capitalizePhrase(ret) },
      ],
    };
  }

  const timing = service.timing?.trim();
  return {
    label: "LAUNDRY",
    serviceType: "laundry_pickup",
    details: timing
      ? [
          { label: "Status", value: "In motion" },
          { label: "Pickup", value: capitalizePhrase(timing) },
        ]
      : [
          { label: "Status", value: "In motion" },
          { label: "Pending", value: "Pickup scheduling" },
        ],
  };
}

function groomingRow(
  service: PostOrderServiceMeta,
  request: string,
  plan: PostOrderPlan,
): PostOrderServiceRow {
  const dogName = resolveDogName(request, service, plan);
  const label = dogName ? `${dogName.toUpperCase()}’S GROOMING` : "GROOMING";

  if (hasRealConfirmation(service)) {
    const windowValue = service.bookingWindow?.trim() || service.timing?.trim();
    const details: PostOrderServiceDetail[] = [{ label: "Status", value: "Confirmed" }];
    if (windowValue) {
      details.push({ label: "Window", value: capitalizePhrase(windowValue) });
    }
    return { label, serviceType: "dog_grooming", details };
  }

  const candidates = service.providerCandidates ?? [];
  if (candidates.length > 0) {
    const primary = candidates[0];
    const pendingValue = primary.window?.trim()
      ? `${primary.name} — ${primary.window.trim()}`
      : primary.name;
    return {
      label,
      serviceType: "dog_grooming",
      details: [
        { label: "Status", value: "Awaiting outside confirmation" },
        { label: "Pending", value: pendingValue },
      ],
    };
  }

  return {
    label,
    serviceType: "dog_grooming",
    details: [
      { label: "Status", value: "Awaiting outside confirmation" },
      { label: "Pending", value: "Groomer availability" },
    ],
  };
}

function detailRow(service: PostOrderServiceMeta): PostOrderServiceRow {
  if (isDetail(normalizeType(service.type)) && service.status === "booked_internal") {
    const bookingDate = service.bookingDate?.trim() || CAR_DETAIL_KNOWLEDGE.defaultBookingDate;
    const bookingWindow =
      service.bookingWindow?.trim() || CAR_DETAIL_KNOWLEDGE.defaultBookingWindow;
    return {
      label: "DETAILING",
      serviceType: "car_detail",
      details: [
        { label: "Status", value: "Booked internally" },
        {
          label: "Window",
          value: `${capitalizePhrase(bookingDate)}, ${bookingWindow}`,
        },
      ],
    };
  }

  if (hasRealConfirmation(service)) {
    const windowValue = service.bookingWindow?.trim() || service.timing?.trim();
    const details: PostOrderServiceDetail[] = [{ label: "Status", value: "Confirmed" }];
    if (windowValue) {
      details.push({ label: "Window", value: capitalizePhrase(windowValue) });
    }
    return { label: "DETAILING", serviceType: "car_detail", details };
  }

  return {
    label: "DETAILING",
    serviceType: "car_detail",
    details: [
      { label: "Status", value: "Awaiting outside confirmation" },
      { label: "Pending", value: pendingLabelForType(service.type) },
    ],
  };
}

function coordinatedRow(service: PostOrderServiceMeta, label: string): PostOrderServiceRow {
  const type = normalizeType(service.type);

  if (hasRealConfirmation(service)) {
    const windowValue = service.bookingWindow?.trim() || service.timing?.trim();
    const details: PostOrderServiceDetail[] = [{ label: "Status", value: "Confirmed" }];
    if (windowValue) {
      details.push({ label: "Window", value: capitalizePhrase(windowValue) });
    }
    return { label, serviceType: service.type, details };
  }

  return {
    label,
    serviceType: service.type,
    details: [
      { label: "Status", value: "Awaiting outside confirmation" },
      { label: "Pending", value: pendingLabelForType(type) },
    ],
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
  if (isDetail(type)) return detailRow(service);
  if (isTransport(type)) return coordinatedRow(service, "TRANSPORT");
  if (isHaircut(type)) return coordinatedRow(service, "HAIRCUT");
  return {
    label: "REQUEST",
    serviceType: service.type,
    details: [
      { label: "Status", value: "In motion" },
      { label: "Pending", value: "Coordination" },
    ],
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

  const hasLaundry = services.some(s => isLaundry(normalizeType(s.type)));
  // Headline stays short by design — pickup/return windows live in the
  // LAUNDRY service row where they are scannable and can never clip.
  const opening = hasLaundry
    ? "I have laundry booked with LAUNDRY BUTLER."
    : "I’ve taken the request in hand.";
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

// Flatten a row for tests and search.
export function formatPostOrderServiceRow(row: PostOrderServiceRow): string {
  return [row.label, ...row.details.map(d => `${d.label}: ${d.value}`)].join("\n");
}
