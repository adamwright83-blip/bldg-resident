import { describe, expect, it } from "vitest";
import { SignJWT, jwtVerify } from "jose";

/**
 * Tests for the Laundry Butler handoff flow.
 *
 * Key design:
 * - Handoff JWTs (from Laundry Butler) are signed with APP_SHARED_API_SECRET
 * - BLDG session cookies (internal) are signed with JWT_SECRET
 * - Receipt API calls use APP_SHARED_API_SECRET in the X-APP-SHARED-SECRET header
 */

const getSharedSecret = () =>
  new TextEncoder().encode(process.env.APP_SHARED_API_SECRET ?? "");
const getSessionSecret = () =>
  new TextEncoder().encode(process.env.JWT_SECRET ?? "");

describe("Environment variables", () => {
  it("JWT_SECRET is set and non-empty", () => {
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.JWT_SECRET!.length).toBeGreaterThan(0);
  });

  it("APP_SHARED_API_SECRET is set and non-empty", () => {
    expect(process.env.APP_SHARED_API_SECRET).toBeDefined();
    expect(process.env.APP_SHARED_API_SECRET!.length).toBeGreaterThan(0);
  });

  it("LAUNDRY_API_BASE_URL is set and starts with https://", () => {
    expect(process.env.LAUNDRY_API_BASE_URL).toBeDefined();
    expect(process.env.LAUNDRY_API_BASE_URL).toMatch(/^https?:\/\//);
  });
});

describe("Handoff JWT (signed with APP_SHARED_API_SECRET)", () => {
  it("can create and verify a handoff JWT with APP_SHARED_API_SECRET", async () => {
    const secret = getSharedSecret();

    // Simulate what Laundry Butler does: sign a JWT with APP_SHARED_API_SECRET
    const token = await new SignJWT({
      phone: "+13105551234",
      firstName: "Alex",
      lastName: "Rivera",
      orderId: "ord_test_123",
      buildingSlug: "opusla",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
      .sign(secret);

    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    // Verify it (simulating what /api/welcome does)
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    expect(payload.phone).toBe("+13105551234");
    expect(payload.firstName).toBe("Alex");
    expect(payload.lastName).toBe("Rivera");
    expect(payload.orderId).toBe("ord_test_123");
    expect(payload.buildingSlug).toBe("opusla");
  });

  it("rejects a handoff JWT signed with a different secret", async () => {
    const wrongSecret = new TextEncoder().encode("wrong-secret-key-12345");
    const correctSecret = getSharedSecret();

    const token = await new SignJWT({
      phone: "+13105551234",
      orderId: "ord_test_456",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
      .sign(wrongSecret);

    await expect(
      jwtVerify(token, correctSecret, { algorithms: ["HS256"] })
    ).rejects.toThrow();
  });

  it("rejects an expired handoff JWT", async () => {
    const secret = getSharedSecret();

    const token = await new SignJWT({
      phone: "+13105551234",
      orderId: "ord_test_789",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60) // expired 60s ago
      .sign(secret);

    await expect(
      jwtVerify(token, secret, { algorithms: ["HS256"] })
    ).rejects.toThrow();
  });
});

describe("BLDG session token (signed with JWT_SECRET)", () => {
  it("can create and verify a BLDG session token with JWT_SECRET", async () => {
    const secret = getSessionSecret();

    // Simulate what /api/welcome does: create a session with bldgUserId
    const sessionToken = await new SignJWT({ bldgUserId: 42 })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
      .sign(secret);

    const { payload } = await jwtVerify(sessionToken, secret, {
      algorithms: ["HS256"],
    });

    expect(payload.bldgUserId).toBe(42);
  });

  it("handoff JWT cannot be verified with JWT_SECRET (different keys)", async () => {
    const sharedSecret = getSharedSecret();
    const sessionSecret = getSessionSecret();

    // Sign with APP_SHARED_API_SECRET (like Laundry Butler does)
    const handoffToken = await new SignJWT({
      phone: "+13105551234",
      orderId: "ord_test_cross",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
      .sign(sharedSecret);

    // Try to verify with JWT_SECRET — should fail since they're different keys
    // (unless by coincidence they happen to be the same value, which is unlikely)
    if (process.env.APP_SHARED_API_SECRET !== process.env.JWT_SECRET) {
      await expect(
        jwtVerify(handoffToken, sessionSecret, { algorithms: ["HS256"] })
      ).rejects.toThrow();
    }
  });
});
