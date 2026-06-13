import { describe, expect, it } from "vitest";
import { classifyPostOrderMessage, isAffirmation } from "./heldPostOrderClassifier";

describe("classifyPostOrderMessage — post-order intent routing", () => {
  it("Case 1: 'cancel' → cancel", () => {
    expect(classifyPostOrderMessage("cancel").intent).toBe("cancel");
    expect(classifyPostOrderMessage("cancel my laundry").intent).toBe("cancel");
    expect(classifyPostOrderMessage("nevermind").intent).toBe("cancel");
    expect(classifyPostOrderMessage("actually cancel this").intent).toBe("cancel");
    expect(classifyPostOrderMessage("i don't need laundry anymore").intent).toBe("cancel");
  });

  it("Case 2: 'clothes back at 5pm … dinner at 6pm' → timing/return_by_time with window + deadline", () => {
    const c = classifyPostOrderMessage(
      "i want my clothes back at 5pm bc i leave for dinner at 6pm. is that possible?",
    );
    expect(c.intent).toBe("timing");
    expect(c.timingKind).toBe("return_by_time");
    expect(c.requestedWindow).toBe("5pm");
    expect(c.deadline).toBe("i leave for dinner at 6pm");
  });

  it("Case 3: 'what time is pickup?' → status (no timing, no horse)", () => {
    expect(classifyPostOrderMessage("what time is pickup?").intent).toBe("status");
    expect(classifyPostOrderMessage("when is it coming back?").intent).toBe("status");
    expect(classifyPostOrderMessage("what's booked?").intent).toBe("status");
    expect(classifyPostOrderMessage("what did i order?").intent).toBe("status");
  });

  it("Case 4: 'also dry clean my jacket' → add_service (new), never modify laundry", () => {
    const c = classifyPostOrderMessage("also dry clean my jacket");
    expect(c.intent).toBe("add_service");
    expect(c.addServiceType).toBe("dry_cleaning");
    expect(classifyPostOrderMessage("book dog grooming too").intent).toBe("add_service");
    expect(classifyPostOrderMessage("can you also detail my car?").intent).toBe("add_service");
  });

  it("Case 5: 'thank you' → free_chat (no horse, no order)", () => {
    expect(classifyPostOrderMessage("thank you").intent).toBe("free_chat");
    expect(classifyPostOrderMessage("how much does this cost?").intent).toBe("free_chat");
    expect(classifyPostOrderMessage("who picks it up?").intent).toBe("free_chat");
  });

  it("capability questions stay helpful instead of active-order fallback copy", () => {
    for (const msg of [
      "What else can I talk to you about other than ordering laundry?",
      "what else can you do?",
      "how does this work?",
      "what services do you support?",
      "what is HELD?",
      "how do receipts work?",
      "how do I message the vendor?",
      "can I ask you questions?",
    ]) {
      expect(classifyPostOrderMessage(msg).intent).toBe("general_capability_question");
    }
  });

  it("Case 6: 'can laundry come back earlier?' → timing", () => {
    const c = classifyPostOrderMessage("can laundry come back earlier?");
    expect(c.intent).toBe("timing");
    expect(c.timingKind).toBe("return_by_time");
  });

  it("LIVE REGRESSION: '…delivered at 5pm though. 7pm is too late.' is TIMING, never add_service", () => {
    // The degree adverb "too" (in "too late") used to match the additive
    // marker, classifying this as a NEW laundry order → full booking ritual
    // replay. It is a delivery-time change on the existing order.
    const c = classifyPostOrderMessage("i need my laundry delivered at 5pm though. 7pm is too late.");
    expect(c.intent).toBe("timing");
    expect(c.timingKind).toBe("return_by_time");
    expect(c.requestedWindow).toBe("5pm");
  });

  it("degree-adverb 'too' is never an add marker; clause-final 'too' still is", () => {
    for (const msg of ["7pm is too late", "that's too early", "it costs too much"]) {
      expect(classifyPostOrderMessage(msg).intent).not.toBe("add_service");
    }
    expect(classifyPostOrderMessage("book dog grooming too").intent).toBe("add_service");
    expect(classifyPostOrderMessage("laundry too.").intent).toBe("add_service");
  });

  it("pickup-time change is detected distinctly", () => {
    const c = classifyPostOrderMessage("move pickup to 7pm");
    expect(c.intent).toBe("timing");
    expect(c.timingKind).toBe("pickup_time_change");
    expect(c.requestedWindow).toBe("7pm");
  });

  it("status questions are not misread as timing changes", () => {
    // No change verb → must stay status, never timing (no operator task / horse).
    expect(classifyPostOrderMessage("when is the pickup").intent).toBe("status");
    expect(classifyPostOrderMessage("when's it coming back").intent).toBe("status");
  });

  it("empty / whitespace → free_chat (safe default)", () => {
    expect(classifyPostOrderMessage("").intent).toBe("free_chat");
    expect(classifyPostOrderMessage("   ").intent).toBe("free_chat");
  });
});

describe("isAffirmation — 'yes' after 'Want me to book one?'", () => {
  it("accepts bare agreement", () => {
    for (const msg of ["yes", "Yes", "yeah", "yep", "sure", "ok", "okay", "yes please", "do it", "go ahead", "book it"]) {
      expect(isAffirmation(msg)).toBe(true);
    }
  });

  it("rejects anything that carries its own intent", () => {
    for (const msg of ["yes cancel it", "no", "yes but later", "can it come earlier?", "thank you", "laundry"]) {
      expect(isAffirmation(msg)).toBe(false);
    }
  });
});
