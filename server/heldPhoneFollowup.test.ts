import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { buildHeldPhoneFollowupReply } from "./_core/heldPhoneFollowup";

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

const ACTIVE_PLAN = {
  displayRequest: "Pickup laundry before Saturday and book Theo's grooming.",
  services: [
    { type: "laundry_pickup" as const, timing: "Saturday", deadline: "Saturday" },
    { type: "dog_grooming" as const, timing: "Saturday 11", deadline: null },
  ],
};

const BOOKED_OR_CONFIRMED = /\b(booked|confirmed)\b/i;

describe("buildHeldPhoneFollowupReply — v1 reply-only phone follow-up", () => {
  it("treats gratitude as acknowledgement when the LLM is unavailable", async () => {
    const { invokeLLM } = await import("./_core/llm");
    vi.mocked(invokeLLM).mockRejectedValueOnce(new Error("missing key"));

    const reply = await buildHeldPhoneFollowupReply({
      displayRequest: "Pickup laundry and book Theo's grooming.",
      message: "thank you",
      previousMessages: ["i want jordan. i dont care if i have to wait"],
      services: [{ type: "laundry_pickup" }, { type: "dog_grooming" }],
    });

    expect(reply).toContain("Of course");
    expect(reply).not.toContain("next instruction");
  });

  // Test 1: "Maria works" -> chief-of-staff reply, never booked/confirmed.
  it('1) "Maria works" returns a chief-of-staff reply and does not say booked/confirmed', async () => {
    const { invokeLLM } = await import("./_core/llm");
    vi.mocked(invokeLLM).mockRejectedValueOnce(new Error("offline"));

    const reply = await buildHeldPhoneFollowupReply({
      ...ACTIVE_PLAN,
      message: "Maria works.",
    });

    expect(reply).toMatch(/Maria/i);
    expect(reply).not.toMatch(BOOKED_OR_CONFIRMED);
    // Chief-of-staff voice: holds and stays out of the way.
    expect(reply).toMatch(/hold|keep|moving|come back/i);
  });

  // Test 2: "Jordan is non-negotiable" -> treated as preference, no fake confirmation.
  it('2) "Jordan is non-negotiable" treats Jordan as a preference without faking confirmation', async () => {
    const { invokeLLM } = await import("./_core/llm");
    vi.mocked(invokeLLM).mockRejectedValueOnce(new Error("offline"));

    const reply = await buildHeldPhoneFollowupReply({
      ...ACTIVE_PLAN,
      message: "Jordan is non-negotiable.",
    });

    expect(reply).toMatch(/preference|hold/i);
    expect(reply).not.toMatch(BOOKED_OR_CONFIRMED);
  });

  // Test 3: "Can laundry come earlier?" -> answers from plan, no fabricated new time.
  it('3) "Can laundry come earlier?" answers from plan context without faking an updated pickup time', async () => {
    const { invokeLLM } = await import("./_core/llm");
    vi.mocked(invokeLLM).mockRejectedValueOnce(new Error("offline"));

    const reply = await buildHeldPhoneFollowupReply({
      ...ACTIVE_PLAN,
      message: "Can laundry come earlier?",
    });

    // Promises to check/ask, does not assert the time is already changed.
    expect(reply).toMatch(/ask|check|let you know|won.t change/i);
    expect(reply).not.toMatch(BOOKED_OR_CONFIRMED);
    // No fabricated concrete new pickup time.
    expect(reply).not.toMatch(/\b\d{1,2}(:\d{2})?\s*(am|pm)\b/i);
  });

  // Test 4: "Do I need to do anything?" -> reassurance grounded in current plan.
  it('4) "Do I need to do anything?" returns reassurance grounded in the current plan', async () => {
    const { invokeLLM } = await import("./_core/llm");
    vi.mocked(invokeLLM).mockRejectedValueOnce(new Error("offline"));

    const reply = await buildHeldPhoneFollowupReply({
      ...ACTIVE_PLAN,
      message: "Do I need to do anything?",
    });

    expect(reply).toMatch(/nothing|held|moving|come back/i);
    expect(reply).not.toMatch(BOOKED_OR_CONFIRMED);
  });

  // Truth guard: even if the model claims grooming is "booked", it is softened.
  it("softens a model reply that wrongly claims grooming is booked/confirmed", async () => {
    const { invokeLLM } = await import("./_core/llm");
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [
        { message: { role: "assistant", content: "Theo's grooming is confirmed for Saturday." } },
      ],
    } as any);

    const reply = await buildHeldPhoneFollowupReply({
      ...ACTIVE_PLAN,
      message: "Maria works.",
    });

    expect(reply).not.toMatch(BOOKED_OR_CONFIRMED);
  });

  // Guard scope: "Maria works" must never produce a grooming booked/confirmed claim,
  // whether the model is offline or it tries to assert a fake grooming confirmation.
  it('"Maria works" never reports grooming as booked/confirmed', async () => {
    const { invokeLLM } = await import("./_core/llm");
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [
        { message: { role: "assistant", content: "Done — Theo's grooming is booked for Saturday." } },
      ],
    } as any);

    const reply = await buildHeldPhoneFollowupReply({
      ...ACTIVE_PLAN,
      message: "Maria works.",
    });

    expect(reply).not.toMatch(/\bgrooming\b[^.]*\b(booked|confirmed)\b/i);
    expect(reply).not.toMatch(BOOKED_OR_CONFIRMED);
  });

  // Narrowed guard: a real laundry-pickup confirmation carried by the active plan
  // is NOT downgraded by the truth guard (pickup is no longer blanket-blocked).
  it("does not downgrade a valid laundry pickup confirmation from the active plan", async () => {
    const { invokeLLM } = await import("./_core/llm");
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [
        {
          message: {
            role: "assistant",
            content: "Your laundry pickup is confirmed for Saturday.",
          },
        },
      ],
    } as any);

    const reply = await buildHeldPhoneFollowupReply({
      displayRequest: "Pickup laundry before Saturday.",
      message: "Is laundry pickup set?",
      services: [
        {
          type: "laundry_pickup",
          timing: "Saturday",
          deadline: "Saturday",
          orderId: "ord_laundry_123",
          status: "confirmed",
        },
      ],
    });

    // The legitimate pickup confirmation survives untouched.
    expect(reply).toBe("Your laundry pickup is confirmed for Saturday.");
    expect(reply).toMatch(/laundry pickup is confirmed/i);
  });

  it("acknowledges a preference grounded in the plan when the model is available", async () => {
    const { invokeLLM } = await import("./_core/llm");
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [
        {
          message: {
            role: "assistant",
            content:
              "Good. I'll hold Maria for Saturday at 11 and keep Theo's grooming moving. I'll only come back if the provider forces a real decision.",
          },
        },
      ],
    } as any);

    const reply = await buildHeldPhoneFollowupReply({
      ...ACTIVE_PLAN,
      message: "Maria works.",
    });

    expect(reply).toMatch(/Maria/);
    expect(reply).toMatch(/Theo/);
    expect(reply).not.toMatch(BOOKED_OR_CONFIRMED);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// UI structure guards: the phone follow-up stays a single composer line and a
