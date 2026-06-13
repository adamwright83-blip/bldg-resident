/**
 * HELD post-order message classifier (pure, deterministic, testable).
 *
 * After a laundry order is confirmed, the resident's brass-phone messages are no
 * longer "new requests" — they are follow-ups on the active order. This classifies
 * each message so the SERVER (not a client regex) can decide what to do:
 *
 *   cancel       → ask the operator to stand the order down (no DB cancel here)
 *   timing       → ask the vendor/operator about a pickup/return change
 *   status       → read-only recap from real order state (no horse, no order)
 *   add_service  → a brand-new service → route to the normal booking path
 *   free_chat    → conversation/info → answer normally (no horse, no order)
 *
 * The classifier never books, cancels, or mutates anything. It only labels.
 */

export type PostOrderIntent =
  | "cancel"
  | "timing"
  | "status"
  | "add_service"
  | "general_capability_question"
  | "free_chat";

export type PostOrderTimingKind = "return_by_time" | "pickup_time_change" | "timing_constraint";

export type PostOrderAddServiceType =
  | "dry_cleaning"
  | "dog_grooming"
  | "car_detail"
  | "haircut"
  | "laundry";

export interface PostOrderClassification {
  intent: PostOrderIntent;
  /** For timing intent: which kind of change is being asked for. */
  timingKind?: PostOrderTimingKind;
  /** The time the resident asked for, normalized e.g. "5pm" / "8am" / "tonight". */
  requestedWindow?: string | null;
  /** The reason/deadline phrase, e.g. "leaves for dinner at 6pm" / "before dinner". */
  deadline?: string | null;
  /** For add_service intent: the new service detected. */
  addServiceType?: PostOrderAddServiceType | null;
}

function norm(message: string): string {
  return message.toLowerCase().replace(/\s+/g, " ").trim();
}

const CANCEL_RE =
  /\b(cancel(?:l?ed|ling)?|call it off|forget it|never\s?mind|nvm|scrap (?:it|that|the)|don'?t need|do not need|no longer need|don'?t want (?:it|the|my)|stop the (?:pickup|order|laundry))\b/;

// Additive markers that signal a NEW service rather than a change to the existing one.
// NOTE: "too" is deliberately NOT in this list. As a degree adverb ("7pm is too
// late", "too early") it appears constantly in TIMING messages — live incident:
// "i need my laundry delivered at 5pm though. 7pm is too late." classified as a
// NEW laundry order and replayed the whole booking ritual. "too" only counts as
// additive when it means "also", i.e. clause-final ("book grooming too").
const ADD_MARKER_RE = /\b(also|add|as well|on top|in addition|another|one more|plus)\b/;
const ADDITIVE_TOO_RE = /\btoo\s*(?=[.!?,;)]|$)/;

const SERVICE_NOUNS: Array<{ type: PostOrderAddServiceType; re: RegExp }> = [
  { type: "dry_cleaning", re: /\b(dry[\s-]?clean(?:ing)?|dryclean)\b/ },
  { type: "dog_grooming", re: /\b(dog\s*groom(?:ing)?|grooming|groom my|groomer)\b/ },
  { type: "car_detail", re: /\b(car detail|auto detail|detail my car|detail the car|car wash|wash my car)\b/ },
  { type: "haircut", re: /\b(haircut|hair cut|barber)\b/ },
  { type: "laundry", re: /\b(laundry|wash\s*(?:&|and)?\s*fold|wash and fold)\b/ },
];

