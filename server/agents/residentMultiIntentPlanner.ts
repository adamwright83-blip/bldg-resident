import { addDaysISO, parseRelativeDateToISO, parseRequestedWindow } from "../lib/dateParser";

const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export type ResidentMultiIntentType =
  | "laundry"
  | "dry_cleaning"
  | "dog_grooming"
  | "car_detail"
  | "airport_transport"
  | "apartment_cleaning"
  | "haircut"
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
  dogName?: string | null;
  guestRelation?: string | null;
  preferredVendor?: string | null;
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
      /\b[A-Z][a-z]+\s+groomed\b/,
      /\bgroom(?:ed|ing)?\s+[A-Z][a-z]+\b/,
      /\bgroomed\b/i,
    ],
  },
  {
    type: "car_detail",
    confidence: 0.88,
    patterns: [
      /\bcar detail(?:ed|ing)?\b/i,
      /\bauto detail(?:ed|ing)?\b/i,
      /\bdetail(?:ed|ing)?\s+(?:my|the)\s+car\b/i,
      /\bdetailing\b/i,
      /\bcar wash\b/i,
      /\bwash my car\b/i,
    ],
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
  {
    type: "haircut",
    confidence: 0.87,
    patterns: [
      /\bhaircut\b/i,
      /\bhair cut\b/i,
      /\bbarber\b/i,
      /\btrim\b/i,
      /\bblowout\b/i,
      /\bhair appointment\b/i,
    ],
  },
];

// Default scheduling for coordinated (non-laundry) services when the resident
// did not name a specific time. The chief of staff proposes a concrete window
// rather than leaving it open.
const COORDINATED_DEFAULTS: Partial<
  Record<ResidentMultiIntentType, { requestedDate?: string; requestedWindow: string }>
> = {
  dog_grooming: { requestedWindow: "10am–1pm" },
  car_detail: { requestedWindow: "8am–11am" },
  haircut: { requestedWindow: "11am–1pm" },
};

// Default day-of-week offered for coordinated services when no date is parsed.
const COORDINATED_DEFAULT_DAY: Partial<Record<ResidentMultiIntentType, string>> = {
  dog_grooming: "Saturday",
  car_detail: "Wednesday",
  haircut: "Saturday",
};

