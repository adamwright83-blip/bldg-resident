export type HeldServiceBooking = {
  bookingDate?: string | null;
  bookingWindow?: string | null;
  deadline?: string | null;
  orderId?: string | number | null;
  pickupWindow?: string | null;
  returnWindow?: string | null;
  serviceLabel?: string | null;
  status?: string | null;
  type: string;
  vendorName?: string | null;
};

// Customer-facing Laundry Butler service windows — operational truth, never
// "asked" of the LLM. The app KNOWS these; the model only phrases them.
//
// THIS PASS: pickup 7–9am / return 7–9pm. These intentionally match what the
// admin order actually stores — ops mapTimeWindow normalizes every bldg window
// to 7:00am–9:00am — so the resident screen and the admin record agree exactly.
//
// FUTURE: when the vendor/admin scheduling system promotes the customer-facing
// pickup window to 7:30–9:30am (over a 7–9am internal bucket), change ONLY the
// two *_CLOCK constants below and every surface (headline subcopy, operational
// rows, demo state) follows. Do NOT show 7:30–9:30am to the resident until the
// admin order stores it too — never a resident/admin mismatch.
const LAUNDRY_PICKUP_CLOCK = "7–9am";
const LAUNDRY_RETURN_CLOCK = "7–9pm";

export const LAUNDRY_BUTLER_KNOWLEDGE = {
  serviceId: "laundry",
  vendorName: "LAUNDRY BUTLER",
  serviceLabel: "fluff and fold",
  // Single source of truth for the window times (see *_CLOCK above).
  pickupClock: LAUNDRY_PICKUP_CLOCK,
  returnClock: LAUNDRY_RETURN_CLOCK,
  // Sentence forms — used in the chief-of-staff subcopy.
  pickupSentence: `tomorrow morning, ${LAUNDRY_PICKUP_CLOCK}`,
  returnSentence: `tomorrow evening, ${LAUNDRY_RETURN_CLOCK}`,
  // Sentence-form windows (kept for back-compat consumers).
  pickupWindow: `tomorrow morning, ${LAUNDRY_PICKUP_CLOCK}`,
  returnWindow: `tomorrow evening, ${LAUNDRY_RETURN_CLOCK}`,
  // Compact operational-row forms — render as "Tomorrow, 7–9am".
  pickupWindowLabel: `Tomorrow, ${LAUNDRY_PICKUP_CLOCK}`,
  deliveryWindowLabel: `Tomorrow, ${LAUNDRY_RETURN_CLOCK}`,
  canBookInternally: true,
  canAnswerPickupQuestion: true,
  canAnswerReturnQuestion: true,
  canAnswerVendorQuestion: true,
} as const;

export const CAR_DETAIL_KNOWLEDGE = {
  canBookInternally: true,
  defaultBookingDate: "tomorrow",
  defaultBookingWindow: "10am–12pm",
  defaultBookingWindows: ["tomorrow 10am–12pm", "tomorrow 12–2pm", "tomorrow 2–4pm"],
  defaultDuration: "2 hours",
  publicLabel: "car detail",
  serviceId: "car_detail",
  vendorName: "your car detailer",
} as const;

export function isLaundryService(type: string | null | undefined) {
  const normalized = (type ?? "").toLowerCase();
  return normalized.includes("laundry") || normalized.includes("dry_clean") || normalized.includes("dryclean");
}

export function isCarDetailService(type: string | null | undefined) {
  return (type ?? "").toLowerCase().includes("detail");
}

export function withDemoVendorBookingState<T extends HeldServiceBooking>(
  services: T[],
  request: string,
  orderId: number | string,
): T[] {
  return services.map(service => {
    if (isLaundryService(service.type)) {
      return {
        ...service,
        orderId: service.orderId ?? orderId,
        pickupWindow: service.pickupWindow ?? LAUNDRY_BUTLER_KNOWLEDGE.pickupWindowLabel,
        returnWindow: service.returnWindow ?? LAUNDRY_BUTLER_KNOWLEDGE.deliveryWindowLabel,
        serviceLabel: service.serviceLabel ?? LAUNDRY_BUTLER_KNOWLEDGE.serviceLabel,
        status: service.status ?? "booked",
        vendorName: service.vendorName ?? LAUNDRY_BUTLER_KNOWLEDGE.vendorName,
      };
    }

    if (isCarDetailService(service.type)) {
      return withCarDetailBooking(service, request, orderId);
    }

    return service;
  });
}

export function withCarDetailBooking<T extends HeldServiceBooking>(
  service: T,
  request: string,
  orderId: number | string = "manual-car-detail",
): T {
  return {
    ...service,
    bookingDate: service.bookingDate ?? CAR_DETAIL_KNOWLEDGE.defaultBookingDate,
    bookingWindow: service.bookingWindow ?? CAR_DETAIL_KNOWLEDGE.defaultBookingWindow,
    deadline: service.deadline ?? inferDeadlinePhrase(request),
    orderId: service.orderId ?? `manual-car-detail-${orderId}`,
    serviceLabel: service.serviceLabel ?? CAR_DETAIL_KNOWLEDGE.publicLabel,
    status: service.status ?? "booked_internal",
    vendorName: service.vendorName ?? CAR_DETAIL_KNOWLEDGE.vendorName,
  };
}

export function buildLaundryBookedSentence() {
  // Operator-not-narrator: a plain statement of the action just completed.
  // The hard pickup/return facts live in the subcopy + operational rows.
  return `I booked your laundry pickup with LAUNDRY BUTLER.`;
}

export function buildLaundryReturnAnswer() {
  return `${LAUNDRY_BUTLER_KNOWLEDGE.vendorName} picks up tomorrow morning between 7–9am and returns same day between 7–9pm.`;
}

export function buildCarDetailBookedSentence(service: HeldServiceBooking, request: string) {
  const bookingDate = service.bookingDate || CAR_DETAIL_KNOWLEDGE.defaultBookingDate;
  const bookingWindow = service.bookingWindow || CAR_DETAIL_KNOWLEDGE.defaultBookingWindow;
  const beforeGuest = hasGuestDeadline(request) || Boolean(service.deadline);
  return beforeGuest
    ? `I have car detail booked before your guest arrives: ${bookingDate}, ${bookingWindow}.`
    : `I have car detail booked for ${bookingDate}, ${bookingWindow}, with ${CAR_DETAIL_KNOWLEDGE.vendorName}.`;
}

export function inferDeadlinePhrase(text: string) {
  const normalized = text.toLowerCase();
  if (/\b(before|by)\b.*\b(wednesday|thursday|friday|saturday|sunday|monday|tuesday)\b/.test(normalized)) {
    return "before the requested deadline";
  }
  if (hasGuestDeadline(text)) return "before your guest arrives";
  return null;
}

export function hasGuestDeadline(text: string) {
  return /\b(step\s*mother|stepmother|mother|father|guest|guests|arrives?|visits?|coming)\b/i.test(text);
}
