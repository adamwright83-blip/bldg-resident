export type ResidentIntent =
  | { type: "laundry"; confidence: number }
  | { type: "dry-cleaning-request"; confidence: number }
  | { type: "cleaning-request"; confidence: number }
  | { type: "guest-preparation-request"; confidence: number }
  | { type: "airport-transport-request"; confidence: number }
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

  if (/\b(dry[\s-]?clean(?:ing)?|suit|dress shirt|garments?)\b/.test(text)) {
    return { type: "dry-cleaning-request", confidence: 0.84 };
  }

  if (/\b(dog groom|dog groomer|pet groom|groom my dog|grooming appointment|grooming)\b/.test(text)) {
    return { type: "dog-grooming-request", confidence: 0.86 };
  }

  if (/\b(car detail|car wash|auto detail|detailing|wash my car)\b/.test(text)) {
    return { type: "car-wash-request", confidence: 0.86 };
  }

  if (/\b(uber|ride|car to airport|airport pickup|airport dropoff|lax|pick (her|him|them) up from lax)\b/.test(text)) {
    return { type: "airport-transport-request", confidence: 0.86 };
  }

  if (/\b(clean my apartment|apartment cleaning|apartment clean|housekeeper|housekeeping|maid|cleaning service)\b/.test(text)) {
    return { type: "cleaning-request", confidence: 0.78 };
  }

  if (/\b(guest prep|guest preparation|prepare for guests|turnover|mother-in-law|parents visiting|guest coming|guests arrive|before (she|he|they) visits?)\b/.test(text)) {
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
    intent.type === "car-wash-request" ||
    intent.type === "dry-cleaning-request" ||
    intent.type === "airport-transport-request"
  );
}