// streamed reply — not a chat transcript. These assert on the component source
// (the project's established pattern; no browser automation).
// ───────────────────────────────────────────────────────────────────────────
const penPull = readFileSync(
  join(__dirname, "../client/src/components/held/PenPullPrototype.tsx"),
  "utf-8"
);

describe("HELD phone composer UI structure", () => {
  // Test 5: UI does not become chat bubbles.
  it("5) renders a single composer input + streamed reply, not chat bubbles", () => {
    // Composer is one input wired to the existing submit path.
    expect(penPull).toContain('onSubmit={submitFollowup}');
    expect(penPull).toContain('id="held-phone-followup"');
    // Reply is a single streamed PlanLine, not a list/transcript of messages.
    expect(penPull).toContain("phoneReply");
    expect(penPull).not.toMatch(/\.map\(\s*\([^)]*\)\s*=>[^]*?(bubble|message-bubble|ChatBubble)/i);
    // No chat-bubble class names or sender/timestamp scaffolding in the phone UI.
    expect(penPull).not.toMatch(/chat-bubble|ChatBubble|message-row|sender-label/i);
  });

  // Test 6: keyboard opens only after composer focus (no auto-open keyboard).
  it("6) phone composer keyboard glyph is gated on composer focus state", () => {
    // The listening glyph (keyboard affordance) only shows when NOT focused,
    // and focus state is driven by the input's onFocus/onBlur — i.e. the
    // composer must be focused before the typing surface is active.
    expect(penPull).toContain("setIsComposerFocused(true)");
    expect(penPull).toContain("setIsComposerFocused(false)");
    expect(penPull).toMatch(/onFocus=\{\(\) => setIsComposerFocused\(true\)\}/);
  });

  // Test 7: protected files (phone follow-up path) stay local/reactive in the
  // post-order demo and never call the forbidden /api/held/text-command route.
  it("7) follow-up submits through local reactive plan logic, not text-command", () => {
    expect(penPull).toContain("buildReactivePhoneFollowup");
    expect(penPull).toContain("setPhoneReply(followup.reply)");
    expect(penPull).toContain("submitFollowupValue");
    // The follow-up submit handler must not call the text-command route.
    const followupRegion = penPull.slice(
      penPull.indexOf("const submitFollowupValue"),
      penPull.indexOf("const startTokenPress")
    );
    expect(followupRegion).not.toContain("text-command");
    expect(followupRegion).not.toContain("/api/held/phone-followup");
  });
});
