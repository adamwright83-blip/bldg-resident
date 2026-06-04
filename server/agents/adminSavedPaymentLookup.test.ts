import { afterEach, describe, expect, it, vi } from "vitest";
import { updateBldgUser } from "../db";
import { tryAttachAdminSavedPaymentMethod } from "./adminSavedPaymentLookup";

vi.mock("../db", () => ({
  updateBldgUser: vi.fn(),
}));

vi.mock("../residentTestMode", () => ({
  isResidentAppTestMode: () => false,
}));

const baseUser = {
  id: 7,
  phoneE164: "+15555550123",
  firstName: "Ada",
  lastName: "Lovelace",
  stripeCustomerId: null,
  stripePaymentMethodId: null,
  paymentMethodSaved: 0,
  cardLast4: null,
} as any;

describe("tryAttachAdminSavedPaymentMethod", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("attaches a verified admin saved card by phone using the shared secret", async () => {
    vi.stubEnv("ADMIN_INTAKE_API_URL", "https://admin.example");
    vi.stubEnv("APP_SHARED_API_SECRET", "shared-secret");
    const updatedUser = {
      ...baseUser,
      stripeCustomerId: "cus_123",
      stripePaymentMethodId: "pm_123",
      paymentMethodSaved: 1,
      cardLast4: "4242",
    };
    vi.mocked(updateBldgUser).mockResolvedValue(updatedUser);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          ok: true,
          found: true,
          stripeCustomerId: "cus_123",
          stripePaymentMethodId: "pm_123",
          cardLast4: "4242",
          brand: "visa",
          expMonth: 12,
          expYear: 2028,
        })
      ),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await tryAttachAdminSavedPaymentMethod(baseUser, "TestLookup");

    expect(result.found).toBe(true);
    expect(result.user).toBe(updatedUser);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://admin.example/api/resident/payment-method-lookup",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-app-shared-secret": "shared-secret",
        }),
        body: JSON.stringify({ phone: "+15555550123" }),
      })
    );
    expect(updateBldgUser).toHaveBeenCalledWith(7, {
      stripeCustomerId: "cus_123",
      stripePaymentMethodId: "pm_123",
      paymentMethodSaved: 1,
      cardLast4: "4242",
    });
  });

  it("does not update the resident when admin has no saved card", async () => {
    vi.stubEnv("ADMIN_INTAKE_API_URL", "https://admin.example");
    vi.stubEnv("APP_SHARED_API_SECRET", "shared-secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(JSON.stringify({ ok: true, found: false })),
      })
    );

    await expect(tryAttachAdminSavedPaymentMethod(baseUser, "TestLookup")).resolves.toMatchObject({
      found: false,
      reason: "not_found",
    });
    expect(updateBldgUser).not.toHaveBeenCalled();
  });

  it("does not leak or persist an unauthorized lookup response", async () => {
    vi.stubEnv("ADMIN_INTAKE_API_URL", "https://admin.example");
    vi.stubEnv("APP_SHARED_API_SECRET", "shared-secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: vi.fn().mockResolvedValue("Unauthorized"),
      })
    );

    await expect(tryAttachAdminSavedPaymentMethod(baseUser, "TestLookup")).resolves.toMatchObject({
      found: false,
      reason: "non_2xx:401",
    });
    expect(updateBldgUser).not.toHaveBeenCalled();
  });
});
