import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAdminAgentClient,
  postToAdminIntakeFallbackAndVerify,
  type LaundryOrderToolInput,
} from "./residentAgentClient";

const payload: LaundryOrderToolInput = {
  externalId: "bldg-sr-1",
  source: "bldg-resident",
  status: "new",
  serviceType: "wash_fold",
  pickupDate: "2026-02-20",
  pickupWindow: "7–10 AM",
  pickupWindowStart: "7 AM",
  pickupWindowEnd: "10 AM",
  address: "10000 Santa Monica Blvd, Los Angeles, CA 90067",
  buildingId: "opus",
  unit: "12A",
  firstName: "Ada",
  lastName: "Lovelace",
  phone: "+15555550100",
  bldgUserId: 1,
  stripeCustomerId: "cus_test",
  stripePaymentMethodId: "pm_test",
};

describe("residentAgentClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("does not expose an admin agent client without a safe S2S endpoint", () => {
    vi.stubEnv("ADMIN_AGENT_S2S_URL", "");
    vi.stubEnv("ADMIN_AGENT_SHARED_SECRET", "");

    expect(createAdminAgentClient().canRunLaundryOrderTool()).toBe(false);
  });

  it("requires ok true and orderId for intake fallback success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify({ ok: true, orderId: 42 })),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await postToAdminIntakeFallbackAndVerify(
      "https://admin.example",
      "secret",
      payload,
      "Test"
    );

    expect(result).toEqual({
      success: true,
      orderId: 42,
      path: "intake-fallback",
    });
  });

  it("rejects intake fallback success without an orderId", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        text: vi.fn().mockResolvedValue(JSON.stringify({ ok: true })),
      })
    );

    await expect(
      postToAdminIntakeFallbackAndVerify(
        "https://admin.example",
        "secret",
        payload,
        "Test"
      )
    ).resolves.toEqual({
      success: false,
      reason: "missing_orderId",
      path: "intake-fallback",
    });
  });
});
