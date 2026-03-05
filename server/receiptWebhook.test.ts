/**
 * Tests for POST /api/webhooks/receipt — auth, validation, booking update, fallback.
 */
import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import express from "express";
import { registerWelcomeRoutes } from "./welcomeRoutes";

const SECRET = "test-receipt-webhook-secret";

vi.mock("./db", () => ({
  getBldgUserById: vi.fn(),
  getServiceRequestByBldgUserAndOrderId: vi.fn(),
  getServiceRequests: vi.fn(),
  updateServiceRequest: vi.fn(),
  insertChatMessage: vi.fn(),
  upsertBldgUser: vi.fn(),
  updateBldgUser: vi.fn(),
}));

import {
  getBldgUserById,
  getServiceRequestByBldgUserAndOrderId,
  getServiceRequests,
  updateServiceRequest,
  insertChatMessage,
} from "./db";

let server: ReturnType<express.Express["listen"]> | null = null;
let baseUrl: string;
let originalSecret: string | undefined;

beforeAll(async () => {
  originalSecret = process.env.APP_SHARED_API_SECRET;
  process.env.APP_SHARED_API_SECRET = SECRET;
  const app = express();
  app.use(express.json());
  registerWelcomeRoutes(app);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const port = (server?.address() as { port: number })?.port;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(() => {
  if (server) server.close();
  if (originalSecret !== undefined) {
    process.env.APP_SHARED_API_SECRET = originalSecret;
  } else {
    delete process.env.APP_SHARED_API_SECRET;
  }
});

async function postReceipt(body: object, auth?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth !== undefined) headers["Authorization"] = auth;
  const res = await fetch(`${baseUrl}/api/webhooks/receipt`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

describe("POST /api/webhooks/receipt", () => {
  it("returns 401 when Authorization header is missing", async () => {
    const { status, data } = await postReceipt(
      { bldgUserId: 1, receiptUrl: "https://example.com/r", orderId: 123 },
      undefined as unknown as string
    );
    expect(status).toBe(401);
    expect(data.error).toBeDefined();
  });

  it("returns 401 when Authorization header does not match APP_SHARED_API_SECRET", async () => {
    const { status } = await postReceipt(
      { bldgUserId: 1, receiptUrl: "https://example.com/r", orderId: 123 },
      "wrong-secret"
    );
    expect(status).toBe(401);
  });

  it("returns 400 when body is missing required fields", async () => {
    const { status } = await postReceipt(
      { bldgUserId: 1 },
      SECRET
    );
    expect(status).toBe(400);
  });

  it("returns 404 when user is not found", async () => {
    vi.mocked(getBldgUserById).mockResolvedValue(undefined);
    const { status } = await postReceipt(
      { bldgUserId: 999, receiptUrl: "https://example.com/r", orderId: 123 },
      SECRET
    );
    expect(status).toBe(404);
  });

  it("returns 404 when no booking found for user", async () => {
    vi.mocked(getBldgUserById).mockResolvedValue({
      id: 2,
      phoneE164: "+15551234567",
      firstName: "Jane",
      lastName: "Doe",
      unit: "101",
      buildingSlug: "opus-south",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
      stripeCustomerId: null,
      stripePaymentMethodId: null,
      paymentMethodSaved: 0,
      cardLast4: null,
      onboardingStep: 0,
      otpCode: null,
      otpExpiresAt: null,
      otpAttempts: 0,
    } as any);
    vi.mocked(getServiceRequestByBldgUserAndOrderId).mockResolvedValue(undefined);
    vi.mocked(getServiceRequests).mockResolvedValue([]);
    const { status } = await postReceipt(
      { bldgUserId: 2, receiptUrl: "https://example.com/r", orderId: 456 },
      SECRET
    );
    expect(status).toBe(404);
  });

  it("returns 200 and updates booking when user and booking by orderId exist", async () => {
    vi.mocked(getBldgUserById).mockResolvedValue({
      id: 2,
      phoneE164: "+15551234567",
      firstName: "Jane",
      lastName: "Doe",
      unit: "101",
      buildingSlug: "opus-south",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
      stripeCustomerId: null,
      stripePaymentMethodId: null,
      paymentMethodSaved: 0,
      cardLast4: null,
      onboardingStep: 0,
      otpCode: null,
      otpExpiresAt: null,
      otpAttempts: 0,
    } as any);
    const booking = {
      id: 10,
      bldgUserId: 2,
      serviceType: "laundry",
      status: "pending",
      receiptUrl: null,
      orderId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    vi.mocked(getServiceRequestByBldgUserAndOrderId).mockResolvedValue(booking);
    vi.mocked(updateServiceRequest).mockResolvedValue(booking);
    vi.mocked(insertChatMessage).mockResolvedValue(undefined as any);

    const { status, data } = await postReceipt(
      { bldgUserId: 2, receiptUrl: "https://app.bldg.chat/receipt/eyJhbG...", orderId: 123 },
      SECRET
    );

    expect(status).toBe(200);
    expect(data.ok).toBe(true);
    expect(updateServiceRequest).toHaveBeenCalledWith(10, {
      receiptUrl: "https://app.bldg.chat/receipt/eyJhbG...",
      orderId: 123,
      status: "paid",
    });
    expect(insertChatMessage).toHaveBeenCalled();
  });

  it("falls back to most recent pending booking when no booking matches orderId", async () => {
    vi.mocked(getBldgUserById).mockResolvedValue({
      id: 3,
      phoneE164: "+15559999999",
      firstName: "Fallback",
      lastName: "User",
      unit: "202",
      buildingSlug: "opus-north",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
      stripeCustomerId: null,
      stripePaymentMethodId: null,
      paymentMethodSaved: 0,
      cardLast4: null,
      onboardingStep: 0,
      otpCode: null,
      otpExpiresAt: null,
      otpAttempts: 0,
    } as any);
    vi.mocked(getServiceRequestByBldgUserAndOrderId).mockResolvedValue(undefined);
    const pendingBooking = {
      id: 20,
      bldgUserId: 3,
      serviceType: "laundry",
      status: "pending",
      receiptUrl: null,
      orderId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    vi.mocked(getServiceRequests).mockResolvedValue([pendingBooking]);
    vi.mocked(updateServiceRequest).mockResolvedValue(pendingBooking);
    vi.mocked(insertChatMessage).mockResolvedValue(undefined as any);

    const { status, data } = await postReceipt(
      { bldgUserId: 3, receiptUrl: "https://app.bldg.chat/receipt/xyz", orderId: 999 },
      SECRET
    );

    expect(status).toBe(200);
    expect(data.ok).toBe(true);
    expect(updateServiceRequest).toHaveBeenCalledWith(20, {
      receiptUrl: "https://app.bldg.chat/receipt/xyz",
      orderId: 999,
      status: "paid",
    });
  });
});
