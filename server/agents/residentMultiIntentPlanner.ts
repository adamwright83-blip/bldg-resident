import { parseRelativeDateToISO, parseRequestedWindow } from "../lib/dateParser";

export type ResidentMultiIntentType =
  | "laundry"
  | "dry_cleaning"
  | "dog_grooming"
  | "car_detail"
  | "airport_transport"
  | "apartment_cleaning"
  | "other";

export interface ResidentMultiIntentPlannerInput {
  content: string;
  currentDate: string;
  buildingSlug?: string | null;
  buildingName?: string | null;
  unit?: string | null;
}

export interface ResidentPlannedIntent {
  id: string;
  type: ResidentMultiIntentType;
  confidence: number;
  originalTextSpan: string;
  requestedDate?: string | null;
  requestedWindow?: string | null;
  deadlineDate?: string | null;
  deadlineReason?: string | null;
  origin?: string | null;
  destination?: string | null;
  notes?: string | null;
}

export interface ResidentMultiIntentPlan {
  intents: ResidentPlannedIntent[];
}

const SERVICE_PATTERNS: Array<{
  type: ResidentMultiIntentType;
  confidence: number;
  patterns: RegExp[];
}> = [
  {
    type: "laundry",
    confidence: 0.93,
    patterns: [/\blaundry\b/i, /\bwash\s*(?:&|and)\s*fold\b/i, /\bclothes\b/i, /\bhamper\b/i],
  },
  {
    type: "dry_cleaning",
    confidence: 0.88,
    patterns: [/\bdry[\s-]?clean(?:ing)?\b/i, /\bsuit\b/i, /\bdress shirt\b/i, /\bgarments?\b/i],
  },
  {
    type: "dog_grooming",
    confidence: 0.9,
    patterns: [
      /\bdog groomer\b/i,
      /\bdog grooming\b/i,
      /\bpet grooming\b/i,
      /\bgroom my dog\b/i,
      /\bgrooming appointment\b/i,
    ],
  },
  {
    type: "car_detail",
    confidence: 0.88,
    patterns: [/\bcar detail\b/i, /\bauto detail\b/i, /\bdetailing\b/i, /\bcar wash\b/i, /\bwash my car\b/i],
  },
  {
    type: "airport_transport",
    confidence: 0.9,
    patterns: [
      /\buber\b/i,
      /\bride\b/i,
      /\bcar to airport\b/i,
      /\bairport pickup\b/i,
      /\bairport dropoff\b/i,
      /\blax\b/i,
      /\bpick (?:her|him|them) up from lax\b/i,
    ],
  },
  {
    type: "apartment_cleaning",
    confidence: 0.86,
    patterns: [
      /\bapartment cleaning\b/i,
      /\bhousekeeper\b/i,
      /\bclean my apartment\b/i,
      /\bmaid\b/i,
      /\bcleaning service\b/i,
    ],
  },
];

const GUEST_PREP_PATTERNS = [
  /\bmother-in-law\b/i,
  /\bparents visiting\b/i,
  /\bguest coming\b/i,
  /\bguests arrive\b/i,
  /\bbefore she visits\b/i,
  /\bbefore he visits\b/i,
  /\bbefore they visit\b/i,
];

