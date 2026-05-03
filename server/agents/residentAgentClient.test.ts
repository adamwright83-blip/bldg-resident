import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAdminAgentClient,
  postToAdminIntakeFallbackAndVerify,
  shouldUseIntakeFallbackForAgentFailure,
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

  it("treats missing admin agent S2S routes as fallback-eligible", async () => {
    vi.stubEnv("ADMIN_AGENT_S2S_URL", "https://admin.example/api/agent");
    vi.stubEnv("ADMIN_AGENT_SHARED_SECRET", "secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: vi.fn().mockResolvedValue("not found"),
      })
    );

    const result = await createAdminAgentClient().runCreateLaundryOrderTool(payload, {
      sessionId: "sess_1",
      conversationId: "conv_1",
    });

    expect(result).toEqual({
      success: false,
      reason: "non_2xx:404",
      path: "agent-tool",
      status: 404,
    });
    expect(shouldUseIntakeFallbackForAgentFailure(result)).toBe(true);
  });

  it("does not fall back on admin agent execution errors that may be real tool failures", () => {
    expect(
      shouldUseIntakeFallbackForAgentFailure({
        success: false,
        reason: "non_2xx:500",
        path: "agent-tool",
        status: 500,
      })
    ).toBe(false);
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
