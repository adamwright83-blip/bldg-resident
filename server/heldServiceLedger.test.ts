import { describe, expect, it } from "vitest";
import {
  buildHeldServiceLedgerStage,
  isTerminalHeldService,
} from "../client/src/components/held/heldServiceLedger";

describe("HELD post-booking service ledger", () => {
  it.each([
    ["booked", "Pickup scheduled.", "Confirmed", "Collection"],
    ["collected", "Garments collected.", "In Care", "Cleaning & Pressing"],
    ["ready_for_return", "Cleaning complete.", "Ready For Return", "Delivery"],
  ])("maps dry cleaning %s to resident-facing reality", (status, stage, ledgerStatus, pending) => {
    const result = buildHeldServiceLedgerStage([{ type: "dry_cleaning", status }]);
    expect(result).toMatchObject({ serviceName: "Dry Cleaning", stage, status: ledgerStatus, pending });
    expect(Object.values(result).join(" ")).not.toMatch(/request|submitted|received|accepted|processing|ticket|case/i);
  });

  it("marks delivered and closed services terminal", () => {
    expect(isTerminalHeldService({ type: "dry_cleaning", status: "delivered" })).toBe(true);
    expect(isTerminalHeldService({ type: "laundry", status: "closed" })).toBe(true);
    expect(isTerminalHeldService({ type: "laundry", status: "confirmed" })).toBe(false);
  });
});
