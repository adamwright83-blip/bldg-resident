import { describe, expect, it } from "vitest";
import { isActiveServiceRequestStatus } from "./routers/chat";

describe("HELD persisted order restoration", () => {
  it.each([
    "pending", "paid", "confirmed", "new", "contacting-vendor",
    "awaiting-vendor", "scheduled", "in-progress",
  ])("restores %s requests", status => {
    expect(isActiveServiceRequestStatus(status)).toBe(true);
  });

  it.each(["completed", "cancelled", "closed"])("does not restore %s requests", status => {
    expect(isActiveServiceRequestStatus(status)).toBe(false);
  });
});
