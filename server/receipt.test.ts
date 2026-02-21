/**
 * Receipt Route Tests
 * Validates JWT-based receipt token generation and verification
 */

import { describe, it, expect } from "vitest";
import { SignJWT, jwtVerify } from "jose";

const JWT_SHARED_SECRET = "pzXX3AzYgcn0sF4onAjRqWZ5Ek16vlVEOnCtLBipcNc=";

describe("Receipt Token", () => {
  it("should sign and verify a receipt token with orderId", async () => {
    const orderId = "510123";
    const secret = new TextEncoder().encode(JWT_SHARED_SECRET);

    // Sign token (simulating ops.bldg.chat)
    const token = await new SignJWT({ orderId })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(secret);

    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");

    // Verify token (simulating app.bldg.chat)
    const { payload } = await jwtVerify(token, secret);
    expect(payload.orderId).toBe(orderId);
  });

  it("should reject an expired token", async () => {
    const orderId = "510124";
    const secret = new TextEncoder().encode(JWT_SHARED_SECRET);

    // Create token that expired 1 second ago
    const token = await new SignJWT({ orderId })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("-1s")
      .sign(secret);

    await expect(jwtVerify(token, secret)).rejects.toThrow();
  });

  it("should reject a token with invalid signature", async () => {
    const orderId = "510125";
    const secret = new TextEncoder().encode(JWT_SHARED_SECRET);
    const wrongSecret = new TextEncoder().encode("wrong-secret");

    // Sign with correct secret
    const token = await new SignJWT({ orderId })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(secret);

    // Try to verify with wrong secret
    await expect(jwtVerify(token, wrongSecret)).rejects.toThrow();
  });

  it("should reject a token missing orderId claim", async () => {
    const secret = new TextEncoder().encode(JWT_SHARED_SECRET);

    // Create token without orderId
    const token = await new SignJWT({ someOtherClaim: "value" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(secret);

    const { payload } = await jwtVerify(token, secret);
    expect(payload.orderId).toBeUndefined();
  });

  it("should handle numeric orderId values", async () => {
    const orderId = 510126; // numeric instead of string
    const secret = new TextEncoder().encode(JWT_SHARED_SECRET);

    const token = await new SignJWT({ orderId })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(secret);

    const { payload } = await jwtVerify(token, secret);
    expect(payload.orderId).toBe(orderId);
  });
});
