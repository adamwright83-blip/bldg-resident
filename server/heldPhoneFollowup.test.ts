import { describe, expect, it, vi } from "vitest";
import { buildHeldPhoneFollowupReply } from "./_core/heldPhoneFollowup";

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

describe("buildHeldPhoneFollowupReply", () => {
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
});
