import { describe, expect, it } from "vitest";
import { resolveActiveLaundryServiceRequest } from "./postOrderResolver";

// EXACT live shapes from the 2026-06-12 incident (Railway MySQL):
//   #113 laundry pending orderId=173 requestJson={"recurrence":"weekly"}
//   #114 laundry pending orderId=172 requestJson={"recurrence":"weekly"}
//   #115 laundry pending orderId=172 requestJson={"recurrence":"weekly"}
const LIVE_113 = { id: 113, serviceType: "laundry", status: "pending", orderId: 173, requestJson: { recurrence: "weekly" } };
const LIVE_114 = { id: 114, serviceType: "laundry", status: "pending", orderId: 172, requestJson: { recurrence: "weekly" } };
const LIVE_115 = { id: 115, serviceType: "laundry", status: "pending", orderId: 172, requestJson: { recurrence: "weekly" } };

describe("resolveActiveLaundryServiceRequest — orderId is truth", () => {
  it("REGRESSION: pending + orderId IS active (live #115 shape) — never 'no active order'", () => {
    const { active } = resolveActiveLaundryServiceRequest([LIVE_115]);
    expect(active).not.toBeNull();
    expect(active!.id).toBe(115);
    expect(active!.orderId).toBe(172);
  });

  it("REGRESSION: full live incident set selects newest, dedupes by orderId, flags duplicate order", () => {
    const { active, candidates, duplicateOrderIds } = resolveActiveLaundryServiceRequest([
      LIVE_113,
      LIVE_114,
      LIVE_115,
    ]);
    // newest service_request wins (#115), duplicate sibling #114 (same order 172) deduped
    expect(active!.id).toBe(115);
    expect(active!.orderId).toBe(172);
    // the second distinct order (173) is flagged as duplicate creation
    expect(duplicateOrderIds).toEqual([173]);
    // nothing eligible was rejected
    expect(candidates.filter((c) => c.rejected === null)).toHaveLength(3);
  });

  it("status 'confirmed' / 'paid' / 'scheduled' with orderId are also active", () => {
    for (const status of ["confirmed", "paid", "scheduled"]) {
      const { active } = resolveActiveLaundryServiceRequest([
        { id: 1, serviceType: "laundry", status, orderId: 9 },
      ]);
      expect(active?.orderId).toBe(9);
    }
  });

  it("terminal statuses are excluded even with orderId", () => {
    for (const status of ["cancelled", "completed", "closed"]) {
      const { active, candidates } = resolveActiveLaundryServiceRequest([
        { id: 1, serviceType: "laundry", status, orderId: 9 },
      ]);
      expect(active).toBeNull();
      expect(candidates[0].rejected).toContain("terminal_status");
    }
  });

  it("rows without orderId are rejected with a reason (visible in logs), not silently dropped", () => {
    const { active, candidates } = resolveActiveLaundryServiceRequest([
      { id: 2, serviceType: "laundry", status: "pending", orderId: null },
    ]);
    expect(active).toBeNull();
    expect(candidates[0].rejected).toBe("no_orderId");
  });

  it("non-laundry rows are ignored entirely", () => {
    const { active, candidates } = resolveActiveLaundryServiceRequest([
      { id: 3, serviceType: "dog-grooming", status: "pending", orderId: 5 },
    ]);
    expect(active).toBeNull();
    expect(candidates).toHaveLength(0);
  });

  it("dry-cleaning counts as laundry-like", () => {
    const { active } = resolveActiveLaundryServiceRequest([
      { id: 4, serviceType: "dry-cleaning", status: "pending", orderId: 7 },
    ]);
    expect(active?.orderId).toBe(7);
  });
});
