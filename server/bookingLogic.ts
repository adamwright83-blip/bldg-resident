/**
 * Booking logic — real-world scheduling based on operator's daily route.
 *
 * Operator Schedule (America/Los_Angeles):
 * - 7am–1pm: Pickups and dropoffs in LA
 * - 1pm: Drive to Huntington Park (processing facility)
 * - Processing complete by 6pm
 * - 6pm+: Drive back to LA, deliver completed orders
 *
 * LAUNDRY (Fluff & Fold) Pickup Rules:
 * - Booked before 11:30am → same-day pickup 12:30–1:30pm (default)
 *   - If resident rejects that window → 7–8pm same night OR 7–10am next morning
 * - Booked after 11:30am → next morning 7–10am (default)
 *   - Resident can also choose 7–8pm same night
 *
 * LAUNDRY Delivery: "Within 24 hours of pickup." If picked up at 8am,
 * back by ~7pm same day or next morning. If picked up at 8pm, back by
 * ~7pm next evening. Operator often delivers faster as a pleasant surprise.
 *
 * DRY CLEANING Pickup Rules: Same pickup windows as laundry.
 * DRY CLEANING Delivery:
 * - Standard: 2 business days, no surcharge
 * - Same-day DC: Must book before 8:30am, +$2/garment. Garment must reach
 *   cleaner by 10am so operator must pick up by 9:30am.
 * - Rush DC (next-day): +$2/garment surcharge
 *
 * Other services (car-wash, grooming, cleaning) retain weekly defaults.
 */

import { getPreference, upsertPreference, getServiceRequests } from "./db";
import type { Preference, ServiceRequest } from "../drizzle/schema";
import { TZDate } from "@date-fns/tz";

// ─── Service category mapping ───

const SERVICE_CATEGORY_MAP: Record<string, string> = {
  laundry: "laundry",
  "dry-cleaning": "dry-cleaning",
  "car-wash": "car-wash",
  "car wash": "car-wash",
  cleaning: "cleaning",
  grooming: "grooming",
  "pet grooming": "grooming",
  amenity: "amenity",
  maintenance: "maintenance",
};

export function normalizeServiceCategory(serviceType: string): string {
  return SERVICE_CATEGORY_MAP[serviceType.toLowerCase()] || serviceType;
}

// ─── Building defaults for non-laundry/DC services ───

interface BuildingDefault {
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  recurrence: string | null;
}

export const BUILDING_DEFAULTS: Record<string, BuildingDefault> = {
  "car-wash": {
    dayOfWeek: 3, // Wednesday
    startHour: 8,
    startMinute: 0,
    endHour: 11,
    endMinute: 0,
    recurrence: null,
  },
  cleaning: {
    dayOfWeek: 4, // Thursday
    startHour: 13,
    startMinute: 0,
    endHour: 16,
    endMinute: 0,
    recurrence: "monthly",
  },
  grooming: {
    dayOfWeek: 5, // Friday
    startHour: 10,
    startMinute: 0,
    endHour: 13,
    endMinute: 0,
    recurrence: "6-weeks",
  },
};

const TIMEZONE = "America/Los_Angeles";

// ─── Date helpers ───

/**
 * Get current time in Los Angeles timezone.
 * Uses TZDate from date-fns/tz for accurate timezone conversion.
 */
function getNowInLA(): Date {
  const now = new Date();
  const tzDate = new TZDate(now, TIMEZONE);
  // Convert TZDate to regular Date with LA local time values
  return new Date(
    tzDate.getFullYear(),
    tzDate.getMonth(),
    tzDate.getDate(),
    tzDate.getHours(),
    tzDate.getMinutes(),
    tzDate.getSeconds(),
    tzDate.getMilliseconds()
  );
}

/**
 * Get 24 hours from now in LA timezone.
 */
function get24HoursFromNowInLA(): Date {
  const now = getNowInLA();
  now.setHours(now.getHours() + 24);
  return now;
}

/**
 * Get the next occurrence of a specific day of week at a specific time.
 * If the computed time is before minDate, advance by 7 days repeatedly.
 */
