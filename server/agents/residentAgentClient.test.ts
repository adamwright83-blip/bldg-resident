import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_ADMIN_AGENT_S2S_RUN_TOOL_URL,
  createAdminAgentClient,
  normalizeAdminAgentS2SRunToolUrl,
  postToAdminIntakeFallbackAndVerify,
  shouldUseIntakeFallbackForAgentFailure,
  shouldTryNextIntakeBaseUrl,
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

  it("normalizes admin agent S2S endpoints to the run-tool route", () => {
    expect(normalizeAdminAgentS2SRunToolUrl("https://admin.example")).toBe(
      "https://admin.example/api/agent/s2s/run-tool"
    );
    expect(normalizeAdminAgentS2SRunToolUrl("https://admin.example/api/agent")).toBe(
      "https://admin.example/api/agent/s2s/run-tool"
    );
    expect(normalizeAdminAgentS2SRunToolUrl("https://admin.example/api/agent/s2s/run-tool")).toBe(
      "https://admin.example/api/agent/s2s/run-tool"
    );
  });

  it("posts to the admin S2S run-tool contract before fallback", async () => {
    vi.stubEnv("ADMIN_AGENT_S2S_URL", "https://admin.example/api/agent/s2s/run-tool");
    vi.stubEnv("ADMIN_AGENT_SHARED_SECRET", "secret");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify({ orderId: 456 })),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createAdminAgentClient().runCreateLaundryOrderTool(payload, {
        sessionId: "sess_1",
        conversationId: "conv_1",
      })
    ).resolves.toEqual({
      success: true,
      orderId: 456,
      path: "agent-tool",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://admin.example/api/agent/s2s/run-tool",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-agent-shared-secret": "secret",
        }),
      })
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({
      toolName: "createLaundryOrderTool",
      tenantId: "default",
      agentType: "resident_agent",
      actorType: "resident_chat",
      actorId: "bldg_user:1",
      sessionId: "sess_1",
      conversationId: "conv_1",
      input: {
        pickupTimeWindow: "7–10 AM",
        deliveryTimeWindow: "7–10 AM",
        buildingSlug: "opus",
      },
    });
  });

  it("runs resident plan and coordinated request tools through the generic admin S2S envelope", async () => {
    vi.stubEnv("ADMIN_AGENT_S2S_URL", "https://admin.example/api/agent/s2s/run-tool");
    vi.stubEnv("ADMIN_AGENT_SHARED_SECRET", "secret");
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      if (body.toolName === "createResidentAgentPlanTool") {
        return ok({ planId: "plan_1", planStatus: "pending_confirmation" });
      }
      if (body.toolName === "createResidentCoordinatedRequestTool") {
        return ok({
          requestId: "req_1",
          parentPlanId: body.input.parentPlanId,
          status: "pending_provider_confirmation",
        });
      }
      if (body.toolName === "updateResidentAgentPlanTool") {
        return ok({ planId: body.input.planId, planStatus: body.input.planStatus });
      }
      return ok({});
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = createAdminAgentClient();
    const session = { sessionId: "sess_1", conversationId: "conv_1" };

    await expect(
      client.runCreateResidentAgentPlanTool({ bldgUserId: 1, buildingSlug: "opus" }, session)
    ).resolves.toMatchObject({ success: true, planId: "plan_1", path: "agent-tool" });
    await expect(
      client.runCreateResidentCoordinatedRequestTool(
        { bldgUserId: 1, serviceCategory: "car_detail", parentPlanId: "plan_1" },
        session
      )
    ).resolves.toMatchObject({
      success: true,
      requestId: "req_1",
      parentPlanId: "plan_1",
      path: "agent-tool",
    });
    await expect(
      client.runUpdateResidentAgentPlanTool({ bldgUserId: 1, planId: "plan_1", planStatus: "partially_confirmed" }, session)
    ).resolves.toMatchObject({ success: true, planStatus: "partially_confirmed" });

    const bodies = fetchMock.mock.calls.map((call) => JSON.parse(call[1].body));
    expect(bodies.map((body) => body.toolName)).toEqual([
      "createResidentAgentPlanTool",
      "createResidentCoordinatedRequestTool",
      "updateResidentAgentPlanTool",
    ]);
    expect(bodies[0]).toMatchObject({
      agentType: "resident_agent",
      actorType: "resident_chat",
      actorId: "bldg_user:1",
      sessionId: "sess_1",
      conversationId: "conv_1",
    });
  });

  it("parses nested admin tool output shapes", async () => {
    vi.stubEnv("ADMIN_AGENT_S2S_URL", "https://admin.example/api/agent/s2s/run-tool");
    vi.stubEnv("ADMIN_AGENT_SHARED_SECRET", "secret");
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      if (body.toolName === "createResidentCoordinatedRequestTool") {
        return ok({
          result: {
            output: {
              requestId: "req_nested",
              parentPlanId: "plan_1",
              status: "pending_operator_review",
              residentVisibleStatus: "pending_operator_review",
            },
          },
        });
      }
      return ok({ output: { planId: "plan_nested" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createAdminAgentClient().runCreateResidentCoordinatedRequestTool(
        { bldgUserId: 1, serviceCategory: "car_detail", parentPlanId: "plan_1" },
        { sessionId: "sess_1", conversationId: "conv_1" }
      )
    ).resolves.toMatchObject({
      success: true,
      requestId: "req_nested",
      status: "pending_operator_review",
    });
  });

  it("treats HTTP 200 missing required IDs as tool failure", async () => {
    vi.stubEnv("ADMIN_AGENT_S2S_URL", "https://admin.example/api/agent/s2s/run-tool");
    vi.stubEnv("ADMIN_AGENT_SHARED_SECRET", "secret");
    const session = { sessionId: "sess_1", conversationId: "conv_1" };
    const client = createAdminAgentClient();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok({})));
    await expect(client.runCreateLaundryOrderTool(payload, session)).resolves.toMatchObject({
      success: false,
      reason: "missing_orderId",
    });
    await expect(client.runCreateResidentAgentPlanTool({ bldgUserId: 1 }, session)).resolves.toMatchObject({
      success: false,
      reason: "missing_planId",
    });
    await expect(
      client.runCreateResidentCoordinatedRequestTool({ bldgUserId: 1, serviceCategory: "car_detail" }, session)
    ).resolves.toMatchObject({
      success: false,
      reason: "missing_requestId",
    });
    await expect(client.runUpdateResidentAgentPlanTool({ bldgUserId: 1, planStatus: "failed" }, session)).resolves.toMatchObject({
      success: false,
      reason: "missing_planId",
    });
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
    expect(fetch).toHaveBeenCalledWith(
      "https://admin.example/api/agent/s2s/run-tool",
      expect.any(Object)
    );
    expect(fetch).toHaveBeenCalledWith(
      DEFAULT_ADMIN_AGENT_S2S_RUN_TOOL_URL,
      expect.any(Object)
    );
    expect(shouldUseIntakeFallbackForAgentFailure(result)).toBe(true);
  });

  it("does not fall back on admin agent execution errors that may be real tool failures", () => {
    expect(
      shouldUseIntakeFallbackForAgentFailure({
        success: false,
        reason: "non_2xx:400",
        path: "agent-tool",
        status: 400,
      })
    ).toBe(true);
    expect(
      shouldUseIntakeFallbackForAgentFailure({
        success: false,
        reason: "non_2xx:500",
        path: "agent-tool",
        status: 500,
      })
    ).toBe(false);
  });

  it("only retries intake fallback on missing route responses", () => {
    expect(
      shouldTryNextIntakeBaseUrl({
        success: false,
        reason: "non_200:404",
        path: "intake-fallback",
      })
    ).toBe(true);
    expect(
      shouldTryNextIntakeBaseUrl({
        success: false,
        reason: "non_200:400",
        path: "intake-fallback",
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

function ok(body: unknown) {
  return {
    ok: true,
    status: 200,
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  };
}
