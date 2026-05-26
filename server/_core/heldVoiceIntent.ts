import { getCurrentDateISOInLA } from "../lib/dateParser";
import {
  planResidentMultiIntents,
  type ResidentPlannedIntent,
} from "../agents/residentMultiIntentPlanner";
import { invokeLLM } from "./llm";

export type HeldVoiceIntentService = {
  type: string;
  timing: string | null;
  deadline: string | null;
  location: string | null;
  constraints: string[];
};

export type HeldVoiceIntentResult = {
  display_request: string;
  services: HeldVoiceIntentService[];
  needs_clarification: boolean;
  clarification_question: string | null;
  clarification_options: string[];
};

const SYSTEM_PROMPT = `Convert this resident's rambling spoken request into the shortest clear command for display in the YOUR REQUEST card.

Rules:
- Do not include filler words.
- Do not include hesitation or uncertainty unless it affects the request.
- Preserve service type, timing, people, location, constraints, deadlines, return-by dates, flight numbers, allergy notes, and other comfort-critical details.
- If the user gave a deadline, include it in display_request.
- If the user gave multiple services, summarize them in one clean command or structured set of commands.
- If clarification is required before action, return needs_clarification = true with exactly one short clarification question.
- Return JSON only.

Expected JSON shape:
{
  "display_request": "Pickup laundry tomorrow morning and have it returned by Friday morning.",
  "services": [
    {
      "type": "laundry_pickup",
      "timing": "tomorrow morning",
      "deadline": "Friday morning",
      "location": null,
      "constraints": ["return by Friday morning"]
    }
  ],
  "needs_clarification": false,
  "clarification_question": null,
  "clarification_options": []
}`;

export async function parseHeldVoiceIntent(
  rawTranscript: string
): Promise<HeldVoiceIntentResult> {
  const transcript = rawTranscript.replace(/\s+/g, " ").trim();
  if (!transcript) {
    return {
      display_request: "",
      services: [],
      needs_clarification: false,
      clarification_question: null,
      clarification_options: [],
    };
  }

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: transcript },
      ],
    });
    const content = response.choices[0]?.message.content ?? "";
    return normalizeIntentResult(JSON.parse(extractJson(content)));
  } catch (error) {
    console.warn("[HeldVoiceIntent] Falling back to deterministic parser", error);
    return buildFallbackIntent(transcript);
  }
}

function extractJson(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1];

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);

  return trimmed;
}

function normalizeIntentResult(value: unknown): HeldVoiceIntentResult {
  const result = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const services = Array.isArray(result.services)
    ? result.services.map(normalizeService)
    : [];
  const displayRequest =
    typeof result.display_request === "string"
      ? sentenceCaseRequest(result.display_request)
      : "";

  return {
    display_request: displayRequest,
    services,
    needs_clarification: Boolean(result.needs_clarification),
    clarification_question:
      typeof result.clarification_question === "string"
        ? result.clarification_question
        : null,
    clarification_options: Array.isArray(result.clarification_options)
      ? result.clarification_options
          .filter((option): option is string => typeof option === "string")
          .slice(0, 3)
      : [],
  };
}

function normalizeService(value: unknown): HeldVoiceIntentService {
  const service = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    type: typeof service.type === "string" ? service.type : "other",
    timing: typeof service.timing === "string" ? service.timing : null,
    deadline: typeof service.deadline === "string" ? service.deadline : null,
    location: typeof service.location === "string" ? service.location : null,
    constraints: Array.isArray(service.constraints)
      ? service.constraints.filter((item): item is string => typeof item === "string")
      : [],
  };
}

function buildFallbackIntent(transcript: string): HeldVoiceIntentResult {
  const plan = planResidentMultiIntents({
    content: transcript,
    currentDate: getCurrentDateISOInLA(),
  });
  const services = plan.intents.map(intentToService);
  const displayRequest = sentenceCaseRequest(buildFallbackDisplayRequest(transcript, plan.intents));
  const needsClarification = needsTimingClarification(transcript);

  return {
    display_request: displayRequest,
    services,
    needs_clarification: needsClarification,
    clarification_question: needsClarification ? "What pickup window works best?" : null,
    clarification_options: needsClarification ? ["8-10 AM", "10-12 PM", "Choose another"] : [],
  };
}