function getNextOccurrence(
  dayOfWeek: number,
  hour: number,
  minute: number,
  minDate: Date
): Date {
  const now = getNowInLA();
  const targetDay = dayOfWeek;
  const currentDay = now.getDay();

  let daysUntil = targetDay - currentDay;
  if (daysUntil <= 0) {
    daysUntil += 7;
  }

  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + daysUntil);
  targetDate.setHours(hour, minute, 0, 0);

  while (targetDate < minDate) {
    targetDate.setDate(targetDate.getDate() + 7);
  }

  return targetDate;
}

/**
 * Format a date as "Tuesday, Feb 18".
 */
function formatDate(date: Date): string {
  const dayNames = [
    "Sunday", "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday",
  ];
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  return `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}`;
}

/**
 * Format time window as "7–10 AM" or "12:30–1:30 PM".
 */
function formatTimeWindow(startHour: number, startMinute: number, endHour: number, endMinute: number): string {
  const formatTime = (hour: number, minute: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const displayMinute = minute > 0 ? `:${minute.toString().padStart(2, "0")}` : "";
    return `${displayHour}${displayMinute} ${period}`;
  };

  const start = formatTime(startHour, startMinute);
  const end = formatTime(endHour, endMinute);

  // Simplify if both times share the same period
  if (start.endsWith(end.slice(-2))) {
    return `${start.slice(0, -3)}–${end}`;
  }

  return `${start}–${end}`;
}

// ─── Core scheduling logic ───

export interface BookingDefaults {
  date: string;                  // e.g., "Tuesday, Feb 18"
  window: string;                // e.g., "12:30–1:30 PM"
  recurrence: string | null;
  scheduled_start_utc: string;   // ISO 8601 UTC
  scheduled_end_utc: string;     // ISO 8601 UTC
  scheduled_start_local: string; // ISO 8601 local (no Z)
  scheduled_end_local: string;   // ISO 8601 local (no Z)
  timezone: string;
  deliveryEstimate?: string;     // e.g., "By tomorrow evening"
  isSameDay?: boolean;           // true if same-day pickup
}

/**
 * Compute laundry/dry-cleaning pickup window based on current LA time.
 *
 * Before 11:30am → same day 12:30–1:30pm
 * After 11:30am  → next morning 7–10am
 */
function computeLaundryPickup(serviceCategory: string): BookingDefaults {
  const now = getNowInLA();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  const isDryClean = serviceCategory === "dry-cleaning";
  const cutoffMinutes = 11 * 60 + 30; // 11:30am

  let pickupDate: Date;
  let startHour: number;
  let startMinute: number;
  let endHour: number;
  let endMinute: number;
  let isSameDay: boolean;

  if (currentTimeMinutes < cutoffMinutes) {
    // Before 11:30am → same day 12:30–1:30pm
    pickupDate = new Date(now);
    startHour = 12;
    startMinute = 30;
    endHour = 13;
    endMinute = 30;
    isSameDay = true;
  } else {
    // After 11:30am → next morning 7–10am
    pickupDate = new Date(now);
    pickupDate.setDate(pickupDate.getDate() + 1);
    startHour = 7;
    startMinute = 0;
    endHour = 10;
    endMinute = 0;
    isSameDay = false;
  }

  pickupDate.setHours(startHour, startMinute, 0, 0);

  const endDate = new Date(pickupDate);
  endDate.setHours(endHour, endMinute, 0, 0);

  const date = formatDate(pickupDate);
  const window = formatTimeWindow(startHour, startMinute, endHour, endMinute);

  // Delivery estimate
  const deliveryEstimate = isDryClean ? "2 business days" : "Within 24 hours of pickup";

  return {
    date,
    window,
    recurrence: isDryClean ? null : "weekly",
    scheduled_start_utc: pickupDate.toISOString(),
    scheduled_end_utc: endDate.toISOString(),
    scheduled_start_local: pickupDate.toISOString().replace("Z", "").slice(0, 19),
    scheduled_end_local: endDate.toISOString().replace("Z", "").slice(0, 19),
    timezone: TIMEZONE,
    deliveryEstimate,
    isSameDay,
  };
}

