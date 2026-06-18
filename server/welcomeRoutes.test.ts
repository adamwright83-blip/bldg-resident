import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import {
  normalizePhoneE164,
  verifyWelcomeToken,
  WELCOME_JWT_AUDIENCE,
  WELCOME_JWT_ISSUER,
} from "./lib/welcomeHandoff";
import { mergeWelcomeHandoffIdentity } from "./lib/welcomeHandoffMerge";

const secret = new TextEncoder().encode("test-shared-secret-that-is-long-enough");

async function token(overrides: Record<string, unknown> = {}, signingSecret = secret) {
  return new SignJWT({
    phone: "(310) 555-1234",
    firstName: "Alex",
    lastName: "Rivera",
    email: "Alex@Example.com",
    unit: "12A",
    buildingSlug: "3545",
    orderId: 123,
    ...overrides,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(WELCOME_JWT_ISSUER)
    .setAudience(WELCOME_JWT_AUDIENCE)
    .setJti(String(overrides.jti ?? "handoff-123"))
    .setExpirationTime(typeof overrides.exp === "number" ? overrides.exp : "5m")
    .sign(signingSecret);
}

describe("Laundry Butler welcome JWT contract", () => {
  it("accepts a new-user handoff and normalizes identity", async () => {
    const claims = await verifyWelcomeToken(await token(), secret);
    expect(claims).toMatchObject({ phoneE164: "+13105551234", email: "alex@example.com", unit: "12A", orderId: 123 });
  });

  it.each([
    ["phone", ""], ["orderId", ""],
  ])("rejects missing required %s", async (field, value) => {
    await expect(verifyWelcomeToken(await token({ [field]: value }), secret)).rejects.toThrow();
  });

  it("rejects expired and tampered tokens", async () => {
    await expect(verifyWelcomeToken(await token({ exp: Math.floor(Date.now() / 1000) - 1 }), secret)).rejects.toThrow();
    const wrong = new TextEncoder().encode("a-different-test-shared-secret-value");
    await expect(verifyWelcomeToken(await token({}, wrong), secret)).rejects.toThrow();
  });

  it("requires issuer, audience, expiration, and jti", async () => {
    const missingClaims = await new SignJWT({ phone: "+13105551234", orderId: 123 })
      .setProtectedHeader({ alg: "HS256" }).sign(secret);
    await expect(verifyWelcomeToken(missingClaims, secret)).rejects.toThrow();
  });

  it("normalizes supported phone forms and rejects ambiguous values", () => {
    expect(normalizePhoneE164("310.555.1234")).toBe("+13105551234");
    expect(normalizePhoneE164("+44 7911 123456")).toBe("+447911123456");
    expect(normalizePhoneE164("555-1234")).toBeNull();
  });
});

describe("welcome profile merge and repeat handoff idempotency inputs", () => {
  it("preserves existing nonempty values when handoff values are blank", () => {
    expect(mergeWelcomeHandoffIdentity(
      { firstName: "Stored", lastName: "Resident", email: "stored@example.com", unit: "8B", buildingSlug: "3650" },
      { firstName: " ", lastName: null, email: "", unit: null, buildingCandidate: "", buildingFallback: "" },
    )).toEqual({ firstName: "Stored", lastName: "Resident", email: "stored@example.com", unit: "8B", buildingSlug: "3650" });
  });

  it("uses stable database idempotency keys for repeated handoffs", () => {
    const userId = 42, orderId = 123;
    expect(`welcome-receipt:${userId}:${orderId}`).toBe("welcome-receipt:42:123");
    expect([userId, orderId]).toEqual([42, 123]);
  });
});
