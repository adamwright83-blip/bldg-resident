type HeldIntentService = {
  type: string;
  timing: string | null;
  deadline: string | null;
  location: string | null;
  constraints: string[];
};

export type HeldIntentResult = {
  display_request: string;
  services: HeldIntentService[];
  needs_clarification: boolean;
  clarification_question: string | null;
  clarification_options: string[];
};

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-5-20250929";

const SYSTEM_PROMPT = `Convert this resident's rambling spoken or typed request into the shortest clear command for display in the YOUR REQUEST card.

Rules:
- Do not include filler words.
- Do not include hesitation or uncertainty unless it affects the request.
- Preserve service type, timing, people, location, constraints, deadlines, return-by dates, flight numbers, allergy notes, and other comfort-critical details.
- If the user gave a deadline, include it in display_request.
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

export async function parseHeldCommand(rawText: string): Promise<HeldIntentResult> {
  const transcript = rawText.replace(/\s+/g, " ").trim();
  if (!transcript) return fallbackIntent("");

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        max_tokens: 900,
        messages: [{ role: "user", content: transcript }],
        model: MODEL,
        system: SYSTEM_PROMPT,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Anthropic failed: ${response.status} ${body}`);
    }

    const data = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text =
      data.content
        ?.filter(block => block.type === "text")
        .map(block => block.text ?? "")
        .join("") ?? "";

    return normalizeIntent(JSON.parse(extractJson(text)));
  } catch (error) {
    console.warn("[HeldCommandIntent] fallback parser used", error);
    return fallbackIntent(transcript);
  }
}

function extractJson(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1];

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);

  return trimmed;
}

function normalizeIntent(value: unknown): HeldIntentResult {
  const result = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    display_request:
      typeof result.display_request === "string"
        ? sentenceCase(result.display_request)
        : "",
    services: Array.isArray(result.services)
      ? result.services.map(normalizeService)
      : [],
    needs_clarification: Boolean(result.needs_clarification),
    clarification_question:
      typeof result.clarification_question === "string"
        ? result.clarification_question
        : null,
    clarification_options: Array.isArray(result.clarification_options)
      ? result.clarification_options.filter(
          (option): option is string => typeof option === "string"
        )
      : [],
  };
}

function normalizeService(value: unknown): HeldIntentService {
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

function fallbackIntent(text: string): HeldIntentResult {
  const lower = text.toLowerCase();
  const service = detectService(lower);
  const timing = detectTiming(lower);
  const deadline = detectDeadline(lower);
  const constraints = deadline ? [`return by ${deadline}`] : [];

  return {
    display_request: buildDisplayRequest(service, timing, deadline),
    services: [
      {
        type: service,
        timing,
        deadline,
        location: null,
        constraints,
      },
    ],
    needs_clarification: /\btomorrow\b/i.test(text) && !/\btomorrow\s+(morning|afternoon|evening|night)\b/i.test(text),
    clarification_question:
      /\btomorrow\b/i.test(text) && !/\btomorrow\s+(morning|afternoon|evening|night)\b/i.test(text)
        ? "What pickup window works best?"
        : null,
    clarification_options:
      /\btomorrow\b/i.test(text) && !/\btomorrow\s+(morning|afternoon|evening|night)\b/i.test(text)
        ? ["8-10 AM", "10-12 PM", "Choose another"]
        : [],
  };
}

function detectService(lower: string) {
  if (/\bdry[\s-]?clean|\bsuit|\bdress shirt/.test(lower)) return "dry_cleaning";
  if (/\bdog|groom/.test(lower)) return "dog_grooming";
  if (/\bcar|detail|wash/.test(lower)) return "car_detail";
  if (/\blax|airport|ride|uber/.test(lower)) return "airport_transport";
  if (/\bclean|housekeep|maid/.test(lower)) return "apartment_cleaning";
  if (/\blaundry|clothes|hamper|wash/.test(lower)) return "laundry_pickup";
  return "other";
}

function detectTiming(lower: string) {
  if (/\btomorrow morning\b/.test(lower)) return "tomorrow morning";
  if (/\btomorrow afternoon\b/.test(lower)) return "tomorrow afternoon";
  if (/\btomorrow evening|\btomorrow night\b/.test(lower)) return "tomorrow evening";
  if (/\btonight\b/.test(lower)) return "tonight";
  if (/\btomorrow\b/.test(lower)) return "tomorrow";
  if (/\bthis morning\b/.test(lower)) return "this morning";
  if (/\bthis afternoon\b/.test(lower)) return "this afternoon";
  if (/\bthis evening\b/.test(lower)) return "this evening";
  return null;
}

function detectDeadline(lower: string) {
  const returnBy = lower.match(/\b(?:returned?|return(?:\s+it)?|done|finished|back)\s+(?:by|before)\s+([a-z]+(?:\s+(?:morning|afternoon|evening|night))?)/);
  if (returnBy?.[1]) return returnBy[1];

  const before = lower.match(/\bbefore\s+([a-z]+(?:\s+(?:morning|afternoon|evening|night))?)/);
  return before?.[1] ?? null;
}

function buildDisplayRequest(service: string, timing: string | null, deadline: string | null) {
  const serviceCopy: Record<string, string> = {
    apartment_cleaning: "Clean the apartment",
    airport_transport: "Arrange airport transportation",
    car_detail: "Detail the car",
    dog_grooming: "Book dog grooming",
    dry_cleaning: "Pickup dry cleaning",
    laundry_pickup: "Pickup laundry",
    other: "Handle this request",
  };
  const base = serviceCopy[service] ?? serviceCopy.other;

  if (deadline) return sentenceCase(`${base}${timing ? ` ${timing}` : ""} and have it returned by ${deadline}`);
  if (timing) return sentenceCase(`${base} ${timing}`);
  return sentenceCase(base);
}

function sentenceCase(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return compact;
  const punctuated = /[.!?]$/.test(compact) ? compact : `${compact}.`;
  return punctuated.charAt(0).toUpperCase() + punctuated.slice(1);
}