/**
 * Compute the next available booking window for non-laundry services.
 * Uses hardcoded building defaults with 24-hour buffer and +7 day advancement.
 */
export function computeNextWindowFromSchedule(
  serviceCategory: string,
  preferredDay?: number | null,
  preferredWindow?: string | null
): BookingDefaults {
  const normalized = normalizeServiceCategory(serviceCategory);
  const buildingDefault = BUILDING_DEFAULTS[normalized];

  if (!buildingDefault) {
    throw new Error(`No building default for service category: ${serviceCategory}`);
  }

  const minDate = get24HoursFromNowInLA();

  let dayOfWeek = buildingDefault.dayOfWeek;
  let startHour = buildingDefault.startHour;
  let startMinute = buildingDefault.startMinute;
  let endHour = buildingDefault.endHour;
  let endMinute = buildingDefault.endMinute;

  if (preferredDay !== null && preferredDay !== undefined && preferredWindow) {
    dayOfWeek = preferredDay;
    const windowMatch = preferredWindow.match(/(\d+)(?::(\d+))?\s*[–-]\s*(\d+)(?::(\d+))?\s*(AM|PM)/i);
    if (windowMatch) {
      startHour = parseInt(windowMatch[1]);
      startMinute = parseInt(windowMatch[2] || "0");
      endHour = parseInt(windowMatch[3]);
      endMinute = parseInt(windowMatch[4] || "0");

      const period = windowMatch[5].toUpperCase();
      if (period === "PM" && startHour !== 12) startHour += 12;
      if (period === "AM" && startHour === 12) startHour = 0;
      if (period === "PM" && endHour !== 12) endHour += 12;
      if (period === "AM" && endHour === 12) endHour = 0;
    }
  } else if (preferredDay !== null && preferredDay !== undefined) {
    dayOfWeek = preferredDay;
  } else if (preferredWindow) {
    const windowMatch = preferredWindow.match(/(\d+)(?::(\d+))?\s*[–-]\s*(\d+)(?::(\d+))?\s*(AM|PM)/i);
    if (windowMatch) {
      startHour = parseInt(windowMatch[1]);
      startMinute = parseInt(windowMatch[2] || "0");
      endHour = parseInt(windowMatch[3]);
      endMinute = parseInt(windowMatch[4] || "0");

      const period = windowMatch[5].toUpperCase();
      if (period === "PM" && startHour !== 12) startHour += 12;
      if (period === "AM" && startHour === 12) startHour = 0;
      if (period === "PM" && endHour !== 12) endHour += 12;
      if (period === "AM" && endHour === 12) endHour = 0;
    }
  }

  const startDate = getNextOccurrence(dayOfWeek, startHour, startMinute, minDate);
  const endDate = new Date(startDate);
  endDate.setHours(endHour, endMinute, 0, 0);

  const date = formatDate(startDate);
  const window = formatTimeWindow(startHour, startMinute, endHour, endMinute);

  return {
    date,
    window,
    recurrence: buildingDefault.recurrence,
    scheduled_start_utc: startDate.toISOString(),
    scheduled_end_utc: endDate.toISOString(),
    scheduled_start_local: startDate.toISOString().replace("Z", "").slice(0, 19),
    scheduled_end_local: endDate.toISOString().replace("Z", "").slice(0, 19),
    timezone: TIMEZONE,
  };
}

/**
 * Get default booking parameters for a service category.
 *
 * For laundry and dry-cleaning: uses same-day/next-morning logic.
 * For other services: checks user preferences first, falls back to building defaults.
 */
