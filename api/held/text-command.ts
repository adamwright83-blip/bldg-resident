import type { VercelRequest, VercelResponse } from "@vercel/node";

type HeldTextCommandBody = {
  text?: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const rawTranscript = readText(req.body);

    if (!rawTranscript) {
      res.status(400).json({ error: "Text is required." });
      return;
    }

    const parsedIntent = await parseWithAnthropic(rawTranscript).catch(error => {
      console.warn("[HeldTextCommandAPI] Anthropic fallback used", error);
      return fallbackIntent(rawTranscript);
    });

    res.status(200).json({
      rawTranscript,
      displayRequest: parsedIntent.display_request,
      parsedIntent,
      clarificationQuestion: parsedIntent.clarification_question,
      clarificationOptions: parsedIntent.clarification_options,
      needsClarification: parsedIntent.needs_clarification,
    });
  } catch (error) {
    console.error("[HeldTextCommandAPI] text command failed", error);
    res.status(200).json(buildFallbackResponse("Handle this request."));
  }
}

function readText(body: unknown) {
  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body) as HeldTextCommandBody;
      return normalizeText(parsed.text);
    } catch {
      return normalizeText(body);
    }
  }

  if (body && typeof body === "object" && "text" in body) {
    return normalizeText((body as HeldTextCommandBody).text);
  }

  return "";
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

async function parseWithAnthropic(rawTranscript: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      max_tokens: 700,
      messages: [{ role: "user", content: rawTranscript }],
      model: "claude-sonnet-4-5-20250929",
      system:
        "Convert this resident request into the shortest clear command for the YOUR REQUEST card. Preserve service, timing, deadlines, names, locations, and constraints. Return JSON only with display_request, services, needs_clarification, clarification_question, clarification_options.",
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Anthropic failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const content =
    data.content
      ?.filter(block => block.type === "text")
      .map(block => block.text ?? "")
      .join("") ?? "";

  return normalizeIntent(JSON.parse(extractJson(content)));
}

function extractJson(content: string) {
  const trimmed = content.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  return start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
}

function normalizeIntent(value: unknown) {
  const result = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const displayRequest =
    typeof result.display_request === "string"
      ? sentenceCase(result.display_request)
      : fallbackIntent("").display_request;

  return {
    display_request: displayRequest,
    services: Array.isArray(result.services) ? result.services : [],
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

function fallbackIntent(rawTranscript: string) {
  const lower = rawTranscript.toLowerCase();
  const service = detectService(lower);
  const timing = detectTiming(lower);
  const deadline = detectDeadline(lower);
  const needsClarification =
    /\btomorrow\b/i.test(rawTranscript) &&
    !/\btomorrow\s+(morning|afternoon|evening|night)\b/i.test(rawTranscript);

  return {
    display_request: buildDisplayRequest(service, timing, deadline),
    services: [
      {
        constraints: deadline ? [`return by ${deadline}`] : [],
        deadline,
        location: null,
        timing,
        type: service,
      },
    ],
    needs_clarification: needsClarification,
    clarification_question: needsClarification ? "What pickup window works best?" : null,
    clarification_options: needsClarification ? ["8-10 AM", "10-12 PM", "Choose another"] : [],
  };
}

function buildFallbackResponse(rawTranscript: string) {
  const parsedIntent = fallbackIntent(rawTranscript);

  return {
    rawTranscript,
    displayRequest: parsedIntent.display_request,
    parsedIntent,
    clarificationQuestion: parsedIntent.clarification_question,
    clarificationOptions: parsedIntent.clarification_options,
    needsClarification: parsedIntent.needs_clarification,
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
  return null;
}

function detectDeadline(lower: string) {
  const returnBy = lower.match(/\b(?:returned?|done|finished|back)\s+(?:by|before)\s+([a-z]+(?:\s+(?:morning|afternoon|evening|night))?)/);
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
