/**
 * Tests for the chat router — Zero-Ask Fulfillment.
 *
 * Residents issue intent → app auto-books with defaults → returns confirmation → resident can modify or cancel.
 * No multi-step flows, no questions.
 */
import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the LLM module — returns auto-booking confirmation with metadata markers
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content:
            "Done. Pickup Thursday, Feb 20 7–10 AM. Driver texts 10 min before. Modify / Cancel.\n[SERVICE: laundry]\n[DATE: Thursday, Feb 20]\n[WINDOW: 7–10 AM]\n[RECURRENCE: weekly]",
        },
      },
    ],
  }),
}));

// DB module is mocked below (after other mocks) with comprehensive exports

// Mock booking logic
vi.mock("./bookingLogic", () => ({
  getBookingDefaults: vi.fn().mockResolvedValue({
    date: "Thursday, Feb 20",
    window: "7–10 AM",
    recurrence: "weekly",
  }),
  updatePreferencesFromBooking: vi.fn().mockResolvedValue({ driftDetected: false }),
  normalizeServiceCategory: vi.fn((cat: string) => cat),
  findDuplicateBooking: vi.fn().mockResolvedValue(null),
}));

// Mock owner notification
vi.mock("./ownerNotify", () => ({
  sendOwnerAlert: vi.fn().mockResolvedValue(undefined),
}));

// Mock ops integration
vi.mock("./opsIntegration", () => ({
  createOpsPickup: vi.fn().mockResolvedValue({ success: true }),
  generateVendorPayload: vi.fn(),
}));

// Mock date parser
vi.mock("./lib/dateParser", () => ({
  parseExplicitDateTime: vi.fn().mockReturnValue({
    hasExplicitDate: false,
    dateOverride: null,
    windowOverride: null,
  }),
}));

// Mock upgrades
vi.mock("./upgrades", () => ({
  getUpgradeWhisper: vi.fn().mockReturnValue(null),
}));

// Mock notification
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// Mock onboarding flags
vi.mock("./db", async (importOriginal) => {
  // This re-declaration is needed because vi.mock is hoisted
  return {
    getDb: vi.fn().mockResolvedValue(null),
    upsertUser: vi.fn(),
    getUserByOpenId: vi.fn(),
    upsertBldgUser: vi.fn(),
    getBldgUserByPhone: vi.fn(),
    getBldgUserById: vi.fn().mockResolvedValue(null),
    insertChatMessage: vi.fn().mockResolvedValue({
      id: 1,
      bldgUserId: 1,
      role: "assistant",
      content: "test",
      metadata: null,
      createdAt: new Date(),
    }),
    getChatHistory: vi.fn().mockResolvedValue([]),
    clearChatHistory: vi.fn(),
    createServiceRequest: vi.fn().mockResolvedValue({
      id: 1,
      bldgUserId: 1,
      serviceType: "laundry",
      status: "pending",
      requestSummary: "laundry — Thursday, Feb 20 7–10 AM",
      requestJson: { recurrence: "weekly" },
      scheduledDate: "Thursday, Feb 20",
      scheduledWindow: "7–10 AM",
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    getServiceRequests: vi.fn().mockResolvedValue([]),
    updateServiceRequest: vi.fn().mockResolvedValue({
      id: 1,
      bldgUserId: 1,
      serviceType: "laundry",
      status: "pending",
      requestSummary: "Modified — Friday, Feb 21 9–11 AM",
      requestJson: { recurrence: "weekly" },
      scheduledDate: "Friday, Feb 21",
      scheduledWindow: "9–11 AM",
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    hasShownOnboarding: vi.fn().mockResolvedValue(true),
    markOnboardingShown: vi.fn().mockResolvedValue(undefined),
    updateBldgUser: vi.fn().mockResolvedValue(undefined),
  };
});

function createAnonymousContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ─── Chat router tests ───

describe("chat.getHistory", () => {
  it("returns empty messages and null user for unauthenticated request", async () => {
    const ctx = createAnonymousContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.getHistory();

    expect(result).toEqual({
      messages: [],
      user: null,
      onboardingComplete: false,
    });
  });
});

describe("chat.clearHistory", () => {
  it("throws UNAUTHORIZED for unauthenticated request", async () => {
    const ctx = createAnonymousContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.chat.clearHistory()).rejects.toThrow(
      "No active session"
    );
  });
});

describe("chat.sendMessage", () => {
  it("auto-books a service and returns booking metadata", async () => {
    const ctx = createAnonymousContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.sendMessage({
      content: "I need laundry pickup",
    });

    expect(result).toHaveProperty("role", "assistant");
    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("booking");
    expect(typeof result.content).toBe("string");
    expect(result.content.length).toBeGreaterThan(0);

    // Verify booking metadata is returned
    expect(result.booking).toMatchObject({
      service: "laundry",
      date: "Thursday, Feb 20",
      window: "7–10 AM",
      recurrence: "weekly",
    });

    // Verify confirmation message includes key phrases
    expect(result.content).toContain("Done");
    expect(result.content).toContain("Modify / Cancel");
  });

  it("rejects empty messages", async () => {
    const ctx = createAnonymousContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.chat.sendMessage({ content: "" })
    ).rejects.toThrow();
  });
});