export async function getBookingDefaults(
  bldgUserId: number | null,
  serviceCategory: string,
  dateOverride?: string,
  windowOverride?: string
): Promise<BookingDefaults> {
  const normalized = normalizeServiceCategory(serviceCategory);

  // Laundry and dry-cleaning use the real-time pickup logic
  if (normalized === "laundry" || normalized === "dry-cleaning") {
    // Honor an explicit date even when no time window was given (the window
    // defaults to 7–10 AM inside). Previously this required BOTH a date AND a
    // window, so "pick up laundry next Wednesday" (no time) was dropped and
    // fell back to the default pickup (tomorrow morning).
    if (dateOverride) {
      return computeOverriddenLaundryPickup(
        normalized,
        dateOverride,
        windowOverride ?? ""
      );
    }
    return computeLaundryPickup(normalized);
  }

  // Other services use the weekly-schedule approach
  const pref = bldgUserId ? await getPreference(bldgUserId, normalized) : null;

  let preferredDay: number | null = null;
  let preferredWindow: string | null = null;

  if (pref && pref.autoSchedule === "enabled") {
    if (pref.preferredDay) {
      const dayMap: Record<string, number> = {
        Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
        Thursday: 4, Friday: 5, Saturday: 6,
      };
      preferredDay = dayMap[pref.preferredDay] ?? null;
    }
    preferredWindow = pref.preferredWindow;
  }

  if (dateOverride || windowOverride) {
    if (dateOverride) {
      const dayMatch = dateOverride.match(
        /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/
      );
      if (dayMatch) {
        const dayMap: Record<string, number> = {
          Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
          Thursday: 4, Friday: 5, Saturday: 6,
        };
        preferredDay = dayMap[dayMatch[1]];
      }
    }
    if (windowOverride) {
      preferredWindow = windowOverride;
    }
  }

  return computeNextWindowFromSchedule(normalized, preferredDay, preferredWindow);
}

/**
 * Handle user-modified laundry/DC pickup time.
 * Parses the override date and window and builds a BookingDefaults.
 */
function computeOverriddenLaundryPickup(
  serviceCategory: string,
  dateOverride: string,
  windowOverride: string
): BookingDefaults {
  const isDryClean = serviceCategory === "dry-cleaning";
  const now = getNowInLA();

  // Parse the window override (e.g., "7–10 AM" or "7–8 PM")
  let startHour = 7, startMinute = 0, endHour = 10, endMinute = 0;
  const windowMatch = windowOverride.match(/(\d+)(?::(\d+))?\s*[–-]\s*(\d+)(?::(\d+))?\s*(AM|PM)/i);
  if (windowMatch) {
    startHour = parseInt(windowMatch[1]);
    startMinute = parseInt(windowMatch[2] || "0");
    endHour = parseInt(windowMatch[3]);
    endMinute = parseInt(windowMatch[4] || "0");

    const period = windowMatch[5].toUpperCase();
    if (period === "PM" && startHour !== 12) startHour += 12;
    if (period === "AM" && startHour === 12) startHour = 0;
    if (period === "PM" && endHour !== 12) endHour += 12;
    if (period === "AM" && endHour === 12) endHour = 0;
  }

  // Parse date override to get the actual date
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthMap: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };

  let pickupDate = new Date(now);
  const dateMatch = dateOverride.match(/(\w+),\s*(\w+)\s+(\d+)/);
  if (dateMatch) {
    const month = monthMap[dateMatch[2]];
    const day = parseInt(dateMatch[3]);
    if (month !== undefined) {
      pickupDate = new Date(now.getFullYear(), month, day);
    }
  }

  pickupDate.setHours(startHour, startMinute, 0, 0);
  const endDate = new Date(pickupDate);
  endDate.setHours(endHour, endMinute, 0, 0);

  const isSameDay = pickupDate.toDateString() === now.toDateString();

  const deliveryEstimate = isDryClean ? "2 business days" : "Within 24 hours of pickup";

  return {
    date: formatDate(pickupDate),
    window: formatTimeWindow(startHour, startMinute, endHour, endMinute),
    recurrence: isDryClean ? null : "weekly",
    scheduled_start_utc: pickupDate.toISOString(),
    scheduled_end_utc: endDate.toISOString(),
    scheduled_start_local: pickupDate.toISOString().replace("Z", "").slice(0, 19),
    scheduled_end_local: endDate.toISOString().replace("Z", "").slice(0, 19),
    timezone: TIMEZONE,
    deliveryEstimate,
    isSameDay,
  };
}

