import { invokeLLM } from "./llm";

export type HeldPhoneFollowupService = {
  type: string;
  timing?: string | null;
  deadline?: string | null;
};

export type HeldPhoneFollowupInput = {
  displayRequest?: string;
  message: string;
  previousMessages?: string[];
  services?: HeldPhoneFollowupService[];
};

const SYSTEM_PROMPT = `You are Held, a quiet chief of staff inside a resident services app.

The resident has already placed a service request and is now using the brass phone on the post-order HELD screen.

Rules:
- Reply as the chief of staff, not as a generic chatbot.
- Treat short gratitude such as "thanks" or "thank you" as an acknowledgement, not a new service instruction.
- If the resident changes a constraint, preference, person, vendor, timing, or boundary, acknowledge the change and state what you will hold.
- Do not create a new booking, charge payment, or claim external vendor confirmation.
- Do not ask a follow-up unless the resident's message truly requires a yes/no or missing detail.
- Keep the reply to 1-2 concise sentences.
- Return plain text only.`;

export async function buildHeldPhoneFollowupReply(input: HeldPhoneFollowupInput) {
  const message = input.message.replace(/\s+/g, " ").trim();
  if (!message) return "";

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            current_plan: input.displayRequest?.trim() || null,
            current_services: input.services ?? [],
            prior_phone_messages: input.previousMessages ?? [],
            resident_message: message,
          }),
        },
      ],
    });

    const reply = response.choices[0]?.message.content?.replace(/\s+/g, " ").trim();
    if (reply) return reply;
  } catch (error) {
    console.warn("[HeldPhoneFollowup] Falling back to deterministic reply", error);
  }

  return buildHeldPhoneFollowupFallback(message);
}

function buildHeldPhoneFollowupFallback(message: string) {
  const normalized = message.toLowerCase();

  if (/\b(thanks|thank you|appreciate|perfect|great|ok|okay)\b/.test(normalized)) {
    return "Of course. I have it held, and I’ll only come back if something needs your yes.";
  }

  if (/\bjordan\b/.test(normalized)) {
    return "Understood. I’ll hold for Jordan, even if that means waiting, and keep the rest of the plan moving around that preference.";
  }

  if (/\bmaria\b/.test(normalized)) {
    return "Got it. I’ll keep Maria as the working option and only come back if that window needs your approval.";
  }

  return "I heard you. I’ll fold that into the current plan and keep the moving pieces held while I work it through.";
}
