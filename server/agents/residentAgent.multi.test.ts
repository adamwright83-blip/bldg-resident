import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getChatHistory: vi.fn(),
  getBldgUserById: vi.fn(),
  insertChatMessage: vi.fn(),
  updateBldgUser: vi.fn(),
  createServiceRequest: vi.fn(),
  updateServiceRequest: vi.fn(),
}));

const bookingMocks = vi.hoisted(() => ({
  findDuplicateBooking: vi.fn(),
  getBookingDefaults: vi.fn(),
}));

vi.mock("../db", () => dbMocks);
vi.mock("../bookingLogic", () => bookingMocks);

const completeUser = {
  id: 1,
  phoneE164: "+15555550100",
  firstName: "Ada",
  lastName: "Lovelace",
  unit: "12A",
  buildingSlug: "opus",
  paymentMethodSaved: 1,
  stripeCustomerId: "cus_test",
  stripePaymentMethodId: "pm_test",
};

describe("runResidentAgent multi-intent orchestration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("ADMIN_AGENT_S2S_URL", "https://admin.example/api/agent/s2s/run-tool");
    vi.stubEnv("ADMIN_AGENT_SHARED_SECRET", "secret");
    vi.stubEnv("APP_SHARED_API_SECRET", "intake-secret");

    dbMocks.getChatHistory.mockResolvedValue([]);
    dbMocks.getBldgUserById.mockResolvedValue(completeUser);
    dbMocks.insertChatMessage.mockResolvedValue({ id: 1 });
    dbMocks.updateBldgUser.mockResolvedValue(undefined);
    dbMocks.createServiceRequest.mockResolvedValue({ id: 99 });
    dbMocks.updateServiceRequest.mockResolvedValue({ id: 99 });

    bookingMocks.findDuplicateBooking.mockResolvedValue(null);
    bookingMocks.getBookingDefaults.mockResolvedValue({
      date: "Saturday, May 16",
      window: "7–10 AM",
      recurrence: "weekly",
      scheduled_start_utc: "2026-05-16T14:00:00.000Z",
      scheduled_end_utc: "2026-05-16T17:00:00.000Z",
      scheduled_start_local: "2026-05-16T07:00:00",
      scheduled_end_local: "2026-05-16T10:00:00",
      timezone: "America/Los_Angeles",
    });
  });

  it("preserves the laundry-only admin order path", async () => {
    const { runResidentAgent } = await import("./residentAgent");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify({ orderId: 456 })),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await runResidentAgent({
      bldgUserId: 1,
      content: "do my laundry tomorrow",
      user: completeUser as any,
    });

    expect(result.handled).toBe(true);
    expect(result.content).toBe("Laundry booked for Saturday, May 16, 7–10 AM.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      toolName: "createLaundryOrderTool",
    });
  });

  it("creates a plan before child requests, passes parentPlanId, updates the plan, and separates confirmed from pending", async () => {
    const { runResidentAgent } = await import("./residentAgent");
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      if (body.toolName === "createResidentAgentPlanTool") {
        return response({ planId: "plan_1", planStatus: "pending_confirmation" });
      }
      if (body.toolName === "createLaundryOrderTool") {
        return response({ orderId: 456 });
      }
      if (body.toolName === "createResidentCoordinatedRequestTool") {
        return response({
          requestId: `req_${body.input.serviceCategory}`,
          parentPlanId: body.input.parentPlanId,
          status: "pending_provider_confirmation",
          residentVisibleStatus: "pending_provider_confirmation",
          nextAction: "provider_confirmation",
        });
      }
      if (body.toolName === "updateResidentAgentPlanTool") {
        return response({ planId: body.input.planId, planStatus: body.input.planStatus });
      }
      throw new Error(`unexpected tool ${body.toolName}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await runResidentAgent({
      bldgUserId: 1,
      content:
        "I need a dog groomer before my mother-in-law visits in three days, and a car detail, and an Uber to pick her up from LAX to Opus LA, oh and do my laundry tomorrow.",
      user: completeUser as any,
    });

    const toolCalls = fetchMock.mock.calls.map((call) => JSON.parse(call[1].body));
    expect(toolCalls.map((call) => call.toolName)).toEqual([
      "createResidentAgentPlanTool",
      "createLaundryOrderTool",
      "createResidentCoordinatedRequestTool",
      "createResidentCoordinatedRequestTool",
      "createResidentCoordinatedRequestTool",
      "updateResidentAgentPlanTool",
    ]);
    for (const call of toolCalls.filter((call) => call.toolName === "createResidentCoordinatedRequestTool")) {
      expect(call.input.parentPlanId).toBe("plan_1");
    }
    expect(toolCalls.some((call) => call.toolName === "createLaundryOrderTool" && call.input.serviceCategory)).toBe(false);
    expect(toolCalls[5].input.planStatus).toBe("partially_confirmed");

    expect(result.content).toContain("Laundry is booked");
    expect(result.content).toContain("queued for confirmation");
    expect(result.metadata).toMatchObject({
      type: "multi_service_plan",
      planId: "plan_1",
    });
    const items = (result.metadata as any).items;
    expect(items.find((item: any) => item.serviceCategory === "laundry")).toMatchObject({
      status: "confirmed",
    });
    expect(items.find((item: any) => item.serviceCategory === "dog_grooming")).toMatchObject({
      status: "pending_provider_confirmation",
      deadlineDate: expect.any(String),
      deadlineReason: "mother-in-law visit",
    });
    expect(items.find((item: any) => item.serviceCategory === "airport_transport")).toMatchObject({
      status: "pending_provider_confirmation",
      requestId: "req_airport_transport",
    });
  });

  it("does not mark coordinated services confirmed unless admin confirms", async () => {
    const { runResidentAgent } = await import("./residentAgent");
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      if (body.toolName === "createResidentAgentPlanTool") return response({ planId: "plan_1" });
      if (body.toolName === "createLaundryOrderTool") return response({ orderId: 456 });
      if (body.toolName === "createResidentCoordinatedRequestTool") {
        return response({ requestId: "req_1", status: "queued" });
      }
      if (body.toolName === "updateResidentAgentPlanTool") return response({ planId: "plan_1" });
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await runResidentAgent({
      bldgUserId: 1,
      content: "laundry tomorrow and car detail",
      user: completeUser as any,
    });

    expect((result.metadata as any).items.find((item: any) => item.serviceCategory === "car_detail")).toMatchObject({
      status: "pending_operator_review",
    });
  });

  it("keeps successful laundry visible when a coordinated request fails", async () => {
    const { runResidentAgent } = await import("./residentAgent");
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      if (body.toolName === "createResidentAgentPlanTool") return response({ planId: "plan_1" });
      if (body.toolName === "createLaundryOrderTool") return response({ orderId: 456 });
      if (body.toolName === "createResidentCoordinatedRequestTool") {
        return {
          ok: false,
          status: 500,
          text: vi.fn().mockResolvedValue("error"),
        };
      }
      if (body.toolName === "updateResidentAgentPlanTool") return response({ planId: "plan_1" });
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await runResidentAgent({
      bldgUserId: 1,
      content: "laundry tomorrow and car detail",
      user: completeUser as any,
    });

    expect(result.content).toContain("Laundry is booked");
    expect(result.content).toContain("Car detail needs operator review");
    expect((result.metadata as any).items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ serviceCategory: "laundry", status: "confirmed" }),
        expect.objectContaining({ serviceCategory: "car_detail", status: "failed" }),
      ])
    );
  });
});

function response(body: unknown) {
  return {
    ok: true,
    status: 200,
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  };
}
