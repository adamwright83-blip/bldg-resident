import type { HeldParsedService } from "./HeldArtistDrawing";

export type HeldServiceLedgerStage = {
  pending: string;
  sentence: string;
  serviceName: string;
  stage: string;
  status: string;
};

const TERMINAL_STATUSES = new Set(["completed", "delivered", "cancelled", "canceled", "closed"]);

export function isTerminalHeldService(service: HeldParsedService) {
  return TERMINAL_STATUSES.has((service.status ?? "").trim().toLowerCase());
}

export function buildHeldServiceLedgerStage(
  services: HeldParsedService[],
): HeldServiceLedgerStage {
  const active = services.filter(service => !isTerminalHeldService(service));
  const service = active[active.length - 1] ?? services[services.length - 1];
  const type = (service?.type ?? "service").toLowerCase().replace(/-/g, "_");
  const status = (service?.status ?? "booked").toLowerCase().replace(/[\s-]+/g, "_");
  const dryCleaning = /dry_?clean/.test(type);
  const laundry = /laundry|wash_?fold/.test(type);
  const serviceName = dryCleaning ? "Dry Cleaning" : laundry ? "Laundry" : type
    .split("_")
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "Service";

  if (/ready|cleaning_complete|ready_for_return/.test(status)) {
    return {
      serviceName,
      stage: dryCleaning ? "Cleaning complete." : "Care complete.",
      sentence: "Return delivery is being arranged.",
      status: "Ready For Return",
      pending: "Delivery",
    };
  }

  if (/collected|picked_up|in_care|cleaning|processing|in_progress/.test(status)) {
    return {
      serviceName,
      stage: dryCleaning ? "Garments collected." : "Items collected.",
      sentence: dryCleaning
        ? "They are now being cleaned and pressed."
        : "They are now in care.",
      status: "In Care",
      pending: dryCleaning ? "Cleaning & Pressing" : "Care",
    };
  }

  return {
    serviceName,
    stage: "Pickup scheduled.",
    sentence: dryCleaning
      ? "Your garments are awaiting collection."
      : "Your items are awaiting collection.",
    status: "Confirmed",
    pending: "Collection",
  };
}