function intentToService(intent: ResidentPlannedIntent): HeldVoiceIntentService {
  const constraints: string[] = [];
  if (intent.deadlineDate) constraints.push(`deadline ${intent.deadlineDate}`);
  if (intent.deadlineReason) constraints.push(intent.deadlineReason);
  if (intent.notes) constraints.push(intent.notes);

  return {
    type: intent.type,
    timing: intent.requestedWindow ?? intent.requestedDate ?? null,
    deadline: intent.deadlineDate ?? null,
    location: intent.destination ?? intent.origin ?? null,
    constraints,
  };
}

function buildFallbackDisplayRequest(
  transcript: string,
  intents: ResidentPlannedIntent[]
): string {
  const lower = transcript.toLowerCase();
  const service = intents[0]?.type ?? detectServiceType(lower);
  const timing = detectHumanTiming(lower);
  const deadline = detectDeadline(lower);
  const serviceCopy = serviceToDisplay(service);

  if (deadline) {
    return `${serviceCopy}${timing ? ` ${timing}` : ""} and have it returned by ${deadline}.`;
  }

  if (timing) {
    return `${serviceCopy} ${timing}.`;
  }

  return `${serviceCopy}.`;
}

function detectServiceType(lower: string): string {
  if (/\bdry[\s-]?clean|\bsuit|\bdress shirt/.test(lower)) return "dry_cleaning";
  if (/\bdog|groom/.test(lower)) return "dog_grooming";
  if (/\bcar|detail|wash/.test(lower)) return "car_detail";
  if (/\blax|airport|ride|uber/.test(lower)) return "airport_transport";
  if (/\bclean|housekeep|maid/.test(lower)) return "apartment_cleaning";
  if (/\blaundry|clothes|hamper|wash/.test(lower)) return "laundry";
  return "other";
}

function serviceToDisplay(type: string): string {
  const display: Record<string, string> = {
    apartment_cleaning: "Clean the apartment",
    airport_transport: "Arrange airport transportation",
    car_detail: "Detail the car",
    dog_grooming: "Book dog grooming",
    dry_cleaning: "Pickup dry cleaning",
    laundry: "Pickup laundry",
    other: "Handle this request",
  };
  return display[type] ?? display.other;
}

function detectHumanTiming(lower: string): string | null {
  if (/\btomorrow morning\b/.test(lower)) return "tomorrow morning";
  if (/\btomorrow afternoon\b/.test(lower)) return "tomorrow afternoon";
  if (/\btomorrow evening|\btomorrow night\b/.test(lower)) return "tomorrow evening";
  if (/\btonight\b/.test(lower)) return "tonight";
  if (/\btomorrow\b/.test(lower)) return "tomorrow";
  if (/\bthis morning\b/.test(lower)) return "this morning";
  if (/\bthis afternoon\b/.test(lower)) return "this afternoon";
  if (/\bthis evening|\btonight\b/.test(lower)) return "this evening";
  return null;
}

function detectDeadline(lower: string): string | null {
  const returnBy = lower.match(/\b(?:returned?|done|finished|back)\s+(?:by|before)\s+([a-z]+(?:\s+(?:morning|afternoon|evening|night))?)/);
  if (returnBy?.[1]) return returnBy[1];

  const before = lower.match(/\bbefore\s+([a-z]+(?:\s+(?:morning|afternoon|evening|night))?)/);
  if (before?.[1]) return before[1];

  return null;
}

function needsTimingClarification(transcript: string): boolean {
  return /\btomorrow\b/i.test(transcript) && !/\btomorrow\s+(morning|afternoon|evening|night)\b/i.test(transcript);
}

function sentenceCaseRequest(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return compact;
  const punctuated = /[.!?]$/.test(compact) ? compact : `${compact}.`;
  return punctuated.charAt(0).toUpperCase() + punctuated.slice(1);
}
