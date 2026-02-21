import { describe, it, expect } from "vitest";

describe("Ops Integration - APP_SHARED_API_SECRET", () => {
  it("should have APP_SHARED_API_SECRET configured", () => {
    const secret = process.env.APP_SHARED_API_SECRET;
    expect(secret).toBeDefined();
    expect(secret).not.toBe("");
    expect(typeof secret).toBe("string");
    expect(secret!.length).toBeGreaterThan(10); // Reasonable minimum length for a secret
  });
});
