import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

const canonicalMessage =
  "I need a dog groomer before my mother-in-law visits in three days, a car detail, an LAX pickup to Opus, and laundry tomorrow.";

describe("runResidentAgent multi-intent orchestration", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-15T19:00:00.000Z"));
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

  it("passes in two days as Sunday May 17 to the laundry booking path", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-15T19:00:00.000Z"));
    const { runResidentAgent } = await import("./residentAgent");
    const fetchMock = vi.fn().mockResolvedValue(response({ orderId: 456 }));
    vi.stubGlobal("fetch", fetchMock);

    await runResidentAgent({
      bldgUserId: 1,
      content: "do my laundry in two days",
      user: completeUser as any,
    });

    expect(bookingMocks.getBookingDefaults).toHaveBeenCalledWith(
      1,
      "laundry",
      "Sunday, May 17",
      "7–10 AM",
      "2026-05-17"
    );
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

  it("treats HELD launch laundry as a fresh order even when an existing laundry booking exists", async () => {
    bookingMocks.findDuplicateBooking.mockResolvedValue({ id: 44 });
    const { runResidentAgent } = await import("./residentAgent");
    const fetchMock = vi.fn().mockResolvedValue(response({ orderId: 456 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await runResidentAgent({
      bldgUserId: 1,
      content: "pickup laundry tomorrow",
      orderMode: "new_order",
      source: "held",
      user: completeUser as any,
    });

    expect(result.handled).toBe(true);
    expect(result.content).toBe("I have laundry booked with LAUNDRY BUTLER.");
    expect(bookingMocks.findDuplicateBooking).not.toHaveBeenCalled();
    expect(dbMocks.createServiceRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        bldgUserId: 1,
        serviceType: "laundry",
        status: "pending",
      })
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.toolName).toBe("createLaundryOrderTool");
    expect(body.input.externalId).toBe("bldg-sr-99");
  });

  it("creates all four canonical child actions and separates confirmed from queued", async () => {
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
      content: canonicalMessage,
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
    expect(toolCalls.filter((call) => call.toolName === "createResidentCoordinatedRequestTool").map((call) => call.input.serviceCategory)).toEqual([
      "dog_grooming",
      "car_detail",
      "airport_transport",
    ]);
    expect(toolCalls.find((call) => call.input.serviceCategory === "airport_transport")?.input).toMatchObject({
      origin: "LAX",
      destination: "Opus LA",
    });
    expect(toolCalls.some((call) => call.toolName === "createLaundryOrderTool" && call.input.serviceCategory)).toBe(false);
    expect(toolCalls[5].input.planStatus).toBe("partially_confirmed");

    expect(result.content).toContain("Laundry is booked");
    expect(result.content).toContain("I'm lining up grooming, car detail, and LAX pickup");
    expect(result.content).toContain("without needing you again");
    expect(result.content).toContain("Confirmed:");
    expect(result.content).toContain("Queued:");
    expect(result.content).not.toContain("Request received");
    expect(result.content).not.toMatch(/grooming.*\bbooked\b|grooming.*\bconfirmed\b/i);
    expect(result.metadata).toMatchObject({
      type: "multi_service_plan",
      planId: "plan_1",
    });
    const items = (result.metadata as any).items;
    expect(items.find((item: any) => item.serviceCategory === "laundry")).toMatchObject({
      status: "confirmed",
      orderId: 456,
    });
    expect(items.find((item: any) => item.serviceCategory === "dog_grooming")).toMatchObject({
      status: "pending_provider_confirmation",
      requestId: "req_dog_grooming",
      deadlineDate: "2026-05-18",
      deadlineReason: "mother-in-law visit",
    });
    expect(items.find((item: any) => item.serviceCategory === "car_detail")).toMatchObject({
      status: "pending_provider_confirmation",
      requestId: "req_car_detail",
      deadlineDate: "2026-05-18",
    });
    expect(items.find((item: any) => item.serviceCategory === "airport_transport")).toMatchObject({
      status: "pending_provider_confirmation",
      requestId: "req_airport_transport",
      origin: "LAX",
      destination: "Opus LA",
    });
  });

  it("handles the TechCrunch demo sentence: laundry booked + Theo grooming coordinated, never booked", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-06T19:00:00.000Z"));
    const { runResidentAgent } = await import("./residentAgent");
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      if (body.toolName === "createResidentAgentPlanTool") return response({ planId: "plan_demo" });
      if (body.toolName === "createLaundryOrderTool") return response({ orderId: 777 });
      if (body.toolName === "createResidentCoordinatedRequestTool") {
        return response({
          requestId: `req_${body.input.serviceCategory}`,
          status: "pending_provider_confirmation",
          residentVisibleStatus: "pending_provider_confirmation",
          nextAction: "provider_confirmation",
        });
      }
      if (body.toolName === "updateResidentAgentPlanTool") return response({ planId: body.input.planId });
      throw new Error(`unexpected tool ${body.toolName}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await runResidentAgent({
      bldgUserId: 1,
      content:
        "My wife's mother is coming over Sunday. I need my laundry done before she gets here and Theo groomed.",
      user: completeUser as any,
    });

    const toolCalls = fetchMock.mock.calls.map((call) => JSON.parse(call[1].body));
    expect(toolCalls.filter((c) => c.toolName === "createResidentCoordinatedRequestTool").map((c) => c.input.serviceCategory)).toEqual([
      "dog_grooming",
    ]);
    const grooming = toolCalls.find((c) => c.input?.serviceCategory === "dog_grooming");
    // Grooming gets a concrete date BEFORE the guest arrives: the Saturday
    // (2026-06-06) before the Sunday (2026-06-07) visit, with its default
    // window — while the Sunday deadline rides separately.
    expect(grooming.input).toMatchObject({
      dogName: "Theo",
      guestRelation: "wife's mother",
      requestedDate: "2026-06-06",
      requestedWindow: "10am–1pm",
      deadlineDate: "2026-06-07",
      deadlineReason: "wife's mother visit",
    });

    expect(result.content).toContain("Laundry is booked");
    expect(result.content).toMatch(/lining up grooming/i);
    // Truth rule: grooming is never "booked" or "confirmed" in resident copy.
    expect(result.content).not.toMatch(/grooming[^.]*\b(booked|confirmed)\b/i);

    const items = (result.metadata as any).items;
    // Laundry is booked AND carries the before-arrival deadline as structured
    // data backing the "back before she arrives" copy.
    expect(items.find((i: any) => i.serviceCategory === "laundry")).toMatchObject({
      status: "confirmed",
      orderId: 777,
      deadlineDate: "2026-06-07",
      deadlineReason: "wife's mother visit",
    });
    expect(items.find((i: any) => i.serviceCategory === "dog_grooming")).toMatchObject({
      status: "pending_provider_confirmation",
      requestId: "req_dog_grooming",
      date: "2026-06-06",
      window: "10am–1pm",
      deadlineDate: "2026-06-07",
      deadlineReason: "wife's mother visit",
    });
  });

  it("multi-intent laundry sends the same admin-visible payload fields as single laundry", async () => {
    const { runResidentAgent } = await import("./residentAgent");
    const fetchMock = vi.fn().mockResolvedValue(response({ orderId: 456 }));
    vi.stubGlobal("fetch", fetchMock);

    await runResidentAgent({
      bldgUserId: 1,
      content: "do my laundry tomorrow",
      user: completeUser as any,
    });
    const singleLaundryBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    fetchMock.mockClear();
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      if (body.toolName === "createResidentAgentPlanTool") return response({ planId: "plan_1" });
      if (body.toolName === "createLaundryOrderTool") return response({ orderId: 789 });
      if (body.toolName === "createResidentCoordinatedRequestTool") {
        return response({ requestId: "req_1", status: "pending_operator_review" });
      }
      if (body.toolName === "updateResidentAgentPlanTool") return response({ planId: "plan_1" });
      return response({});
    });

    await runResidentAgent({
      bldgUserId: 1,
      content: "laundry tomorrow and car detail",
      user: completeUser as any,
    });
    const multiLaundryBody = fetchMock.mock.calls
      .map((call) => JSON.parse(call[1].body))
      .find((body) => body.toolName === "createLaundryOrderTool");

    expect(multiLaundryBody.input).toMatchObject({
      source: singleLaundryBody.input.source,
      status: "new",
      serviceType: singleLaundryBody.input.serviceType,
      pickupDate: singleLaundryBody.input.pickupDate,
      pickupWindow: singleLaundryBody.input.pickupWindow,
      pickupWindowStart: singleLaundryBody.input.pickupWindowStart,
      pickupWindowEnd: singleLaundryBody.input.pickupWindowEnd,
      buildingSlug: singleLaundryBody.input.buildingSlug,
      unit: singleLaundryBody.input.unit,
      firstName: singleLaundryBody.input.firstName,
      lastName: singleLaundryBody.input.lastName,
      phone: singleLaundryBody.input.phone,
    });
  });

  it("does not mark coordinated services queued unless admin returns a pending status", async () => {
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

    expect(result.content).not.toContain("Car detail is queued");
    expect((result.metadata as any).items.find((item: any) => item.serviceCategory === "car_detail")).toMatchObject({
      status: "failed",
      requestId: "req_1",
      failureReason: "invalid_or_missing_status",
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

  it("does not call laundry booked when admin orderId is missing", async () => {
    const { runResidentAgent } = await import("./residentAgent");
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      if (body.toolName === "createResidentAgentPlanTool") return response({ planId: "plan_1" });
      if (body.toolName === "createLaundryOrderTool") return response({});
      if (body.toolName === "createResidentCoordinatedRequestTool") {
        return response({
          requestId: "req_car_detail",
          status: "pending_operator_review",
          residentVisibleStatus: "pending_operator_review",
        });
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

    expect(result.content).not.toContain("Laundry is booked");
    expect(result.content).toContain("I'm lining up car detail");
    expect(result.content).toContain("Laundry needs operator review");
    expect((result.metadata as any).items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ serviceCategory: "laundry", status: "failed", orderId: null }),
        expect.objectContaining({
          serviceCategory: "car_detail",
          status: "pending_operator_review",
          requestId: "req_car_detail",
        }),
      ])
    );
  });

  it("does not call coordinated services queued when admin requestId is missing", async () => {
    const { runResidentAgent } = await import("./residentAgent");
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      if (body.toolName === "createResidentAgentPlanTool") return response({ planId: "plan_1" });
      if (body.toolName === "createLaundryOrderTool") return response({ orderId: 456 });
      if (body.toolName === "createResidentCoordinatedRequestTool") {
        return response({ status: "pending_operator_review" });
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
    expect(result.content).not.toContain("Car detail is queued");
    expect(result.content).toContain("Car detail needs operator review");
    expect((result.metadata as any).items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ serviceCategory: "laundry", status: "confirmed", orderId: 456 }),
        expect.objectContaining({ serviceCategory: "car_detail", status: "failed" }),
      ])
    );
  });

  it("payment-only profile gap preserves laundry and still attempts all coordinated services", async () => {
    dbMocks.getBldgUserById.mockResolvedValue({
      ...completeUser,
      paymentMethodSaved: 0,
      stripePaymentMethodId: null,
    });
    const { runResidentAgent } = await import("./residentAgent");
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      if (body.toolName === "createResidentAgentPlanTool") return response({ planId: "plan_1" });
      if (body.toolName === "createResidentCoordinatedRequestTool") {
        return response({
          requestId: `req_${body.input.serviceCategory}`,
          status: "pending_operator_review",
          residentVisibleStatus: "pending_operator_review",
        });
      }
      if (body.toolName === "updateResidentAgentPlanTool") return response({ planId: "plan_1" });
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await runResidentAgent({
      bldgUserId: 1,
      content: canonicalMessage,
      user: completeUser as any,
    });

    const toolCalls = fetchMock.mock.calls.map((call) => JSON.parse(call[1].body));
    expect(toolCalls.map((call) => call.toolName)).toEqual([
      "createResidentAgentPlanTool",
      "createResidentCoordinatedRequestTool",
      "createResidentCoordinatedRequestTool",
      "createResidentCoordinatedRequestTool",
      "updateResidentAgentPlanTool",
    ]);
    expect(result.collectStep).toBe("payment");
    expect(result.content).toContain("I'm lining up grooming, car detail, and LAX pickup");
    expect(result.content).toContain("Laundry needs payment details");
    expect(dbMocks.updateBldgUser).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        pendingBookingIntentJson: expect.objectContaining({
          type: "multi_service_plan",
          intents: expect.arrayContaining([
            expect.objectContaining({ type: "laundry" }),
            expect.objectContaining({ type: "car_detail" }),
            expect.objectContaining({ type: "airport_transport" }),
          ]),
        }),
      })
    );
  });

  it("basic profile gap preserves the full multi-intent plan without dropping non-laundry items", async () => {
    dbMocks.getBldgUserById.mockResolvedValue({
      ...completeUser,
      firstName: null,
      lastName: null,
      unit: null,
      paymentMethodSaved: 0,
      stripePaymentMethodId: null,
    });
    const { runResidentAgent } = await import("./residentAgent");
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      if (body.toolName === "createResidentAgentPlanTool") return response({ planId: "plan_1" });
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await runResidentAgent({
      bldgUserId: 1,
      content: canonicalMessage,
      user: completeUser as any,
    });

    expect(result.collectStep).toBe("name");
    expect(result.content).toContain("I have the full plan");
    expect(result.content).toContain("without making you repeat this");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(dbMocks.updateBldgUser).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        pendingBookingIntentJson: expect.objectContaining({
          type: "multi_service_plan",
          intents: expect.arrayContaining([
            expect.objectContaining({ type: "laundry" }),
            expect.objectContaining({ type: "dog_grooming" }),
            expect.objectContaining({ type: "car_detail" }),
            expect.objectContaining({ type: "airport_transport" }),
          ]),
        }),
      })
    );
  });

  it("resumes a preserved multi-intent plan after profile completion", async () => {
    const pendingIntents = [
      { id: "intent_1", type: "laundry", confidence: 0.93, originalTextSpan: "laundry tomorrow", requestedDate: "2026-05-16" },
      { id: "intent_2", type: "dog_grooming", confidence: 0.9, originalTextSpan: "dog groomer", deadlineDate: "2026-05-18", deadlineReason: "mother-in-law visit" },
      { id: "intent_3", type: "car_detail", confidence: 0.88, originalTextSpan: "car detail", deadlineDate: "2026-05-18", deadlineReason: "mother-in-law visit" },
      { id: "intent_4", type: "airport_transport", confidence: 0.9, originalTextSpan: "LAX pickup to Opus", deadlineDate: "2026-05-18", deadlineReason: "mother-in-law visit", origin: "LAX", destination: "Opus LA" },
    ];
    dbMocks.getBldgUserById.mockResolvedValue({
      ...completeUser,
      pendingBookingIntentJson: {
        type: "multi_service_plan",
        originalMessage: canonicalMessage,
        intents: pendingIntents,
      },
    });
    const { runResidentAgent } = await import("./residentAgent");
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      if (body.toolName === "createResidentAgentPlanTool") return response({ planId: "plan_1" });
      if (body.toolName === "createLaundryOrderTool") return response({ orderId: 456 });
      if (body.toolName === "createResidentCoordinatedRequestTool") {
        return response({ requestId: `req_${body.input.serviceCategory}`, status: "pending_operator_review" });
      }
      if (body.toolName === "updateResidentAgentPlanTool") return response({ planId: "plan_1" });
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await runResidentAgent({
      bldgUserId: 1,
      content: "done",
      user: completeUser as any,
    });

    expect(dbMocks.updateBldgUser).toHaveBeenCalledWith(1, { pendingBookingIntentJson: null });
    expect(fetchMock.mock.calls.map((call) => JSON.parse(call[1].body).toolName)).toEqual([
      "createResidentAgentPlanTool",
      "createLaundryOrderTool",
      "createResidentCoordinatedRequestTool",
      "createResidentCoordinatedRequestTool",
      "createResidentCoordinatedRequestTool",
      "updateResidentAgentPlanTool",
    ]);
    expect(result.content).toContain("Laundry is booked");
    expect(result.content).toContain("I'm lining up grooming, car detail, and LAX pickup");
  });
});

function response(body: unknown) {
  return {
    ok: true,
    status: 200,
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  };
}
