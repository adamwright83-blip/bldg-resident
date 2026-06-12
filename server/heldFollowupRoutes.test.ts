import { describe, expect, it } from "vitest";
import { mergeFollowupReply, type FollowupReplyPayload } from "./heldFollowupRoutes";

// The exact requestJson shape the postOrderFollowup dispatch path persists.
const EXISTING = {
  recurrence: "weekly",
  clientRequestId: "auto_188_20260612_2968740_laundry",
  followups: [
    {
      type: "return_by_time",
      requestedWindow: "5pm",
      deadline: null,
      operatorTaskId: "41",
      state: "awaiting_operator",
      requestText: "i need my laundry delivered at 5pm though. 7pm is too late.",
      at: "2026-06-12T05:30:00.000Z",
    },
  ],
};

const REPLY: FollowupReplyPayload = {
  bldgUserId: 188,
  orderId: 175,
  operatorTaskId: "41",
  followupType: "return_by_time",
  requestedWindow: "5pm",
  message: "Yes — 5pm works.",
  decision: "approved",
  newPickupTimeWindow: null,
  newDeliveryTimeWindow: "by 5pm",
  repliedAt: "2026-06-12T06:00:00.000Z",
};

describe("mergeFollowupReply", () => {
  it("marks the matching entry answered and attaches the reply", () => {
    const merged = mergeFollowupReply(EXISTING, REPLY);
    const followups = merged.followups as Array<Record<string, unknown>>;
    expect(followups).toHaveLength(1);
    expect(followups[0].state).toBe("answered");
    const reply = followups[0].reply as Record<string, unknown>;
    expect(reply.message).toBe("Yes — 5pm works.");
    expect(reply.decision).toBe("approved");
    expect(reply.newDeliveryTimeWindow).toBe("by 5pm");
  });

  it("NEVER drops existing requestJson keys (clientRequestId, recurrence)", () => {
    const merged = mergeFollowupReply(EXISTING, REPLY);
    expect(merged.clientRequestId).toBe("auto_188_20260612_2968740_laundry");
    expect(merged.recurrence).toBe("weekly");
  });

  it("falls back to the newest awaiting entry of the same type when task id differs", () => {
    const merged = mergeFollowupReply(EXISTING, { ...REPLY, operatorTaskId: "99" });
    const followups = merged.followups as Array<Record<string, unknown>>;
    expect(followups[0].state).toBe("answered");
    expect(followups[0].operatorTaskId).toBe("99");
  });

  it("appends an answered entry when nothing matches at all", () => {
    const merged = mergeFollowupReply(
      { recurrence: "weekly" },
      { ...REPLY, operatorTaskId: "77" },
    );
    const followups = merged.followups as Array<Record<string, unknown>>;
    expect(followups).toHaveLength(1);
    expect(followups[0].state).toBe("answered");
    expect(followups[0].operatorTaskId).toBe("77");
    expect(merged.recurrence).toBe("weekly");
  });

  it("handles requestJson stored as a JSON string", () => {
    const merged = mergeFollowupReply(JSON.stringify(EXISTING), REPLY);
    const followups = merged.followups as Array<Record<string, unknown>>;
    expect(followups[0].state).toBe("answered");
    expect(merged.clientRequestId).toBe("auto_188_20260612_2968740_laundry");
  });
});