export function planResidentMultiIntents(
  input: ResidentMultiIntentPlannerInput
): ResidentMultiIntentPlan {
  const normalized = input.content.replace(/\s+/g, " ").trim();
  if (!normalized) return { intents: [] };

  const globalDeadlineDate = extractGuestPrepDeadline(normalized, input.currentDate);
  const deadlineReason = extractDeadlineReason(normalized);
  const clauses = splitIntoClauses(normalized);
  const intents: ResidentPlannedIntent[] = [];

  for (const service of SERVICE_PATTERNS) {
    const match = findServiceMatch(normalized, clauses, service.patterns);
    if (!match) continue;

    const span = match.span;
    const spanDate = parseRelativeDateToISO(span, input.currentDate);
    const requestedWindow = parseRequestedWindow(span);
    const isGuestPrepService =
      service.type === "dog_grooming" ||
      service.type === "car_detail" ||
      service.type === "airport_transport" ||
      service.type === "apartment_cleaning";
    const deadlineDate = isGuestPrepService && globalDeadlineDate ? globalDeadlineDate : null;

    const airportRoute =
      service.type === "airport_transport" ? extractAirportRoute(normalized, input) : {};

    intents.push({
      id: `intent_${intents.length + 1}`,
      type: service.type,
      confidence: service.confidence,
      originalTextSpan: span,
      requestedDate: deadlineDate ? null : spanDate,
      requestedWindow,
      deadlineDate,
      deadlineReason: deadlineDate ? deadlineReason : null,
      origin: airportRoute.origin ?? null,
      destination: airportRoute.destination ?? null,
      notes: buildNotes(service.type, normalized, deadlineReason),
    });
  }

  if (intents.length === 0 && GUEST_PREP_PATTERNS.some((pattern) => pattern.test(normalized))) {
    intents.push({
      id: "intent_1",
      type: "other",
      confidence: 0.55,
      originalTextSpan: normalized,
      deadlineDate: globalDeadlineDate,
      deadlineReason,
      notes: "Guest preparation request.",
    });
  }

  return { intents: intents.sort((a, b) => normalized.indexOf(a.originalTextSpan) - normalized.indexOf(b.originalTextSpan)) };
}

function splitIntoClauses(text: string): string[] {
  return text
    .split(/\s*(?:,|;|\band\b|\boh and\b|\bthen\b)\s*/i)
    .map((clause) => clause.trim())
    .filter(Boolean);
}

function findServiceMatch(
  fullText: string,
  clauses: string[],
  patterns: RegExp[]
): { span: string } | null {
  for (const clause of clauses) {
    if (patterns.some((pattern) => pattern.test(clause))) return { span: clause };
  }
  if (patterns.some((pattern) => pattern.test(fullText))) return { span: fullText };
  return null;
}

function extractGuestPrepDeadline(text: string, currentDate: string): string | null {
  if (!GUEST_PREP_PATTERNS.some((pattern) => pattern.test(text))) return null;
  return parseRelativeDateToISO(text, currentDate);
}

function extractDeadlineReason(text: string): string | null {
  if (/\bmother-in-law\b/i.test(text)) return "mother-in-law visit";
  if (/\bparents visiting\b/i.test(text)) return "parents visiting";
  if (/\bguest coming\b|\bguests arrive\b/i.test(text)) return "guest arrival";
  if (/\bbefore (?:she|he|they) visits?\b/i.test(text)) return "guest visit";
  return null;
}

function extractAirportRoute(
  text: string,
  input: ResidentMultiIntentPlannerInput
): { origin?: string | null; destination?: string | null } {
  const routeMatch =
    text.match(/\bfrom\s+([A-Z0-9 .'-]+?)\s+to\s+([A-Z0-9 .'-]+?)(?:,|\.|$|\s+oh\b|\s+and\b)/i) ??
    text.match(/\bLAX\s+pickup\s+to\s+([A-Z0-9 .'-]+?)(?:,|\.|$|\s+oh\b|\s+and\b)/i);
  const origin = routeMatch?.[2] ? routeMatch[1]?.trim() : (/\bLAX\b/i.test(text) ? "LAX" : null);
  const rawDestination = routeMatch?.[2]?.trim() ?? (routeMatch?.[1] && /\bLAX\s+pickup\s+to\b/i.test(text) ? routeMatch[1].trim() : null);
  const destination =
    normalizeDestination(rawDestination) ??
    input.buildingName ??
    normalizeDestination(input.buildingSlug) ??
    null;
  return { origin, destination };
}

function normalizeDestination(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^opus(?:\s*la|la)?$/i.test(value.trim())) return "Opus LA";
  return value.trim();
}

function buildNotes(
  type: ResidentMultiIntentType,
  text: string,
  deadlineReason: string | null
): string | null {
  const notes: string[] = [];
  if (type === "airport_transport" && /\bmother-in-law\b/i.test(text)) {
    notes.push("Passenger appears to be resident's mother-in-law.");
  }
  if (deadlineReason && type !== "laundry") {
    notes.push(`Related to ${deadlineReason}.`);
  }
  return notes.length > 0 ? notes.join(" ") : null;
}