const GUEST_PREP_PATTERNS = [
  /\bmother-in-law\b/i,
  /\bwife'?s mother\b/i,
  /\bstepmother\b/i,
  /\bgrandmother\b/i,
  /\bgrandma\b/i,
  /\b(?:my )?mother\b/i,
  /\b(?:my )?mom\b/i,
  /\b(?:my )?father\b/i,
  /\b(?:my )?dad\b/i,
  /\bparents visiting\b/i,
  /\bguest coming\b/i,
  /\bguest arrives?\b/i,
  /\bguests? (?:coming|arrive)\b/i,
  /\bcoming over\b/i,
  /\barrives?\s+(?:on\s+)?(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i,
  /\bbefore she (?:gets here|visits|arrives)\b/i,
  /\bbefore he (?:gets here|visits|arrives)\b/i,
  /\bbefore they (?:get here|visit|arrive)\b/i,
];

export function planResidentMultiIntents(
  input: ResidentMultiIntentPlannerInput
): ResidentMultiIntentPlan {
  const normalized = input.content
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return { intents: [] };

  const globalDeadlineDate = extractGuestPrepDeadline(normalized, input.currentDate);
  const deadlineReason = extractDeadlineReason(normalized);
  const guestRelation = extractGuestRelation(normalized);
  const dogName = extractDogName(normalized);
  const clauses = splitIntoClauses(normalized);
  const intents: ResidentPlannedIntent[] = [];

  for (const service of SERVICE_PATTERNS) {
    const match = findServiceMatch(normalized, clauses, service.patterns);
    if (!match) continue;

    const span = match.span;
    const spanDate = parseRelativeDateToISO(span, input.currentDate);
    const spanWindow = parseRequestedWindow(span);
    const isGuestPrepService =
      service.type === "dog_grooming" ||
      service.type === "car_detail" ||
      service.type === "airport_transport" ||
      service.type === "apartment_cleaning" ||
      service.type === "haircut";
    // The shared guest-arrival deadline applies to guest-prep services AND to
    // laundry, so "back before she arrives" is backed by structured data. The
    // deadline never changes laundry's own booking/return logic — it travels
    // alongside as the return-by context.
    const carriesGuestDeadline = isGuestPrepService || service.type === "laundry";
    const deadlineDate = carriesGuestDeadline && globalDeadlineDate ? globalDeadlineDate : null;

    const defaults = COORDINATED_DEFAULTS[service.type];
    const defaultDay = COORDINATED_DEFAULT_DAY[service.type];
    const requestedWindow = spanWindow ?? defaults?.requestedWindow ?? null;
    // Always offer a concrete requested date. An explicit span date wins; then
    // the service's default day; and when a guest deadline exists, that default
    // day is pinned to the occurrence that lands BEFORE the guest arrives (e.g.
    // grooming on the Saturday before a Sunday visit). The deadline still rides
    // separately on deadlineDate so the truth model is unaffected.
    const requestedDate =
      spanDate ??
      (defaultDay
        ? deadlineDate
          ? weekdayOnOrBefore(deadlineDate, defaultDay)
          : parseRelativeDateToISO(defaultDay, input.currentDate)
        : null);

    const airportRoute =
      service.type === "airport_transport" ? extractAirportRoute(normalized, input) : {};

    intents.push({
      id: `intent_${intents.length + 1}`,
      type: service.type,
      confidence: service.confidence,
      originalTextSpan: span,
      requestedDate,
      requestedWindow,
      deadlineDate,
      deadlineReason: deadlineDate ? deadlineReason : null,
      origin: airportRoute.origin ?? null,
      destination: airportRoute.destination ?? null,
      dogName: service.type === "dog_grooming" ? dogName : null,
      guestRelation: isGuestPrepService ? guestRelation : null,
      preferredVendor: null,
      notes: buildNotes(service.type, normalized, deadlineReason, dogName, guestRelation),
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

// Split a request into clauses on both sentence boundaries (. ! ?) and the
// usual conjunctions/punctuation. Sentence splitting matters because the
// guest-arrival date often lives in its own sentence ("…coming over Sunday.")
// separate from the service request ("…my laundry done before she gets here").
// Without it, the laundry clause would absorb "Sunday" and book for that day
// instead of carrying it only as the return-by deadline. The shared guest
// deadline is still extracted from the full normalized text upstream, so
// splitting here never loses it.
function splitIntoClauses(text: string): string[] {
  return text
    .split(/\s*(?:[.!?]+|,|;|\band\b|\boh and\b|\bthen\b)\s*/i)
    .map((clause) => clause.trim())
    .filter(Boolean);
}

// The latest occurrence of `dayName` that falls strictly before `deadlineISO`,
// so a service scheduled "ahead of" a guest visit lands before they arrive
// (e.g. grooming on the Saturday before a Sunday visit). Falls back to the day
// before the deadline if that weekday is the deadline day itself.
function weekdayOnOrBefore(deadlineISO: string, dayName: string): string {
  const target = WEEKDAY_INDEX[dayName.toLowerCase()];
  if (target === undefined) return addDaysISO(deadlineISO, -1);
  for (let back = 1; back <= 7; back++) {
    const candidate = addDaysISO(deadlineISO, -back);
    if (parseISODateUTC(candidate).getDay() === target) return candidate;
  }
  return addDaysISO(deadlineISO, -1);
}

function parseISODateUTC(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
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
  const relation = extractGuestRelation(text);
  if (relation) return `${relation} visit`;
  if (/\bparents visiting\b/i.test(text)) return "parents visiting";
  if (/\bguest coming\b|\bguests? (?:coming|arrive)\b|\bcoming over\b/i.test(text)) return "guest arrival";
  if (/\bbefore (?:she|he|they) (?:gets? here|visits?|arrives?)\b/i.test(text)) return "guest visit";
  return null;
}

// The visitor's relation to the resident, in resident-facing words. Reflects
// how the resident referred to them so downstream copy can echo it back.
function extractGuestRelation(text: string): string | null {
  if (/\bwife'?s mother\b/i.test(text)) return "wife's mother";
  if (/\bmother-in-law\b/i.test(text)) return "mother-in-law";
  if (/\bstepmother\b/i.test(text)) return "stepmother";
  if (/\bgrandmother\b|\bgrandma\b/i.test(text)) return "grandmother";
  if (/\bparents visiting\b/i.test(text)) return "parents";
  if (/\b(?:my )?mother\b|\b(?:my )?mom\b/i.test(text)) return "mother";
  if (/\b(?:my )?father\b|\b(?:my )?dad\b/i.test(text)) return "father";
  return null;
}

// Pull a dog's name from phrases like "Theo groomed" or "groom Theo". Only a
// capitalized token adjacent to a grooming cue is treated as a name.
function extractDogName(text: string): string | null {
  const beforeGroom = text.match(/\b([A-Z][a-z]+)\s+(?:groomed|grooming|the dog)\b/);
  if (beforeGroom?.[1]) return beforeGroom[1];
  const afterGroom = text.match(/\bgroom(?:ing|ed)?\s+([A-Z][a-z]+)\b/);
  if (afterGroom?.[1]) return afterGroom[1];
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
  deadlineReason: string | null,
  dogName: string | null,
  guestRelation: string | null
): string | null {
  const notes: string[] = [];
  if (type === "dog_grooming" && dogName) {
    notes.push(`Dog name: ${dogName}.`);
  }
  if (type === "airport_transport" && guestRelation) {
    notes.push(`Passenger appears to be resident's ${guestRelation}.`);
  }
  if (guestRelation && type !== "laundry") {
    notes.push(`Ahead of ${guestRelation}'s arrival.`);
  } else if (deadlineReason && type !== "laundry") {
    notes.push(`Related to ${deadlineReason}.`);
  }
  return notes.length > 0 ? notes.join(" ") : null;
}
