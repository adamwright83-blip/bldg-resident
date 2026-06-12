import { describe, expect, it } from "vitest";
import { hydrateServiceRequest, serviceRequestBaseSelect } from "./db";
import { resolveActiveLaundryServiceRequest } from "./postOrderResolver";

// LIVE REGRESSION (2026-06-12, bldgUserId 215): MySQL held
// service_requests #115 { laundry, pending, orderId=172 } but the app's
// getServiceRequests() path dropped orderId — the select list omitted the
// column and hydrateServiceRequest() hard-nulled it — so the post-order
// resolver received orderId:null for every row, rejected them all as
// no_orderId, and told the resident "I don't see an active laundry order".
//
// These tests exercise the REAL hydration path (the actual select list +
// the actual hydrate function), not a hand-built resolver input. They FAIL
// on the pre-fix code.

// Exactly the live row #115 as the FIXED select returns it from MySQL.
const LIVE_DB_ROW_115 = {
  id: 115,
  bldgUserId: 215,
  serviceType: "laundry" as const,
  status: "pending" as const,
  requestSummary: "laundry — Thursday, Jun 12 7–9 AM",
  requestJson: { recurrence: "weekly" },
  scheduledDate: "Thursday, Jun 12",
  scheduledWindow: "7–9 AM",
  orderId: 172,
  createdAt: new Date("2026-06-12T02:52:49Z"),
  updatedAt: new Date("2026-06-12T02:52:49Z"),
};

describe("service_request hydration — orderId is never dropped (live #115 regression)", () => {
  it("the select list carries the operational-truth columns", () => {
    // Fails pre-fix: orderId was absent from serviceRequestBaseSelect.
    const keys = Object.keys(serviceRequestBaseSelect);
    expect(keys).toContain("orderId");
    expect(keys).toContain("requestJson");
    expect(keys).toContain("status");
    expect(keys).toContain("serviceType");
  });

  it("hydrateServiceRequest preserves a real orderId (never defaults to null)", () => {
    // Fails pre-fix: hydrate hard-coded orderId: null.
    const hydrated = hydrateServiceRequest(LIVE_DB_ROW_115 as never);
    expect(hydrated.orderId).toBe(172);
    expect(hydrated.requestJson).toEqual({ recurrence: "weekly" });
    expect(hydrated.status).toBe("pending");
  });

  it("end-to-end app-side chain: hydrated live row IS the active order", () => {
    // Real hydrate -> real resolver, the same chain postOrderFollowup runs.
    const hydrated = hydrateServiceRequest(LIVE_DB_ROW_115 as never);
    const { active, candidates } = resolveActiveLaundryServiceRequest([hydrated as never]);
    expect(active).not.toBeNull();
    expect((active as { id: number }).id).toBe(115);
    expect((active as { orderId: number | null }).orderId).toBe(172);
    expect(candidates[0].rejected).toBeNull();
  });

  it("a row genuinely without an order still hydrates to orderId null", () => {
    const hydrated = hydrateServiceRequest({ ...LIVE_DB_ROW_115, orderId: null } as never);
    expect(hydrated.orderId).toBeNull();
  });
});