// Read-only questions about the EXISTING order (no change requested).
const STATUS_RE =
  /\b(what'?s booked|what is booked|already booked|what did i (?:book|order)|what do i have|status|recap|where (?:are|is) (?:we|it|my)|when(?:'?s| is)?\s+(?:the\s+)?(?:pickup|it coming|coming back|delivery|return|ready)|what time(?:'?s| is)?\s+(?:the\s+)?(?:pickup|return|delivery))\b/;

const GENERAL_CAPABILITY_RE =
  /\b(what else can (?:i ask|i talk|you do)|can you help with things besides|how does this work|what services do you support|what is held|how do receipts work|how do i message (?:the )?vendor|can i ask you questions|what can i talk to you about)\b/;

// A change/constraint to the existing order's timing.
const TIMING_VERB_RE =
  /\b(earlier|sooner|later|before|after|by\s+\d|move|change|switch|reschedule|adjust|push|delay|bump|instead|come (?:back )?(?:earlier|later|sooner|at|by)|bring (?:it|them|my \w+) back|get (?:it|them|my \w+) back|back (?:by|at|before)|return(?:ed)? (?:by|at|before)|deliver(?:ed)? (?:by|at|before))\b/;

const TIME_RE = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/;
const LOOSE_TIME_RE = /\b(?:by|at|before|after)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/;

function extractRequestedWindow(message: string): string | null {
  const m = message.match(TIME_RE);
  if (m) {
    const min = m[2] ? `:${m[2]}` : "";
    return `${m[1]}${min}${m[3].toLowerCase()}`;
  }
  if (/\btonight\b/.test(message)) return "tonight";
  if (/\bthis evening\b/.test(message)) return "this evening";
  if (/\bthis morning\b/.test(message)) return "this morning";
  if (/\btomorrow morning\b/.test(message)) return "tomorrow morning";
  const loose = message.match(LOOSE_TIME_RE);
  if (loose) return `${loose[1]}${loose[2] ? `:${loose[2]}` : ""}${loose[3] ? loose[3].toLowerCase() : ""}`.trim();
  return null;
}

function extractDeadline(message: string): string | null {
  // The reason/constraint clause, usually after "bc / because / so / before / since".
  // Keep only the first sentence so trailing questions ("...is that possible?")
  // don't ride along into the operator note.
  const clause = message.match(/\b(?:bc|because|cuz|since|so that|so|before)\b\s+(.+)$/i);
  if (clause) {
    const firstSentence = clause[1].split(/[.!?]/)[0];
    return firstSentence.trim() || null;
  }
  if (/\bbefore dinner\b/i.test(message)) return "before dinner";
  return null;
}

function detectTimingKind(message: string): PostOrderTimingKind {
  if (/\b(pick ?up|collect)\b/.test(message)) return "pickup_time_change";
  // deliver\w* covers delivered/delivery/delivering — "i need my laundry
  // delivered at 5pm" is a return-by ask, not a generic constraint.
  if (/\b(back|return\w*|deliver\w*|drop ?off|get it|have it|by)\b/.test(message)) return "return_by_time";
  return "timing_constraint";
}

function detectAddService(message: string): PostOrderAddServiceType | null {
  const hasMarker = ADD_MARKER_RE.test(message) || ADDITIVE_TOO_RE.test(message);
  for (const { type, re } of SERVICE_NOUNS) {
    if (!re.test(message)) continue;
    // A new NON-laundry service noun is add-by-itself ("dry clean my jacket").
    if (type !== "laundry") return type;
    // Laundry counts as a NEW order only with an additive marker
    // ("another laundry", "also laundry"); otherwise it's about the existing one.
    if (hasMarker) return "laundry";
  }
  return null;
}

/**
 * Server backstop helper: does this message carry timing/change language, and
 * if so what are the timing details? Used by postOrderFollowup to OVERRIDE an
 * add_service classification when the named service matches the resident's
 * active order — a timing ask about the existing order must never re-book,
 * even if the classifier misfires again.
 */
export function getTimingDetails(message: string): {
  timingKind: PostOrderTimingKind;
  requestedWindow: string | null;
  deadline: string | null;
} | null {
  const text = norm(message);
  const hasTimingSignal =
    TIMING_VERB_RE.test(text) || TIME_RE.test(text) || LOOSE_TIME_RE.test(text);
  if (!hasTimingSignal) return null;
  return {
    timingKind: detectTimingKind(text),
    requestedWindow: extractRequestedWindow(text),
    deadline: extractDeadline(message),
  };
}

/**
 * Bare agreement ("yes", "yeah", "ok", "sure", "do it", "go ahead", "book it").
 * Used by the client to resume a pending offer (e.g. "Want me to book one?" →
 * "yes" routes to the parent deterministic booking flow) instead of re-running
 * the follow-up resolver against the word "yes".
 */
export function isAffirmation(message: string): boolean {
  const text = norm(message).replace(/[!.]+$/, "");
  return /^(yes|yeah|yep|yup|sure|ok|okay|please|yes please|go ahead|do it|book it|sounds good|let'?s do it)$/.test(
    text,
  );
}

export function classifyPostOrderMessage(message: string): PostOrderClassification {
  const text = norm(message);
  if (!text) return { intent: "free_chat" };

  // 1) Cancel — highest priority so "I don't need laundry anymore" never books.
  if (CANCEL_RE.test(text)) {
    return { intent: "cancel" };
  }

  // 2) Add new service — must beat timing so "also dry clean my jacket" books fresh.
  const addServiceType = detectAddService(text);
  if (addServiceType) {
    return { intent: "add_service", addServiceType };
  }

  // 3) Status / recap — read-only questions about the existing order (no change verb).
  const hasTimingVerb = TIMING_VERB_RE.test(text) || TIME_RE.test(text) || LOOSE_TIME_RE.test(text);
  if (STATUS_RE.test(text) && !hasTimingVerb) {
    return { intent: "status" };
  }

  if (GENERAL_CAPABILITY_RE.test(text)) {
    return { intent: "general_capability_question" };
  }

  // 4) Timing change/constraint on the existing order.
  if (hasTimingVerb) {
    return {
      intent: "timing",
      timingKind: detectTimingKind(text),
      requestedWindow: extractRequestedWindow(text),
      deadline: extractDeadline(message),
    };
  }

  // 5) Everything else is conversation/info.
  return { intent: "free_chat" };
}
