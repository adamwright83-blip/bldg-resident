/**
 * Deterministic date parsing for explicit user date intent
 * Runs BEFORE LLM to detect hard overrides
 */

interface DateParseResult {
  hasExplicitDate: boolean;
  dateOverride?: string; // "Wednesday, Feb 19" format
  windowOverride?: string; // "7-10am" format
}

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const RELATIVE_DATES = ['today', 'tomorrow', 'tonight'];
const TIME_KEYWORDS = {
  morning: '7-10am',
  afternoon: '12-3pm',
  evening: '5-8pm',
  night: '7-10pm',
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

/**
 * Parse user message for explicit date and time references
 */
export function parseExplicitDateTime(message: string): DateParseResult {
  const lower = message.toLowerCase().trim();
  
  let dateOverride: string | undefined;
  let windowOverride: string | undefined;

  // 1. Check for weekday names
  for (const day of WEEKDAYS) {
    if (lower.includes(day)) {
      dateOverride = getNextWeekday(day);
      break;
    }
  }

  // 2. Check for relative dates (today, tomorrow)
  if (!dateOverride) {
    for (const relative of RELATIVE_DATES) {
      if (lower.includes(relative)) {
        dateOverride = getRelativeDate(relative);
        break;
      }
    }
  }

  // 3. Check for absolute dates (Feb 20, 2/20, February 20)
  if (!dateOverride) {
    dateOverride = parseAbsoluteDate(lower);
  }

  // 4. Check for time window keywords
  for (const [keyword, window] of Object.entries(TIME_KEYWORDS)) {
    if (lower.includes(keyword)) {
      windowOverride = window;
      break;
    }
  }

  // 5. Check for explicit time ranges (7-10am, 7am-10am, 7:00-10:00)
  if (!windowOverride) {
    windowOverride = parseTimeRange(lower);
  }

  return {
    hasExplicitDate: !!dateOverride,
    dateOverride,
    windowOverride,
  };
}

export function addDaysISO(currentDate: string, days: number): string {
  const date = parseISODate(currentDate);
  date.setDate(date.getDate() + days);
  return formatISODate(date);
}

export function parseRelativeDateToISO(
  message: string,
  currentDate: string
): string | null {
  const lower = message.toLowerCase();

  if (/\btoday\b|\btonight\b/.test(lower)) return addDaysISO(currentDate, 0);
  if (/\btomorrow\b/.test(lower)) return addDaysISO(currentDate, 1);

  const inDaysMatch = lower.match(
    /\bin\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+days?\b/
  );
  if (inDaysMatch) {
    const raw = inDaysMatch[1];
    const days = NUMBER_WORDS[raw] ?? Number(raw);
    if (Number.isFinite(days)) return addDaysISO(currentDate, days);
  }

  return null;
}

export function parseRequestedWindow(message: string): string | null {
  const lower = message.toLowerCase();
  for (const [keyword, window] of Object.entries(TIME_KEYWORDS)) {
    if (lower.includes(keyword)) return window;
  }
  return parseTimeRange(lower) ?? null;
}

function parseISODate(value: string): Date {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
    return new Date();
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get the next occurrence of a weekday
 */
function getNextWeekday(dayName: string): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDay = days.indexOf(dayName.toLowerCase());
  
  const today = new Date();
  const currentDay = today.getDay();
  
  let daysUntilTarget = targetDay - currentDay;
  if (daysUntilTarget <= 0) {
    daysUntilTarget += 7; // Next week
  }
  
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysUntilTarget);
  
  return formatDate(targetDate);
}

/**
 * Get date for relative keywords (today, tomorrow)
 */
function getRelativeDate(keyword: string): string {
  const today = new Date();
  
  switch (keyword.toLowerCase()) {
    case 'today':
    case 'tonight':
      return formatDate(today);
    case 'tomorrow':
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return formatDate(tomorrow);
    default:
      return formatDate(today);
  }
}

/**
 * Parse absolute dates like "Feb 20", "2/20", "February 20"
 */
function parseAbsoluteDate(text: string): string | undefined {
  // Match patterns like "Feb 20", "February 20", "2/20", "02/20"
  const patterns = [
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})\b/i,
    /\b(\d{1,2})[\/\-](\d{1,2})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const date = parseMatchedDate(match);
        if (date) {
          return formatDate(date);
        }
      } catch (e) {
        // Invalid date, continue
      }
    }
  }

  return undefined;
}

/**
 * Convert regex match to Date object
 */
function parseMatchedDate(match: RegExpMatchArray): Date | undefined {
  const currentYear = new Date().getFullYear();
  
  // Month name pattern (Feb 20)
  if (isNaN(Number(match[1]))) {
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthIndex = monthNames.findIndex(m => match[1].toLowerCase().startsWith(m));
    if (monthIndex >= 0) {
      const day = parseInt(match[2]);
      return new Date(currentYear, monthIndex, day);
    }
  }
  
  // Numeric pattern (2/20)
  const month = parseInt(match[1]) - 1; // 0-indexed
  const day = parseInt(match[2]);
  return new Date(currentYear, month, day);
}

/**
 * Parse time ranges like "7-10am", "7am-10am", "7:00-10:00"
 */
function parseTimeRange(text: string): string | undefined {
  const patterns = [
    /\b(\d{1,2})\s*[-–]\s*(\d{1,2})\s*(am|pm)\b/i,
    /\b(\d{1,2})\s*(am|pm)\s*[-–]\s*(\d{1,2})\s*(am|pm)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Normalize to "7-10am" format
      return match[0].replace(/\s+/g, '').toLowerCase();
    }
  }

  return undefined;
}

/**
 * Format date as "Wednesday, Feb 19"
 */
function formatDate(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const dayName = days[date.getDay()];
  const monthName = months[date.getMonth()];
  const dayNum = date.getDate();
  
  return `${dayName}, ${monthName} ${dayNum}`;
}