// ─── Preference inference ───

/**
 * Update user preferences after a booking is confirmed.
 * Implements silent drift tracking: after 2 bookings with the same day/window,
 * automatically updates the preference and returns true to trigger the reveal message.
 *
 * Returns: { driftDetected: boolean, preferredDay: string | null, service: string }
 */
export async function updatePreferencesFromBooking(
  bldgUserId: number,
  serviceCategory: string,
  bookingDate: string,
  bookingWindow: string,
  recurrence: string | null
): Promise<{ driftDetected: boolean; preferredDay: string | null; service: string }> {
  const normalized = normalizeServiceCategory(serviceCategory);

  const dayMatch = bookingDate.match(
    /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/
  );
  const currentDay = dayMatch ? dayMatch[1] : null;

  const existing = await getPreference(bldgUserId, normalized as any);

  let driftDetected = false;

  if (existing && existing.preferredDay && existing.preferredWindow) {
    const isDifferentDay = currentDay !== existing.preferredDay;
    const isDifferentWindow = bookingWindow !== existing.preferredWindow;

    if (isDifferentDay || isDifferentWindow) {
      const newDriftCount = (existing.driftWindowCount || 0) + 1;
      const newWindowVal = `${currentDay} ${bookingWindow}`;

      if (newDriftCount >= 2) {
        await upsertPreference({
          bldgUserId,
          serviceCategory: normalized as any,
          autoSchedule: "enabled",
          preferredDay: currentDay,
          preferredWindow: bookingWindow,
          lastBookedDate: bookingDate,
          recurrenceInterval: recurrence,
          driftWindowCount: 0,
          driftWindowLastVal: newWindowVal,
          driftWindowLastAt: new Date(),
        });
        driftDetected = true;
      } else {
        await upsertPreference({
          bldgUserId,
          serviceCategory: normalized as any,
          autoSchedule: existing.autoSchedule,
          preferredDay: existing.preferredDay,
          preferredWindow: existing.preferredWindow,
          lastBookedDate: bookingDate,
          recurrenceInterval: recurrence,
          driftWindowCount: newDriftCount,
          driftWindowLastVal: newWindowVal,
          driftWindowLastAt: new Date(),
        });
      }
    } else {
      await upsertPreference({
        bldgUserId,
        serviceCategory: normalized as any,
        autoSchedule: "enabled",
        preferredDay: currentDay,
        preferredWindow: bookingWindow,
        lastBookedDate: bookingDate,
        recurrenceInterval: recurrence,
        driftWindowCount: 0,
      });
    }
  } else {
    await upsertPreference({
      bldgUserId,
      serviceCategory: normalized as any,
      autoSchedule: "enabled",
      preferredDay: currentDay,
      preferredWindow: bookingWindow,
      lastBookedDate: bookingDate,
      recurrenceInterval: recurrence,
      driftWindowCount: 0,
    });
  }

  return {
    driftDetected,
    preferredDay: currentDay,
    service: normalized,
  };
}

// ─── Duplicate booking guardrail ───

/**
 * Check if a user already has an active booking for a service category.
 * Active = status IN (scheduled, confirmed) AND service_date >= now()
 */
export async function findDuplicateBooking(
  bldgUserId: number,
  serviceCategory: string
): Promise<ServiceRequest | null> {
  const normalized = normalizeServiceCategory(serviceCategory);
  const requests = await getServiceRequests(bldgUserId);
  const now = getNowInLA();

  const duplicate = requests.find((req) => {
    if (normalizeServiceCategory(req.serviceType) !== normalized) return false;
    if (req.status !== "pending" && req.status !== "confirmed") return false;

    if (!req.scheduledDate) return false;
    const dateMatch = req.scheduledDate.match(/(\w+), (\w+) (\d+)/);
    if (!dateMatch) return false;

    const monthMap: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    const month = monthMap[dateMatch[2]];
    const day = parseInt(dateMatch[3]);
    const year = now.getFullYear();

    const serviceDate = new Date(year, month, day);
    return serviceDate >= now;
  });

  return duplicate || null;
}
