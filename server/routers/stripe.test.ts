import { SignJWT } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

vi.mock("../lib/stripeHelper", () => ({
  createStripeCustomer: vi.fn(),
  replacePaymentMethod: vi.fn(),
}));

vi.mock("../db", () => ({
  getBldgUserById: vi.fn(),
  insertChatMessage: vi.fn().mockResolvedValue(undefined),
  updateBldgUser: vi.fn().mockResolvedValue(undefined),
  getServiceRequests: vi.fn().mockResolvedValue([]),
  updateServiceRequest: vi.fn().mockResolvedValue(undefined),
  createServiceRequest: vi.fn().mockResolvedValue({ id: 1 }),
  hasShownOnboarding: vi.fn().mockResolvedValue(true),
  markOnboardingShown: vi.fn().mockResolvedValue(undefined),
  getDb: vi.fn().mockResolvedValue({
    update: () => ({
      set: () => ({
        where: () => Promise.resolve(),
      }),
    }),
  }),
}));

vi.mock("./chat", async () => {
  const { router } = await import("../_core/trpc");
  return {
    chatRouter: router({}),
    getOnboardingMessage: vi.fn().mockReturnValue(null),
  };
});

vi.mock("../opsIntegration", () => ({
  createOpsPickup: vi.fn(),
}));

vi.mock("../intakeReturnBy", () => ({
  withDefaultReturnBy: (payload: unknown) => payload,
}));

vi.mock("../../shared/intakeBuilding", () => ({
  resolveIntakeBuildingKey: vi.fn().mockReturnValue("test-building"),
  getAddressForIntakeKey: vi.fn().mockReturnValue("123 Test St"),
}));

const { createStripeCustomer, replacePaymentMethod } = await import("../lib/stripeHelper");
const { getBldgUserById, createServiceRequest, getServiceRequests } = await import("../db");

function baseUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 252,
    stripeCustomerId: null,
    stripePaymentMethodId: null,
    firstName: "Resident",
    lastName: "Test",
    phoneE164: "+13235550000",
    onboardingStep: 4,
    pendingBookingIntentJson: null,
    ...overrides,
  };
}

async function createAuthenticatedContext(bldgUserId: number): Promise<TrpcContext> {
  vi.stubEnv("JWT_SECRET", "test-secret");
  const token = await new SignJWT({ bldgUserId })
    .setProtectedHeader({ alg: "HS256" })
    .sign(new TextEncoder().encode("test-secret"));

  return {
    user: null,
    req: {
      protocol: "https",
      headers: { cookie: `bldg_session=${token}` },
    } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("stripe.savePaymentMethod", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("returns a card-declined-specific message and never the raw Stripe error", async () => {
    vi.mocked(getBldgUserById).mockResolvedValue(baseUser() as any);
    const declineError: any = new Error("Your card was declined.");
    declineError.type = "StripeCardError";
    declineError.code = "card_declined";
    declineError.decline_code = "generic_decline";
    declineError.payment_method = { card: { last4: "1369", number: "4000000000000002" } };
    vi.mocked(createStripeCustomer).mockRejectedValue(declineError);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const ctx = await createAuthenticatedContext(252);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.stripe.savePaymentMethod({ paymentMethodId: "pm_declined" })
    ).rejects.toThrow("Your card was declined. Please try another card or contact your bank.");

    const loggedArgs = consoleErrorSpy.mock.calls.flat().map((arg) => JSON.stringify(arg));
    const loggedText = loggedArgs.join(" ");
    expect(loggedText).not.toContain("4000000000000002");
    expect(loggedText).not.toContain("payment_method");
  });

  it("returns the generic safe message for a non-card Stripe/backend failure", async () => {
    vi.mocked(getBldgUserById).mockResolvedValue(baseUser() as any);
    const backendError: any = new Error("connection refused");
    backendError.type = "StripeAPIError";
    vi.mocked(createStripeCustomer).mockRejectedValue(backendError);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const ctx = await createAuthenticatedContext(252);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.stripe.savePaymentMethod({ paymentMethodId: "pm_x" })
    ).rejects.toThrow("Stripe customer setup failed. Please verify backend Stripe configuration.");
  });

  it("executes the deferred booking and reports a pending order when a booking intent exists", async () => {
    vi.mocked(getBldgUserById).mockResolvedValue(
      baseUser({
        pendingBookingIntentJson: {
          serviceType: "laundry",
          date: "Saturday, Feb 28",
          timeWindow: "9am-11am",
        },
      }) as any
    );
    vi.mocked(createStripeCustomer).mockResolvedValue({ customerId: "cus_123", last4: "1369" });
    vi.mocked(getServiceRequests).mockResolvedValue([
      { id: 1, status: "pending", serviceType: "laundry" } as any,
    ]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve("{}") }));

    const ctx = await createAuthenticatedContext(252);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.stripe.savePaymentMethod({ paymentMethodId: "pm_ok" });

    expect(createServiceRequest).toHaveBeenCalled();
    expect(result.hasPendingOrder).toBe(true);
  });

  it("does not create an order and reports no pending order when there is no booking intent", async () => {
    vi.mocked(getBldgUserById).mockResolvedValue(baseUser({ pendingBookingIntentJson: null }) as any);
    vi.mocked(createStripeCustomer).mockResolvedValue({ customerId: "cus_456", last4: "1369" });
    vi.mocked(getServiceRequests).mockResolvedValue([]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve("{}") }));

    const ctx = await createAuthenticatedContext(252);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.stripe.savePaymentMethod({ paymentMethodId: "pm_ok" });

    expect(createServiceRequest).not.toHaveBeenCalled();
    expect(result.hasPendingOrder).toBe(false);
  });
});
