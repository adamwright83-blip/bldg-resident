export type ResidentIntent =
  | { type: "laundry"; confidence: number }
  | { type: "cleaning-request"; confidence: number }
  | { type: "guest-preparation-request"; confidence: number }
  | { type: "market-move-opt-in-interest-profile"; confidence: number }
  | { type: "dog-grooming-request"; confidence: number }
  | { type: "car-wash-request"; confidence: number }
  | { type: "unknown"; confidence: number };

export function inferResidentIntent(message: string): ResidentIntent {
  const text = message.trim().toLowerCase().replace(/\s+/g, " ");
  if (!text) return { type: "unknown", confidence: 0 };

  const bareLaundry = /^(laundry|wash|washandflold|wash\s*(&|and)\s*fold)[.!?]?$/.test(text);
  const laundryBooking =
    /\b(laundry pickup|pickup laundry|wash\s*(&|and)\s*fold)\b/.test(text) ||
    /\b(book|schedule|need|want|do|handle|start|set up|get)\b.{0,32}\blaundry\b/.test(text) ||
    /\blaundry\b.{0,32}\b(pickup|picked up|booked|scheduled)\b/.test(text);

  if (bareLaundry || laundryBooking) {
    return { type: "laundry", confidence: 0.92 };
  }

  if (/\b(dog groom|dog groomer|pet groom|grooming)\b/.test(text)) {
    return { type: "dog-grooming-request", confidence: 0.86 };
  }

  if (/\b(car wash|auto detail|detailing)\b/.test(text)) {
    return { type: "car-wash-request", confidence: 0.86 };
  }

  if (/\b(clean my apartment|apartment clean|housekeeping|cleaning)\b/.test(text)) {
    return { type: "cleaning-request", confidence: 0.78 };
  }

  if (/\b(guest prep|guest preparation|prepare for guests|turnover)\b/.test(text)) {
    return { type: "guest-preparation-request", confidence: 0.72 };
  }

  if (/\b(moving|market move|market-move|apartment search|new place)\b/.test(text)) {
    return { type: "market-move-opt-in-interest-profile", confidence: 0.68 };
  }

  return { type: "unknown", confidence: 0 };
}

export function isFutureVendorServiceIntent(intent: ResidentIntent): boolean {
  return (
    intent.type === "cleaning-request" ||
    intent.type === "guest-preparation-request" ||
    intent.type === "dog-grooming-request" ||
    intent.type === "car-wash-request"
  );
}
