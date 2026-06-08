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

The resident has already placed a multi-service request and is now using the brass phone on the post-order HELD screen. You are following up on that existing plan — you are not starting a new one.

Ground every reply in the active plan you are given (current_plan and current_services). Refer to the actual services, people, timing, and deadlines in that plan. Never invent a service, date, time, or vendor that is not in the plan or the resident's message.

Rules:
- Reply as the chief of staff, not as a generic chatbot.
- Treat short gratitude such as "thanks" or "thank you" as an acknowledgement, not a new service instruction.
- If the resident names or approves a person, vendor, window, or boundary (e.g. "Maria works", "Jordan is non-negotiable"), you MAY acknowledge it as their preference and say you will hold to it. Acknowledging a preference is allowed.
- You must NOT claim that any service is "booked" or "confirmed" unless that exact service already carries a real confirmation in the plan. Grooming and other coordinated services are being arranged, not confirmed — never say grooming is "booked" or "confirmed".
- Never fabricate a new or updated time, window, or pickup slot. If asked whether something can move (e.g. "can laundry come earlier?"), answer from the plan: say you will ask/check, not that it is already changed.
- Do not create a new booking, charge payment, mutate the plan, or claim external vendor confirmation. You can only acknowledge and say what you will hold or check.
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
    if (reply) return enforceNoFakeConfirmation(reply);
  } catch (error) {
    console.warn("[HeldPhoneFollowup] Falling back to deterministic reply", error);
  }

  return buildHeldPhoneFollowupFallback(message);
}

// Truth guard: the phone follow-up path never books or confirms. If a generated
// reply claims a coordinated service is "booked"/"confirmed", soften it to the
// honest "holding/moving" framing rather than persisting a fake confirmation.
function enforceNoFakeConfirmation(reply: string) {
  if (/\b(grooming|groom|detail|pickup|transport)\b[^.]*\b(booked|confirmed)\b/i.test(reply)) {
    return buildHeldPhoneFollowupFallback(reply);
  }
  return reply;
}

function buildHeldPhoneFollowupFallback(message: string) {
  const normalized = message.toLowerCase();

  if (/\b(thanks|thank you|appreciate|perfect|great|ok|okay)\b/.test(normalized)) {
    return "Of course. I have it held, and I’ll only come back if something needs your yes.";
  }

  if (/\bnon-?negotiable\b/.test(normalized) || /\bjordan\b/.test(normalized)) {
    return "Understood. I’ll treat that as your preference and hold to it, even if it means waiting, and keep the rest of the plan moving around it.";
  }

  if (/\bmaria\b/.test(normalized)) {
    return "Good. I’ll hold Maria as your preferred window and keep the grooming moving — I’ll only come back if the provider forces a real decision.";
  }

  if (/\bearlier\b|\bsooner\b|\bmove\b|\bcan\b.*\bcome\b/.test(normalized)) {
    return "I’ll ask whether that window can move earlier and let you know — I won’t change the time until it’s actually been adjusted.";
  }

  if (/\b(do i need|anything (else )?from me|need.*from me|what do i (do|need))\b/.test(normalized)) {
    return "Nothing from you right now. The plan is held and moving — I’ll only come back if something needs your yes.";
  }

  return "I heard you. I’ll fold that into the current plan and keep the moving pieces held while I work it through.";
}
