import { describe, expect, it } from "vitest";
import { isProposalExpired } from "./vendorProposalCardLogic";

describe("isProposalExpired", () => {
  it("is false when the expiry is in the future", () => {
    expect(isProposalExpired("2026-07-01T00:00:00.000Z", new Date("2026-06-22T00:00:00.000Z"))).toBe(false);
  });

  it("is true when the expiry is in the past", () => {
    expect(isProposalExpired("2026-06-01T00:00:00.000Z", new Date("2026-06-22T00:00:00.000Z"))).toBe(true);
  });

  it("is true at the exact expiry instant", () => {
    const at = "2026-06-22T00:00:00.000Z";
    expect(isProposalExpired(at, new Date(at))).toBe(true);
  });
});
