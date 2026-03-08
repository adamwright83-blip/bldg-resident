/**
 * BLDG.chat Home — Zero-Ask Fulfillment with conversational onboarding.
 *
 * Phase 2.0: "Breathe Life" micro-interactions integrated:
 *   1. Haptic-feel send animation (bubble launch, send compress, composer exhale)
 *   2. Composer breathing pulse while AI thinks
 *   3. Confirmation card ceremony (champagne glow + ticker)
 *   4. Overscroll glow at conversation top
 *   5. Breathing logo in empty state
 *   6. Night ambient shift (UI color change after 10 PM)
 *   7. Tile tap ripple
 *   8. Welcome chip stagger entrance
 *   9. Booking chip pulse (soonest booking)
 *  10. Avatar presence glow on typing indicator
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Phone, MessageSquare, Loader2, LayoutGrid, ChevronDown, Check, Wrench, Puzzle, Home as HomeIcon, ArrowRight, ArrowLeft } from "lucide-react";
import { API_BASE } from "@/const";
import { trpc } from "@/lib/trpc";
import { StreamingText } from "@/components/StreamingText";
// ActiveBookingsBar removed — all order actions now go through CONFIRMED card
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { PaymentMethodForm } from "@/components/PaymentMethodForm";
import { MicButton } from "@/components/MicButton";
import BldgLogo from "@/components/BldgLogo";
import WasherIcon from "@/components/WasherIcon";
import LaundryConfirmCard from "@/components/LaundryConfirmCard";
import DryCleaningConfirmCard from "@/components/DryCleaningConfirmCard";
import HowItWorksCard from "@/components/HowItWorksCard";
import TrustCard from "@/components/TrustCard";
import ConfirmationCeremony from "@/components/ConfirmationCeremony";
import { toast } from "sonner";
import Vault from "@/pages/Vault";
import AccountSheet from "@/components/AccountSheet";

const STRIPE_PUBLISHABLE_FALLBACK =
  "pk_test_51T0xPHCs30FtFkcGlu6o0Tz9GiFtvXGwVT8mTP6NlFf2HMnZQrPxGsohxnMWifKcq6Bxy0wgoDW3VAly6IuOKr8W000xZJFVx2";
const stripePublishableKey =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim() || STRIPE_PUBLISHABLE_FALLBACK;
const stripeInitError = stripePublishableKey ? null : "Stripe publishable key is unavailable.";
const stripePromise = stripeInitError ? null : loadStripe(stripePublishableKey);
const PAYMENT_SAVED_MESSAGE =
  "You're all set. Your card on file won't be charged until your order is picked up and undergoes intake.";

// ─── Service tile definitions ───

interface ServiceTile {
  id: string;
  label: string;
  prompt: string;
  icon: React.ReactNode;
}

function LaundryIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.38 3.46L16.01 2H8L3.62 3.46A2 2 0 002 5.35V21a1 1 0 001 1h18a1 1 0 001-1V5.35a2 2 0 00-1.62-1.89z" />
      <circle cx="12" cy="13" r="5" />
      <path d="M12 8a5 5 0 014.33 2.5" />
      <circle cx="7" cy="5" r="0.5" fill="currentColor" />
      <circle cx="17" cy="5" r="0.5" fill="currentColor" />
    </svg>
  );
}

function CarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17h14v-5l-2-6H7L5 12v5z" />
      <circle cx="7.5" cy="17" r="1.5" />
      <circle cx="16.5" cy="17" r="1.5" />
      <path d="M3 12h2" />
      <path d="M19 12h2" />
    </svg>
  );
}

function DogIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5" />
      <path d="M14.267 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5" />
      <path d="M8 14v.5" />
      <path d="M16 14v.5" />
      <path d="M11.25 16.25h1.5L12 17l-.75-.75z" />
      <path d="M4.42 11.247A13.152 13.152 0 004 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444a11.702 11.702 0 00-.493-3.309" />
    </svg>
  );
}

function DryCleanIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2h8l2 2H6l2-2z" />
      <path d="M6 4v16a2 2 0 002 2h8a2 2 0 002-2V4" />
      <path d="M12 8v8" />
      <path d="M9 11h6" />
    </svg>
  );
}

function CleaningIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h3" />
      <path d="M17 6h.01" />
      <rect x="1" y="10" width="5" height="12" rx="1" />
      <path d="M7 10v12" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
      <path d="M14 10v12" />
      <path d="M17 10h4v8a2 2 0 01-2 2h-2" />
    </svg>
  );
}

function VaultIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <path d="M12 8v-2" />
      <path d="M12 18v-2" />
      <path d="M8 12H6" />
      <path d="M18 12h-2" />
    </svg>
  );
}

const SERVICE_TILES: ServiceTile[] = [
  { id: "laundry", label: "Laundry", prompt: "Schedule laundry pickup", icon: <LaundryIcon /> },
  { id: "dry-cleaning", label: "Dry Cleaning", prompt: "Schedule dry cleaning pickup", icon: <DryCleanIcon /> },
  { id: "car-wash", label: "Car Wash", prompt: "Schedule car wash", icon: <CarIcon /> },
  { id: "grooming", label: "Grooming", prompt: "Book grooming appointment", icon: <DogIcon /> },
  { id: "cleaning", label: "Cleaning", prompt: "Schedule cleaning service", icon: <CleaningIcon /> },
  { id: "vault", label: "The Vault", prompt: "", icon: <VaultIcon /> },
];

// ─── Services mode grid (8 cards; Pet Sitting distinct from Dog Grooming) ───
interface ServiceGridItem {
  id: string;
  label: string;
  prompt: string;
  icon: React.ReactNode;
  provider: string;
  trustCopy: string;
}
const SERVICES_GRID: ServiceGridItem[] = [
  {
    id: "grooming",
    label: "Dog Grooming",
    prompt: "Book dog grooming appointment",
    icon: <DogIcon />,
    provider: "Current building provider",
    trustCopy: "Handled through the building’s current grooming provider.",
  },
  {
    id: "cleaning",
    label: "Cleaning",
    prompt: "Schedule cleaning service",
    icon: <CleaningIcon />,
    provider: "Current building provider",
    trustCopy: "Handled through the building’s current cleaning provider.",
  },
  {
    id: "laundry",
    label: "Laundry",
    prompt: "Schedule laundry pickup",
    icon: <LaundryIcon />,
    provider: "Laundry Butler",
    trustCopy: "Handled through the building’s current laundry provider.",
  },
  {
    id: "dry-cleaning",
    label: "Dry Cleaning",
    prompt: "Schedule dry cleaning pickup",
    icon: <DryCleanIcon />,
    provider: "Laundry Butler",
    trustCopy: "Handled through the building’s current dry-cleaning provider.",
  },
  {
    id: "car-wash",
    label: "Car Wash",
    prompt: "Schedule car wash",
    icon: <CarIcon />,
    provider: "Current building provider",
    trustCopy: "Handled through the building’s current car-wash provider.",
  },
  {
    id: "handyman",
    label: "Handyman",
    prompt: "Schedule handyman",
    icon: <Wrench size={32} strokeWidth={1.5} />,
    provider: "Current building provider",
    trustCopy: "Handled through the building’s current handyman provider.",
  },
  {
    id: "assembly",
    label: "Assembly",
    prompt: "Schedule furniture assembly",
    icon: <Puzzle size={32} strokeWidth={1.5} />,
    provider: "Current building provider",
    trustCopy: "Handled through the building’s current assembly provider.",
  },
  {
    id: "pet-sitting",
    label: "Pet Sitting",
    prompt: "Schedule pet sitting",
    icon: <HomeIcon size={32} strokeWidth={1.5} />,
    provider: "Current building provider",
    trustCopy: "Handled through the building’s current pet-sitting provider.",
  },
];

type ServiceTimingChoice = "ASAP" | "Tomorrow" | "This week";
const SERVICE_TIMING_CHOICES: ServiceTimingChoice[] = ["ASAP", "Tomorrow", "This week"];

function formatServiceTiming(choice: ServiceTimingChoice): string {
  if (choice === "ASAP") return "ASAP";
  if (choice === "Tomorrow") return "tomorrow";
  return "this week";
}

function buildServiceDraft(
  service: ServiceGridItem,
  timing: ServiceTimingChoice,
  preferredTiming: string,
  notes: string
): string {
  const sentences = [`${service.label} ${formatServiceTiming(timing)}.`];

  if (service.id === "laundry" || service.id === "dry-cleaning") {
    sentences.push("Pickup window 7–10 AM.");
  }

  if (preferredTiming.trim()) {
    sentences.push(`Preferred timing: ${preferredTiming.trim().replace(/[.]+$/, "")}.`);
  }

  if (notes.trim()) {
    sentences.push(`${notes.trim().replace(/[.]+$/, "")}.`);
  }

  return sentences.join(" ");
}

// ─── Type definitions ───

interface BookingMetadata {
  type: "booking";
  serviceRequestId: number;
  service: string;
  date: string;
  window: string;
  recurrence?: string;
}

interface PaymentCollectionMetadata {
  type: "payment_collection";
  bldgUserId: number;
}

interface ChatMsg {
  id?: number;
  role: "user" | "assistant";
  content: string;
  metadata?: BookingMetadata | PaymentCollectionMetadata | any;
  createdAt?: Date;
  /** Tracks whether this is a freshly-sent user message (for launch animation) */
  _justSent?: boolean;
}

// ─── Upgrade catalog (client-side mirror for UI) ───

const UPGRADE_MAP: Record<string, { code: string; label: string; priceCents: number }> = {
  laundry: { code: "hang-dry", label: "Hang dry", priceCents: 500 },
  "car-wash": { code: "interior-detail", label: "Interior detail", priceCents: 2500 },
  cleaning: { code: "deep-kitchen", label: "Deep kitchen clean", priceCents: 5000 },
  grooming: { code: "haircut", label: "Haircut", priceCents: 3500 },
};

// Map display service names to category keys
function serviceToCategory(service: string): string {
  const s = service.toLowerCase();
  if (s.includes("laundry") || s.includes("wash & fold")) return "laundry";
  if (s.includes("dry") && s.includes("clean")) return "dry-cleaning";
  if (s.includes("car")) return "car-wash";
  if (s.includes("clean")) return "cleaning";
  if (s.includes("groom") || s.includes("dog") || s.includes("pet")) return "grooming";
  return "";
}

// ─── #3: Confirmation Card with Ceremony + Item 7: Upgrade Button ───

const MODIFY_TIME_OPTIONS = [
  { date: "Tomorrow", window: "9–11 AM" },
  { date: "Tomorrow", window: "12–2 PM" },
  { date: "Tomorrow", window: "7–9 PM" },
  { date: "This Thursday", window: "7–10 AM" },
  { date: "This Friday", window: "7–10 AM" },
  { date: "This Saturday", window: "9–12 PM" },
];

const FREQUENCY_OPTIONS = [
  { id: "one-time", label: "One-time" },
  { id: "weekly", label: "Weekly" },
  { id: "biweekly", label: "Every 2 weeks" },
  { id: "monthly", label: "Monthly" },
] as const;

type FrequencyId = (typeof FREQUENCY_OPTIONS)[number]["id"];

function normalizeFrequency(recurrence?: string): FrequencyId {
  const value = (recurrence || "").trim().toLowerCase();
  if (value === "weekly") return "weekly";
  if (value === "every 2 weeks" || value === "biweekly" || value === "2-weeks" || value === "2 weeks") {
    return "biweekly";
  }
  if (value === "monthly") return "monthly";
  return "one-time";
}

function frequencyLabel(value: FrequencyId): string {
  return FREQUENCY_OPTIONS.find((opt) => opt.id === value)?.label || "One-time";
}

function ConfirmationCard({
  booking,
  isNew,
  showUpgradeBtn,
  onUpgrade,
  onModify,
  onCancel,
}: {
  booking: BookingMetadata;
  isNew?: boolean;
  showUpgradeBtn?: boolean;
  onUpgrade?: (serviceRequestId: number, upgradeCode: string) => void;
  onModify?: (bookingId: number, newDate: string, newWindow: string) => void;
  onCancel?: (bookingId: number) => void;
}) {
  const [upgradeApplied, setUpgradeApplied] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [showModifyOptions, setShowModifyOptions] = useState(false);
  const [showFrequencySheet, setShowFrequencySheet] = useState(false);
  const [frequency, setFrequency] = useState<FrequencyId>(() =>
    normalizeFrequency(booking.recurrence)
  );
  const [draftFrequency, setDraftFrequency] = useState<FrequencyId>(() =>
    normalizeFrequency(booking.recurrence)
  );

  const category = serviceToCategory(booking.service);
  const upgrade = UPGRADE_MAP[category];
  const showUpgrade = showUpgradeBtn && upgrade && !upgradeApplied && onUpgrade;

  const handleUpgrade = async () => {
    if (!upgrade || !onUpgrade || upgrading) return;
    setUpgrading(true);
    try {
      onUpgrade(booking.serviceRequestId, upgrade.code);
      setUpgradeApplied(true);
    } finally {
      setUpgrading(false);
    }
  };

  const handleTimeSelect = (date: string, window: string) => {
    if (onModify) {
      onModify(booking.serviceRequestId, date, window);
      setShowModifyOptions(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel(booking.serviceRequestId);
    }
  };

  const openFrequencySheet = () => {
    setDraftFrequency(frequency);
    setShowFrequencySheet(true);
  };

  const saveFrequency = () => {
    setFrequency(draftFrequency);
    setShowFrequencySheet(false);
  };

  const keepWeekly = () => {
    setDraftFrequency("weekly");
    setFrequency("weekly");
    setShowFrequencySheet(false);
  };

  const isDryClean = category === "dry-cleaning";
  const isLaundryCategory = category === "laundry" || isDryClean;

  if (isDryClean) {
    return (
      <>
        <DryCleaningConfirmCard
          service={booking.service}
          date={booking.date}
          window={booking.window}
          isNew={isNew}
          onModify={onModify ? () => setShowModifyOptions(true) : undefined}
        />
        {showModifyOptions && (
          <div className="confirmation-card-modify-options" style={{ marginTop: 8 }}>
            {MODIFY_TIME_OPTIONS.map((opt) => (
              <button
                key={`${opt.date}-${opt.window}`}
                onClick={() => handleTimeSelect(opt.date, opt.window)}
                className="confirmation-card-time-option tappable"
              >
                {opt.date} {opt.window}
              </button>
            ))}
            <button
              onClick={handleCancel}
              className="confirmation-card-btn-cancel-buried tappable"
            >
              Cancel pickup
            </button>
          </div>
        )}
      </>
    );
  }

  if (isLaundryCategory) {
    return (
      <>
        <LaundryConfirmCard
          service={booking.service}
          date={booking.date}
          window={booking.window}
          isNew={isNew}
          onModify={onModify ? () => setShowModifyOptions(true) : undefined}
        />
        {showModifyOptions && (
          <div className="confirmation-card-modify-options" style={{ marginTop: 8 }}>
            {MODIFY_TIME_OPTIONS.map((opt) => (
              <button
                key={`${opt.date}-${opt.window}`}
                onClick={() => handleTimeSelect(opt.date, opt.window)}
                className="confirmation-card-time-option tappable"
              >
                {opt.date} {opt.window}
              </button>
            ))}
            <button
              onClick={handleCancel}
              className="confirmation-card-btn-cancel-buried tappable"
            >
              Cancel pickup
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className={`confirmation-card ${isNew ? "confirmation-ceremony" : "confirmation-enter"}`}>
      <div className="confirmation-card-status">
        <span className={isNew ? "confirmation-ticker" : ""}>CONFIRMED</span>
      </div>
      <div className="confirmation-card-header">
        <span className="confirmation-card-service">{booking.service}</span>
        <button
          type="button"
          className="confirmation-card-frequency-pill tappable"
          onClick={openFrequencySheet}
          aria-label="Edit pickup frequency"
        >
          <span>{frequencyLabel(frequency)}</span>
          <ChevronDown size={12} />
        </button>
      </div>
      <div className="confirmation-card-details">
        <p className="confirmation-card-date">{booking.date}</p>
        <p className="confirmation-card-window">{booking.window}</p>
      </div>
      {upgradeApplied && (
        <div className="confirmation-card-upgrade-applied">
          {upgrade?.label} added. +${(upgrade!.priceCents / 100).toFixed(2)}.
        </div>
      )}
      {showUpgrade && (
        <button
          onClick={handleUpgrade}
          disabled={upgrading}
          className="confirmation-card-upgrade-btn tappable"
        >
          {upgrading ? "..." : `Add ${upgrade.label} +$${(upgrade.priceCents / 100).toFixed(2)}`}
        </button>
      )}

      {onModify && !showModifyOptions && (
        <button
          onClick={() => setShowModifyOptions(true)}
          className="confirmation-card-btn-modify-ghost tappable"
        >
          Modify time
        </button>
      )}
      {showModifyOptions && (
        <div className="confirmation-card-modify-options">
          {MODIFY_TIME_OPTIONS.map((opt) => (
            <button
              key={`${opt.date}-${opt.window}`}
              onClick={() => handleTimeSelect(opt.date, opt.window)}
              className="confirmation-card-time-option tappable"
            >
              {opt.date} {opt.window}
            </button>
          ))}
          <button
            onClick={handleCancel}
            className="confirmation-card-btn-cancel-buried tappable"
          >
            Cancel pickup
          </button>
        </div>
      )}

      <div className="confirmation-card-footer">Fulfilled by BLDG.</div>

      <AnimatePresence>
        {showFrequencySheet && (
          <>
            <motion.div
              className="frequency-sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFrequencySheet(false)}
            />
            <motion.div
              className="frequency-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
            >
              <div className="frequency-sheet-handle" />
              <h3 className="frequency-sheet-title">Pickup Frequency</h3>
              <div className="frequency-sheet-options">
                {FREQUENCY_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setDraftFrequency(option.id)}
                    className="frequency-sheet-option tappable"
                  >
                    <span>{option.label}</span>
                    {draftFrequency === option.id ? <Check size={16} /> : null}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="frequency-sheet-save tappable"
                onClick={saveFrequency}
              >
                Save
              </button>
              <button
                type="button"
                className="frequency-sheet-keep tappable"
                onClick={keepWeekly}
              >
                Keep weekly
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// SuggestedChip component removed — all order actions now go through CONFIRMED card

// ─── Guest session helper ───

type EnsureSessionResult = {
  ok: boolean;
  userId: number | null;
  alreadyExists: boolean;
};

async function ensureSession(): Promise<EnsureSessionResult> {
  try {
    const res = await fetch(`${API_BASE}/api/guest-session`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return { ok: false, userId: null, alreadyExists: false };
    const data = await res.json();
    const userId = typeof data.userId === "number" ? data.userId : null;
    const alreadyExists = Boolean(data.alreadyExists);
    console.log("[Session]", alreadyExists ? "Existing session" : "Created guest session", userId);
    return { ok: true, userId, alreadyExists };
  } catch (err) {
    console.error("[Session] Failed to ensure session:", err);
    return { ok: false, userId: null, alreadyExists: false };
  }
}

// ─── #6: Night mode detection ───

function isNightTime(): boolean {
  const hour = new Date().getHours();
  return hour >= 22 || hour < 6;
}

// ─── #7: Tile ripple helper ───

function createRipple(e: React.MouseEvent<HTMLButtonElement>) {
  const button = e.currentTarget;
  const rect = button.getBoundingClientRect();
  const ripple = document.createElement("span");
  ripple.className = "tile-ripple";
  ripple.style.left = `${e.clientX - rect.left}px`;
  ripple.style.top = `${e.clientY - rect.top}px`;
  button.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove());
}

// ─── Typing pacing helper ───
// Returns how long to show a typing indicator before a message, and how long
// to pause after it renders before the next indicator starts.
function getTypingTiming(text: string): { typing: number; pause: number } {
  const words = text.trim().split(/\s+/).length;
  if (words < 15) return { typing: 800,  pause: 600 };
  if (words < 40) return { typing: 1500, pause: 800 };
  return                 { typing: 2200, pause: 1000 };
}

// ─── Name Input Card (post-booking collection) ───

function NameInputCard({ onSubmit, loading }: { onSubmit: (first: string, last: string) => void; loading?: boolean }) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (first.trim() && last.trim() && !loading) onSubmit(first.trim(), last.trim());
  };
  return (
    <form onSubmit={handleSubmit} className="bldg-name-form">
      <label className="bldg-name-label">What's your name?</label>
      <div className="bldg-name-row">
        <input
          type="text"
          value={first}
          onChange={(e) => setFirst(e.target.value)}
          placeholder="First name"
          className="bldg-name-input"
          autoFocus
          autoComplete="given-name"
          disabled={loading}
        />
        <input
          type="text"
          value={last}
          onChange={(e) => setLast(e.target.value)}
          placeholder="Last name"
          className="bldg-name-input"
          autoComplete="family-name"
          disabled={loading}
        />
      </div>
      <button
        type="submit"
        disabled={!first.trim() || !last.trim() || loading}
        className="bldg-name-submit"
      >
        {loading ? "..." : "Continue"}
      </button>
    </form>
  );
}

// ─── Main Component ───

export default function Home() {
  const utils = trpc.useUtils();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  // showSuggestedChip removed — all order actions now go through CONFIRMED card
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [lastBookingConfirmed, setLastBookingConfirmed] = useState(false);
  // Dot animation states
  const [streamingMsgIndex, setStreamingMsgIndex] = useState<number | null>(null);
  const [settlingMsgIndex, setSettlingMsgIndex] = useState<number | null>(null);
  const [recognizeActive, setRecognizeActive] = useState(false);
  const [confirmDotIndex, setConfirmDotIndex] = useState<number | null>(null);
  const [laundryMode, setLaundryMode] = useState(false);
  const [postBookingPhase, setPostBookingPhase] = useState<"animating" | "name" | "payment" | null>(null);
  const postBookingPhaseRef = useRef(postBookingPhase);
  postBookingPhaseRef.current = postBookingPhase;
  const syncBlockedUntilRef = useRef(0);
  const [postBookingData, setPostBookingData] = useState<{ service: string; date: string; window: string } | null>(null);
  const [collectedFirstName, setCollectedFirstName] = useState<string | null>(null);
  const [collectedLastName, setCollectedLastName] = useState<string | null>(null);
  // Local typing indicator — shows before injected messages (greeting beats,
  // post-booking messages). Separate from isSending which tracks LLM generation.
  const [localTypingActive, setLocalTypingActive] = useState(false);
  // Tracks which greeting beat numbers (1,2,3) have been revealed.
  // Beats hidden until the sequential typing → reveal animation runs.
  const [revealedBeats, setRevealedBeats] = useState<Set<number>>(new Set());
  const greetingInitializedRef = useRef(false);
  const [servicesMode, setServicesMode] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceGridItem | null>(null);
  const [serviceTiming, setServiceTiming] = useState<ServiceTimingChoice>("ASAP");
  const [servicePreferredTiming, setServicePreferredTiming] = useState("");
  const [serviceNotes, setServiceNotes] = useState("");
  const [showVault, setShowVault] = useState(false);
  // #1: Send animation states
  const [sendBtnCompress, setSendBtnCompress] = useState(false);
  const [composerExhale, setComposerExhale] = useState(false);
  // #4: Overscroll glow
  const [showOverscrollGlow, setShowOverscrollGlow] = useState(false);
  // #6: Night mode
  const [nightMode, setNightMode] = useState(isNightTime);
  // Track which message index was just confirmed (for ceremony animation)
  const [ceremonyIndex, setCeremonyIndex] = useState<number | null>(null);
  // Full-screen confirmation ceremony state
  const [ceremonyData, setCeremonyData] = useState<{ service: string; date: string; window: string } | null>(null);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [sessionEpoch, setSessionEpoch] = useState(0);
  const [sessionUserId, setSessionUserId] = useState<number | null>(null);
  const sessionBootstrapRetried = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Ensure session exists on mount (creates guest user if needed)
  useEffect(() => {
    ensureSession().then((session) => {
      setSessionReady(session.ok);
      if (session.userId !== null) {
        setSessionUserId(session.userId);
      }
    });
  }, []);

  // #6: Check night mode every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setNightMode(isNightTime());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Force body/html background when services mode activates — prevents dark bleed outside container
  useEffect(() => {
    const LIGHT = "#F5F0E8";
    const DARK = "#2C2824";
    document.body.style.background = servicesMode ? LIGHT : DARK;
    document.documentElement.style.background = servicesMode ? LIGHT : DARK;
    return () => {
      document.body.style.background = "";
      document.documentElement.style.background = "";
    };
  }, [servicesMode]);

  // Clear messages when session changes to prevent stale data
  useEffect(() => {
    if (!sessionReady) {
      setMessages([]);
    }
  }, [sessionReady]);

  const historyQueryInput = useMemo(
    () => ({
      sessionEpoch,
      sessionUserId: sessionUserId ?? undefined,
    }),
    [sessionEpoch, sessionUserId]
  );

  // Fetch chat history AFTER session is ready
  const historyQuery = trpc.chat.getHistory.useQuery(historyQueryInput, {
    refetchOnWindowFocus: false,
    enabled: sessionReady,
  });

  // Fetch active bookings
  const activeBookingsQuery = trpc.chat.getActiveBookings.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchInterval: 30000,
    enabled: sessionReady,
  });

  const sendMutation = trpc.chat.sendMessage.useMutation();
  const modifyMutation = trpc.chat.modifyRequest.useMutation();
  const cancelMutation = trpc.chat.cancelRequest.useMutation();
  const upgradeMutation = trpc.chat.applyUpgrade.useMutation();
  const startRegistrationMutation = trpc.chat.startRegistration.useMutation();
  const saveNameMutation = trpc.chat.saveName.useMutation();

  // Auto-trigger registration for fresh users (NOT_STARTED)
  const registrationTriggered = useRef(false);
  const lastHistoryUserIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!historyQuery.data) return;
    const historyUserId = historyQuery.data.user?.id ?? null;

    const previousUserId = lastHistoryUserIdRef.current;
    if (previousUserId === null) {
      lastHistoryUserIdRef.current = historyUserId;
      return;
    }
    if (historyUserId === previousUserId) return;

    console.warn("[Session] User changed, resetting chat cache/state");
    lastHistoryUserIdRef.current = historyUserId;
    void utils.chat.getHistory.cancel();
    utils.chat.getHistory.setData(historyQueryInput, {
      messages: [],
      user: null,
      session: { bldgUserId: null },
      onboardingComplete: false,
    });
    void utils.chat.getHistory.invalidate();
    setMessages([]);
    registrationTriggered.current = false;
    sessionBootstrapRetried.current = false;
    setSessionUserId(historyUserId);
    setSessionEpoch((prev) => prev + 1);
  }, [historyQuery.data, historyQueryInput, sessionEpoch, utils]);
  useEffect(() => {
    if (
      historyQuery.data &&
      historyQuery.data.user &&
      historyQuery.data.user.onboardingStep === 0 &&
      !registrationTriggered.current &&
      !startRegistrationMutation.isPending
    ) {
      registrationTriggered.current = true;
      startRegistrationMutation.mutateAsync().then(() => {
        // Refetch history to pick up the new collection message
        setTimeout(() => historyQuery.refetch(), 300);
        setTimeout(() => historyQuery.refetch(), 800);
      }).catch((err) => {
        console.error("[Registration] Failed to start:", err);
        registrationTriggered.current = false; // Allow retry
      });
    }
  }, [historyQuery.data]);

  // Sync history from server
  // Track the last dataUpdatedAt to detect refetch results
  const lastSyncRef = useRef<number>(0);
  useEffect(() => {
    if (historyQuery.data) {
      // If freshly logged in with empty history, clear messages immediately
      if (historyQuery.data.messages.length === 0 && historyQuery.data.user === null) {
        setMessages([]);
        if (!sessionBootstrapRetried.current) {
          sessionBootstrapRetried.current = true;
          ensureSession().then((session) => {
            if (session.ok) {
              setSessionReady(true);
              if (session.userId !== null && session.userId !== sessionUserId) {
                void utils.chat.getHistory.cancel();
                utils.chat.getHistory.setData(historyQueryInput, {
                  messages: [],
                  user: null,
                  session: { bldgUserId: null },
                  onboardingComplete: false,
                });
                void utils.chat.getHistory.invalidate();
                setSessionUserId(session.userId);
                setSessionEpoch((prev) => prev + 1);
              }
              setTimeout(() => historyQuery.refetch(), 250);
            }
          });
        }
        return;
      }
      
      // During the post-booking animation/collection flow (or the brief
      // post-payment local-message window), don't overwrite local messages.
      if (postBookingPhaseRef.current !== null || Date.now() < syncBlockedUntilRef.current) {
        setOnboardingComplete(historyQuery.data.onboardingComplete);
        return;
      }

      const serverMsgs: ChatMsg[] = historyQuery.data.messages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        metadata: m.metadata,
        createdAt: m.createdAt ? new Date(m.createdAt) : undefined,
      }));
      
      // Always sync from server when:
      // 1. First load (messages empty)
      // 2. Server has more messages (new messages from backend like collection prompts)
      // 3. Data timestamp changed (refetch completed)
      const dataTimestamp = historyQuery.dataUpdatedAt || 0;
      if (messages.length === 0 || serverMsgs.length > messages.length || dataTimestamp > lastSyncRef.current) {
        // Preserve _justSent flags and metadata for recent messages
        const merged = serverMsgs.map((sm) => {
          const existing = messages.find((m) => m.id === sm.id);
          let result = existing?._justSent ? { ...sm, _justSent: true } : sm;
          // If server message has no metadata but local message does, preserve local metadata
          if (!result.metadata && existing?.metadata) {
            result = { ...result, metadata: existing.metadata };
          }
          return result;
        });
        setMessages(merged.length > 0 ? merged : serverMsgs);
        lastSyncRef.current = dataTimestamp;
      }
      
      setOnboardingComplete(historyQuery.data.onboardingComplete);
    }
  }, [historyQuery.data, historyQuery.dataUpdatedAt]);

  // Reset greeting state when the active user changes (new session / logout)
  useEffect(() => {
    greetingInitializedRef.current = false;
    setRevealedBeats(new Set());
    setLocalTypingActive(false);
  }, [sessionUserId]);

  // Sequential greeting reveal: show typing indicator before each beat
  useEffect(() => {
    const greetingMsgs = messages.filter(
      (m) => m.metadata?.type === "system_greeting" && m.metadata?.beat != null
    );
    if (greetingMsgs.length === 0 || greetingInitializedRef.current) return;
    greetingInitializedRef.current = true;

    const sorted = [...greetingMsgs].sort(
      (a, b) => (a.metadata!.beat as number) - (b.metadata!.beat as number)
    );

    const timers: ReturnType<typeof setTimeout>[] = [];
    let offset = 0;

    for (const msg of sorted) {
      const beat = msg.metadata!.beat as number;
      const { typing, pause } = getTypingTiming(msg.content);
      const t1Start = offset;
      const t1End   = offset + typing;
      offset = t1End + pause;

      timers.push(setTimeout(() => setLocalTypingActive(true), t1Start));
      timers.push(setTimeout(() => {
        setLocalTypingActive(false);
        setRevealedBeats((prev) => new Set([...prev, beat]));
      }, t1End));
    }

    return () => timers.forEach(clearTimeout);
  }, [messages]);

  // Scroll to bottom when messages change — like real texting
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    // Try scrollIntoView first
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
    // Also force the scroll container to bottom as fallback
    if (scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      if (behavior === "instant") {
        el.scrollTop = el.scrollHeight;
      } else {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      }
    }
  }, []);

  useEffect(() => {
    // Immediate scroll
    scrollToBottom();
    // Delayed scroll to catch post-animation layout shifts
    const t1 = setTimeout(() => scrollToBottom(), 150);
    const t2 = setTimeout(() => scrollToBottom(), 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [messages, isSending, scrollToBottom]);

  // Suggested chip removed — all order actions now go through CONFIRMED card

  // Clear pulse animation after 500ms
  useEffect(() => {
    if (lastBookingConfirmed) {
      const timer = setTimeout(() => setLastBookingConfirmed(false), 500);
      return () => clearTimeout(timer);
    }
  }, [lastBookingConfirmed]);

  // Clear ceremony index after animation completes.
  // Laundry cards need longer (3.5s animation + breathing room).
  useEffect(() => {
    if (ceremonyIndex !== null) {
      const isLaundry = postBookingPhase !== null;
      const delay = isLaundry ? 7000 : 2200;
      const timer = setTimeout(() => setCeremonyIndex(null), delay);
      return () => clearTimeout(timer);
    }
  }, [ceremonyIndex, postBookingPhase]);

  // Post-booking phase: inject name collection messages when transitioning to "name"
  // Each message is preceded by a typing indicator sized to message length.
  //
  // Sequence timing (cumulative from phase="name"):
  //   0ms       typing starts (msg 4 — 26w medium = 1500ms typing)
  //   1500ms    msg 4 reveals, 800ms pause
  //   2300ms    typing starts (msg 4B — 23w medium = 1500ms typing)
  //   3800ms    msg 4B reveals, 800ms pause
  //   4600ms    typing starts (msg 4C — 9w short = 800ms typing)
  //   5400ms    msg 4C reveals, 600ms pause
  //   6000ms    typing starts (name card — 5w short = 800ms typing)
  //   6800ms    name card reveals
  useEffect(() => {
    if (postBookingPhase === "name") {
      const timers: ReturnType<typeof setTimeout>[] = [];
      const guard = (type: string, prev: typeof messages) =>
        prev.some((m) => m.metadata?.type === type);

      // Msg 4 (medium): typing 0 → 1500ms, reveal at 1500ms
      timers.push(setTimeout(() => setLocalTypingActive(true), 0));
      timers.push(setTimeout(() => {
        setLocalTypingActive(false);
        setMessages((prev) => {
          if (guard("post_booking_intro", prev)) return prev;
          return [...prev, {
            role: "assistant" as const,
            content: "That's your first order — and it was that easy. You can adjust the pickup time or cancel anytime using the Modify button above.",
            metadata: { type: "post_booking_intro" },
            createdAt: new Date(),
          }];
        });
      }, 1500));

      // Msg 4B (medium): typing 2300 → 3800ms, reveal at 3800ms
      timers.push(setTimeout(() => setLocalTypingActive(true), 2300));
      timers.push(setTimeout(() => {
        setLocalTypingActive(false);
        setMessages((prev) => {
          if (guard("post_booking_learn", prev)) return prev;
          return [...prev, {
            role: "assistant" as const,
            content: "BLDG learns as you go. Your preferred days, time windows, and services fill in over time — so every order gets easier than the last.",
            metadata: { type: "post_booking_learn" },
            createdAt: new Date(),
          }];
        });
      }, 3800));

      // Msg 4C (short): typing 4600 → 5400ms, reveal at 5400ms
      timers.push(setTimeout(() => setLocalTypingActive(true), 4600));
      timers.push(setTimeout(() => {
        setLocalTypingActive(false);
        setMessages((prev) => {
          if (guard("post_booking_tagline", prev)) return prev;
          return [...prev, {
            role: "assistant" as const,
            content: "One word is all it takes. That's the point.",
            metadata: { type: "post_booking_tagline" },
            createdAt: new Date(),
          }];
        });
      }, 5400));

      // Name card (short): typing 6000 → 6800ms, reveal at 6800ms
      timers.push(setTimeout(() => setLocalTypingActive(true), 6000));
      timers.push(setTimeout(() => {
        setLocalTypingActive(false);
        setMessages((prev) => {
          if (guard("post_booking_name", prev)) return prev;
          return [...prev, {
            role: "assistant" as const,
            content: "Enter your name to proceed.",
            metadata: { type: "post_booking_name" },
            createdAt: new Date(),
          }];
        });
      }, 6800));

      return () => timers.forEach(clearTimeout);
    } else if (postBookingPhase === "payment" && !collectedFirstName) {
      setMessages((prev) => {
        if (prev.some((m) => m.metadata?.type === "post_booking_payment")) return prev;
        return [
          ...prev,
          {
            role: "assistant" as const,
            content: "One last thing — add a payment method so future orders are instant. One word in, service at your door.",
            metadata: { type: "post_booking_payment" },
            createdAt: new Date(),
          },
        ];
      });
    }
  }, [postBookingPhase]);

  // #4: Overscroll glow detection
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setShowOverscrollGlow(container.scrollTop <= 2);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    // Check initial state
    handleScroll();
    return () => container.removeEventListener("scroll", handleScroll);
  }, [messages.length]);

  // Determine empty state greeting (Fixer tone: no "How can I help?")
  const userName = historyQuery.data?.user?.firstName;
  const emptyGreeting = userName
    ? `${userName}.`
    : "What do you need?";

  // Compute last booking index for upgrade button visibility
  const lastBookingIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant" && messages[i].metadata?.type === "booking") return i;
    }
    return -1;
  }, [messages]);

  // ─── Composer placeholder: shows service keywords for new users, ambient tone for returning ───
  const gravityPlaceholder = useMemo(() => {
    // New users with no messages: show service keywords as hint
    if (messages.length <= 1) {
      return "laundry \u00B7 dry cleaning \u00B7 car wash";
    }

    const hour = new Date().getHours();
    const day = new Date().getDay(); // 0=Sun
    const isWeekend = day === 0 || day === 6;

    if (nightMode) {
      const nightLines = [
        "Quiet night.",
        "The building is still.",
        "Late one.",
      ];
      return nightLines[Math.floor(Math.random() * nightLines.length)];
    }
    if (hour >= 6 && hour < 10) {
      return isWeekend ? "Slow morning." : "Morning.";
    }
    if (hour >= 10 && hour < 14) {
      return "What do you need?";
    }
    if (hour >= 14 && hour < 18) {
      return isWeekend ? "Afternoon." : "Say the word.";
    }
    if (hour >= 18 && hour < 22) {
      return "Evening.";
    }
    return "Message BLDG...";
  }, [nightMode]);

  // Service tiles only appear for fully registered users with no messages yet
  const showTiles = !isSending && messages.length === 0 && onboardingComplete === true;
  const showEmptyState = messages.length === 0 && !isSending;

  const handlePaymentSaved = useCallback(() => {
    const isPostBooking = postBookingPhase === "payment";

    const stripPaymentPrompts = (msgs: ChatMsg[]) =>
      msgs.filter((msg) => {
        if (msg.role !== "assistant") return true;
        const content = msg.content.toLowerCase();
        const isLegacyPrompt =
          content.includes("last thing") && content.includes("add a card");
        const isPaymentCollectMeta =
          msg.metadata?.type === "payment_collection" ||
          (msg.metadata?.type === "onboarding_collect" &&
            msg.metadata?.collectType === "payment");
        const isPostBookingLocal =
          msg.metadata?.type === "post_booking_name" ||
          msg.metadata?.type === "post_booking_payment";
        const isPostBookingIntro =
          msg.metadata?.type === "post_booking_intro" ||
          msg.metadata?.type === "post_booking_learn" ||
          msg.metadata?.type === "post_booking_tagline";
        return !(isLegacyPrompt || isPaymentCollectMeta || isPostBookingLocal || isPostBookingIntro);
      });

    if (isPostBooking && postBookingData) {
      // Message 6: How it works card (illustrations)
      const howItWorksMsg: ChatMsg = {
        role: "assistant",
        content: "__HOW_IT_WORKS__",
        metadata: { type: "how_it_works" },
        createdAt: new Date(),
      };
      setMessages((prev) => [...stripPaymentPrompts(prev), howItWorksMsg]);

      // All subsequent messages get typing indicators.
      // Cumulative timings:
      //   200ms   typing → 1000ms   reveal "We'll return..." (7w short)
      //   1600ms  typing → 3100ms   reveal follow-up (37w medium)
      //   3900ms  typing → 5400ms   reveal vault nudge (18w medium)
      //   6200ms  typing → 7700ms   reveal final handoff (22w medium)
      const addMsg = (content: string, delay: number) =>
        setTimeout(() => setMessages((prev) => [...prev, {
          role: "assistant" as const, content, createdAt: new Date(),
        }]), delay);
      const showTyping = (delay: number) =>
        setTimeout(() => setLocalTypingActive(true), delay);
      const hideTyping = (delay: number) =>
        setTimeout(() => setLocalTypingActive(false), delay);

      showTyping(200);
      hideTyping(1000);
      addMsg("We'll return your laundry within 24 hours.", 1000);

      showTyping(1600);
      hideTyping(3100);
      addMsg(
        "Need to leave garment notes? We're happy to go over them at the door. You can also call or text us anytime via the icons top right.",
        3100
      );

      showTyping(3900);
      hideTyping(5400);
      addMsg("Receipts and service history live in Services \u2192 Vault.", 5400);

      showTyping(6200);
      hideTyping(7700);
      addMsg(
        "Laundry, detailing, grooming\u2014all at your door. We bring the best of Los Angeles to you, exactly when you need it.",
        7700
      );
    } else {
      const successMsg: ChatMsg = {
        role: "assistant",
        content: PAYMENT_SAVED_MESSAGE,
        createdAt: new Date(),
      };
      setMessages((prev) => {
        const cleaned = stripPaymentPrompts(prev);
        const last = cleaned[cleaned.length - 1];
        if (last?.role === "assistant" && last.content === PAYMENT_SAVED_MESSAGE) {
          return cleaned;
        }
        return [...cleaned, successMsg];
      });
    }

    setOnboardingComplete(true);
    setPostBookingPhase(null);
    setPostBookingData(null);
    setCollectedFirstName(null);
    setCollectedLastName(null);
    if (isPostBooking) {
      // Block sync for 15s — all local-only post-payment messages must
      // finish rendering before server sync can overwrite them.
      syncBlockedUntilRef.current = Date.now() + 15000;
    } else {
      setTimeout(() => historyQuery.refetch(), 300);
    }
  }, [postBookingPhase, postBookingData, historyQuery]);

  const handleSend = useCallback(
    async (text?: string) => {
      const content = (text || input).trim();
      if (!content || isSending) return;
      if (!sessionReady) {
        console.warn("[Chat] Blocked send while session is not ready");
        return;
      }

      setInput("");
      setIsSending(true);

      // Recognition pulse — dot says "got it" before the response streams
      setRecognizeActive(true);
      setTimeout(() => setRecognizeActive(false), 400);

      const isLaundrySend = content.toLowerCase().includes("laundry");
      setLaundryMode(isLaundrySend);

      // #1: Trigger send animations
      setSendBtnCompress(true);
      setComposerExhale(true);
      setTimeout(() => setSendBtnCompress(false), 350);
      setTimeout(() => setComposerExhale(false), 550);

      // Mark user message with _justSent for bubble-launch animation
      const userMsg: ChatMsg = { role: "user", content, createdAt: new Date(), _justSent: true };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const response = await sendMutation.mutateAsync({ content });
        const collectStep = (response as any).collectStep as string | undefined;
        const collectMetadata = collectStep
          ? {
              type: "onboarding_collect" as const,
              collectType: collectStep,
            }
          : undefined;

        const assistantMsg: ChatMsg = {
          role: "assistant",
          content: response.content,
          metadata: response.booking
            ? { type: "booking", ...response.booking }
            : collectMetadata,
          createdAt: new Date(),
        };

        // Trigger full-screen ceremony for non-laundry bookings only.
        // Laundry bookings use the inline washer confirmation card as their ceremony.
        if (response.booking) {
          const svc = response.booking.service.toLowerCase();
          const isLaundryBooking = svc.includes("laundry") || svc.includes("wash & fold") || svc.includes("dry clean");
          if (!isLaundryBooking) {
            setCeremonyData({
              service: response.booking.service,
              date: response.booking.date,
              window: response.booking.window,
            });
          }

          // Post-booking gate: animation owns the screen for 5 seconds,
          // then we collect name/payment sequentially.
          // Only gate if the user is genuinely not yet onboarded.
          // Use the local `onboardingComplete` state first (set synchronously by
          // handlePaymentSaved) to avoid acting on a stale historyQuery cache.
          const userData = historyQuery.data?.user;
          const alreadyOnboarded = onboardingComplete === true || (userData as any)?.paymentMethodSaved;
          const needsName = !alreadyOnboarded && !userData?.firstName;
          const needsPayment = !alreadyOnboarded && !(userData as any)?.paymentMethodSaved;
          const shouldGate = isLaundryBooking && !alreadyOnboarded && (needsName || needsPayment);
          if (shouldGate) {
            setPostBookingPhase("animating");
            postBookingPhaseRef.current = "animating";
            setPostBookingData({
              service: response.booking.service,
              date: response.booking.date,
              window: response.booking.window,
            });
            setTimeout(() => {
              setPostBookingPhase(needsName ? "name" : "payment");
            }, 7000);
          }
        }

        setMessages((prev) => {
          const newMsgs = [...prev, assistantMsg];
          const newIndex = newMsgs.length - 1;
          // #3: Track ceremony index for the new booking card
          if (response.booking) {
            setCeremonyIndex(newIndex);
            // Dot confirm swell — the nod that something locked in
            setConfirmDotIndex(newIndex);
            setTimeout(() => setConfirmDotIndex(null), 1000);
          } else {
            // Track streaming state for dot animation
            setStreamingMsgIndex(newIndex);
          }
          return newMsgs;
        });

        if (response.booking) {
          setLastBookingConfirmed(true);
        }

        if ((response as any).onboardingComplete) {
          setOnboardingComplete(true);
        }

        if (response.booking) {
          activeBookingsQuery.refetch();
          // Don't refetch history during the post-booking animation gate —
          // the sync effect would overwrite local messages and kill the animation.
          if (!postBookingPhaseRef.current) {
            setTimeout(() => historyQuery.refetch(), 600);
            setTimeout(() => historyQuery.refetch(), 1500);
          }
        } else {
          // Also refetch after non-booking messages during onboarding collection
          setTimeout(() => historyQuery.refetch(), 400);
          setTimeout(() => historyQuery.refetch(), 1200);
        }
      } catch (err: any) {
        console.error("[Chat] Send error:", err);
        if (err?.data?.code === "UNAUTHORIZED") {
          const session = await ensureSession();
          setSessionReady(session.ok);
          if (session.userId !== null && session.userId !== sessionUserId) {
            void utils.chat.getHistory.cancel();
            utils.chat.getHistory.setData(historyQueryInput, {
              messages: [],
              user: null,
              session: { bldgUserId: null },
              onboardingComplete: false,
            });
            void utils.chat.getHistory.invalidate();
            setSessionUserId(session.userId);
            setSessionEpoch((prev) => prev + 1);
          }
          const sessionMsg: ChatMsg = {
            role: "assistant",
            content: session.ok
              ? "Session restored. Send that again."
              : "Session expired. Refresh and try again.",
            createdAt: new Date(),
          };
          setMessages((prev) => [...prev, sessionMsg]);
          return;
        }
        const fallback: ChatMsg = {
          role: "assistant",
          content: "I'm having a moment \u2014 try again in a few seconds.",
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, fallback]);
      } finally {
        setIsSending(false);
        setLaundryMode(false);
      }
    },
    [input, isSending, sendMutation, activeBookingsQuery, historyQuery]
  );

  // #7: Tile tap with ripple
  const handleTileTap = (tile: ServiceTile, e: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(e);
    if (tile.id === "vault") {
      setShowVault(true);
      return;
    }
    // Small delay so ripple is visible before the tile disappears
    setTimeout(() => handleSend(tile.prompt), 150);
  };

  const handleModify = async (bookingId: number, newDate: string, newWindow: string) => {
    try {
      await modifyMutation.mutateAsync({ serviceRequestId: bookingId, newDate, newWindow });
      activeBookingsQuery.refetch();
      setMessages((prev) => [...prev, {
        role: "assistant", content: `Updated to ${newDate} ${newWindow}.`, createdAt: new Date(),
      }]);
    } catch (err) {
      console.error("[Chat] Modify error:", err);
    }
  };

  const handleCancel = async (bookingId: number) => {
    try {
      await cancelMutation.mutateAsync({ serviceRequestId: bookingId });
      activeBookingsQuery.refetch();
      setMessages((prev) => [...prev, {
        role: "assistant", content: "Pickup cancelled.", createdAt: new Date(),
      }]);
    } catch (err) {
      console.error("[Chat] Cancel error:", err);
    }
  };

  // Item 7: Handle one-tap upgrade from confirmation card
  const handleUpgrade = async (serviceRequestId: number, upgradeCode: string) => {
    try {
      const result = await upgradeMutation.mutateAsync({ serviceRequestId, upgradeCode });
      // Refresh bookings and chat history to show the upgrade message
      activeBookingsQuery.refetch();
      historyQuery.refetch();
    } catch (err) {
      console.error("[Chat] Upgrade error:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNameSubmit = useCallback(async (firstName: string, lastName: string) => {
    try {
      await saveNameMutation.mutateAsync({ firstName, lastName });
      setCollectedFirstName(firstName);
      setCollectedLastName(lastName);
      const userData = historyQuery.data?.user;
      const needsPayment = !(userData as any)?.paymentMethodSaved;
      if (needsPayment) {
        const strippedTypes = new Set(["post_booking_name", "post_booking_intro", "post_booking_learn", "post_booking_tagline"]);
        setMessages((prev) => [
          ...prev.filter((m) => !strippedTypes.has(m.metadata?.type as string)),
          {
            role: "assistant" as const,
            content: `Good to meet you, ${firstName}. One last thing — add a payment method so future orders are instant. One word in, service at your door.`,
            metadata: { type: "post_booking_payment" },
            createdAt: new Date(),
          },
        ]);
        setPostBookingPhase("payment");
      } else {
        setPostBookingPhase(null);
        setPostBookingData(null);
      }
    } catch {
      // Silently handle — name will be collected later
    }
  }, [saveNameMutation, historyQuery]);

  // handleSuggestedChipClick removed — suggested chip eliminated

  const getAvatarMood = (msgIndex: number): "idle" | "orbit" | "settle" | "recognize" | "confirm" => {
    if (confirmDotIndex === msgIndex) return "confirm";
    if (streamingMsgIndex === msgIndex) return "orbit";
    if (settlingMsgIndex === msgIndex) return "settle";
    return "idle";
  };

  // Time-aware welcome chips
  const getTimeAwareChips = (): string[] => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) {
      return ["Schedule laundry", "Book car wash", "Request cleaning"];
    } else if (hour >= 12 && hour < 17) {
      return ["Schedule laundry", "Book grooming", "Request cleaning"];
    } else if (hour >= 17 && hour < 24) {
      return ["Schedule laundry", "Book grooming", "Tomorrow's pickup"];
    } else {
      return ["Schedule laundry", "Book car wash", "Request cleaning"];
    }
  };

  const resetServiceDetail = useCallback(() => {
    setSelectedService(null);
    setServiceTiming("ASAP");
    setServicePreferredTiming("");
    setServiceNotes("");
  }, []);

  const handleServicesPillToggle = useCallback(() => {
    if (servicesMode) {
      resetServiceDetail();
      setServicesMode(false);
      return;
    }
    setServicesMode(true);
  }, [servicesMode, resetServiceDetail]);

  const openServiceDetail = useCallback((service: ServiceGridItem) => {
    setSelectedService(service);
    setServiceTiming("ASAP");
    setServicePreferredTiming("");
    setServiceNotes("");
  }, []);

  const handleAddServiceToChat = useCallback(() => {
    if (!selectedService) return;
    const draft = buildServiceDraft(
      selectedService,
      serviceTiming,
      servicePreferredTiming,
      serviceNotes
    );
    setInput(draft);
    resetServiceDetail();
    setServicesMode(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [selectedService, serviceTiming, servicePreferredTiming, serviceNotes, resetServiceDetail]);

  return (
    // #6: Night mode class on app shell; services-mode swaps palette
    <div
      className={`app-shell ${nightMode ? "night-mode" : ""} ${servicesMode ? "services-shell" : ""}`}
      style={servicesMode ? { background: "#F5F0E8" } : undefined}
    >
      <div
        className={`chat-container ${servicesMode ? "services-container" : ""}`}
        style={servicesMode ? { background: "#F5F0E8" } : undefined}
      >
      {/* Header */}
      <header
        className="chat-header"
        style={servicesMode ? { background: "#F5F0E8", borderBottomColor: "rgba(90,83,74,0.2)", color: "#2C2824" } : undefined}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAccountSheetOpen(true)}
            className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-xs font-semibold text-foreground transition-colors"
            title="Account"
          >
            {historyQuery.data?.user?.firstName?.charAt(0).toUpperCase() || "U"}
          </button>
          <div className="flex items-center gap-1">
            <span className="chat-logo-text">BLDG</span>
            <span className="chat-logo-dot">.</span>
            <span className="chat-logo-suffix">chat</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <a href="sms:+13238074661" className="chat-header-btn" title="Text building management">
            <MessageSquare size={18} strokeWidth={1.5} />
          </a>
          <a href="tel:+13238074661" className="chat-header-btn" title="Call building management">
            <Phone size={18} strokeWidth={1.5} />
          </a>
        </div>
      </header>

      {/* Messages Area — exactly one of: Services panel OR Chat (empty or thread) */}
      <div
        ref={scrollContainerRef}
        className={`chat-messages ${servicesMode ? "services-mode-active" : ""}`}
        style={servicesMode ? { background: "#F5F0E8", color: "#2C2824" } : undefined}
      >
        {servicesMode ? (
          selectedService ? (
            <div className="services-detail-panel">
              <div className="services-detail-block">
                <div className="services-detail-header">
                  <button
                    type="button"
                    className="services-detail-back tappable"
                    onClick={resetServiceDetail}
                  >
                    <ArrowLeft size={16} strokeWidth={1.8} />
                    <span>Back</span>
                  </button>
                  <h2 className="services-detail-title">{selectedService.label}</h2>
                </div>

                <div className="services-detail-card">
                  <div className="services-detail-provider-label">Provider</div>
                  <div className="services-detail-provider-value">{selectedService.provider}</div>
                  <p className="services-detail-trust">{selectedService.trustCopy}</p>

                  <div className="services-detail-section">
                    <div className="services-detail-section-label">Timing</div>
                    <div className="services-detail-timing-group" role="tablist" aria-label="Timing">
                      {SERVICE_TIMING_CHOICES.map((choice) => (
                        <button
                          key={choice}
                          type="button"
                          className={`services-detail-timing-chip ${serviceTiming === choice ? "services-detail-timing-chip-active" : ""}`}
                          onClick={() => setServiceTiming(choice)}
                        >
                          {choice}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="services-detail-section">
                    <label className="services-detail-section-label" htmlFor="service-preferred-timing">
                      Preferred timing (optional)
                    </label>
                    <input
                      id="service-preferred-timing"
                      type="text"
                      value={servicePreferredTiming}
                      onChange={(e) => setServicePreferredTiming(e.target.value)}
                      className="services-detail-input"
                      placeholder="Any timing preference?"
                    />
                  </div>

                  <div className="services-detail-section">
                    <label className="services-detail-section-label" htmlFor="service-notes">
                      Anything we should know?
                    </label>
                    <textarea
                      id="service-notes"
                      value={serviceNotes}
                      onChange={(e) => setServiceNotes(e.target.value)}
                      className="services-detail-textarea"
                      rows={4}
                      placeholder="Optional notes"
                    />
                  </div>

                  <button
                    type="button"
                    className="services-detail-cta tappable"
                    onClick={handleAddServiceToChat}
                  >
                    Add to chat
                  </button>
                </div>
              </div>
              <div className="services-mode-spacer" aria-hidden />
            </div>
          ) : (
            /* ─── Services mode only: no chat layer ─── */
            <div className="services-mode-panel">
              <div className="services-mode-block">
                <h2 className="services-mode-heading">What do you need handled?</h2>
                <p className="services-mode-subcopy">Choose a service.</p>
                <div className="services-mode-grid">
                  {SERVICES_GRID.map((svc) => (
                    <button
                      key={svc.id}
                      type="button"
                      className="services-mode-card tappable"
                      onClick={() => openServiceDetail(svc)}
                    >
                      <span className="services-mode-card-icon">{svc.icon}</span>
                      <span className="services-mode-card-label">{svc.label}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="services-mode-ask-row"
                  onClick={() => {
                    resetServiceDetail();
                    setServicesMode(false);
                    requestAnimationFrame(() => inputRef.current?.focus());
                  }}
                >
                  Need something more specific? Ask instead
                  <ArrowRight size={14} strokeWidth={2} className="services-mode-ask-arrow" />
                </button>
              </div>
              <div className="services-mode-spacer" aria-hidden />
            </div>
          )
        ) : (
          /* ─── Chat mode only: overscroll glow + empty state OR message list ─── */
          <>
            <div className={`overscroll-glow ${showOverscrollGlow && messages.length > 0 ? "visible" : ""}`} />
            <AnimatePresence mode="wait">
              {showEmptyState ? (
                <motion.div
                  key="empty-state"
                  className="chat-empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="chat-empty-inner">
                    <BldgLogo size="hero" mood="breathe" layoutId="bldg-hero-logo" />
                    <p className="chat-empty-text">{emptyGreeting}</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="active-state"
                  className="chat-message-list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
              {messages.map((msg, i) => {
                // Determine message type synchronously at render time (not in useEffect)
                const isOnboardingCollect = msg.role === "assistant" && msg.metadata?.type === "onboarding_collect";
                const isBooking = msg.role === "assistant" && msg.metadata?.type === "booking";
                const isPaymentCollection = msg.role === "assistant" && msg.metadata?.type === "payment_collection";
                const isPostBookingName = msg.role === "assistant" && msg.metadata?.type === "post_booking_name";
                const isPostBookingPayment = msg.role === "assistant" && msg.metadata?.type === "post_booking_payment";
                const isHowItWorks = msg.role === "assistant" && msg.metadata?.type === "how_it_works";

                // During post-booking animation, suppress server-inserted payment_collection messages
                if (isPaymentCollection && postBookingPhase !== null) {
                  return null;
                }

                const isRegularBubble = !(isOnboardingCollect || isBooking || isPostBookingName || isPostBookingPayment || isHowItWorks);

                // Greeting beats: hide until the typing → reveal sequence runs
                const isGreetingBeat = msg.metadata?.type === "system_greeting" && msg.metadata?.beat != null;
                if (isGreetingBeat && !revealedBeats.has(msg.metadata!.beat as number)) return null;

                return (
                <div
                  key={msg.id || `msg-${i}`}
                  className={msg._justSent && msg.role === "user" ? "bubble-launch" : "message-enter"}
                >
                  {/* Skip regular bubble for booking messages (CONFIRMED card shows all info) and onboarding_collect (trust card shows it) */}
                  {isRegularBubble && (
                    <div className={`chat-bubble-row ${msg.role === "user" ? "chat-bubble-row-user" : "chat-bubble-row-assistant"}`}>
                      {/* Avatar — first assistant message participates in hero leap */}
                      {msg.role === "assistant" && (
                        <div className="bldg-avatar">
                          <BldgLogo
                            size="small"
                            mood={getAvatarMood(i)}
                            layoutId={i === 0 ? "bldg-hero-logo" : undefined}
                          />
                        </div>
                      )}
                      <div className={`chat-bubble ${msg.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}`}>
                        {msg.role === "assistant" ? (
                          <div className="chat-bubble-md">
                            <StreamingText
                              content={msg.content}
                              onComplete={() => {
                                setStreamingMsgIndex((prev) => {
                                  if (prev === i) {
                                    // Dot decelerates back to rest
                                    setSettlingMsgIndex(i);
                                    setTimeout(() => setSettlingMsgIndex(null), 750);
                                    return null;
                                  }
                                  return prev;
                                });
                              }}
                            />
                          </div>
                        ) : (
                          <p className="chat-bubble-text">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* #3: Confirmation card with ceremony for new bookings */}
                  {msg.role === "assistant" && msg.metadata?.type === "booking" && (
                    <div className="chat-bubble-row chat-bubble-row-assistant">
                      <div className="bldg-avatar" style={{ visibility: "hidden" }}>
                        <BldgLogo size="small" />
                      </div>
                      <ConfirmationCard booking={msg.metadata} isNew={ceremonyIndex === i} showUpgradeBtn={i === lastBookingIndex} onUpgrade={handleUpgrade} onModify={handleModify} onCancel={handleCancel} />
                    </div>
                  )}

                  {/* Onboarding collection trust cards */}
                  {msg.role === "assistant" && msg.metadata?.type === "onboarding_collect" && (
                    <div className="chat-bubble-row chat-bubble-row-assistant">
                      <div className="bldg-avatar" style={{ visibility: "hidden" }}>
                        <BldgLogo size="small" />
                      </div>
                      {msg.metadata.collectType === "payment" ? (
                        <TrustCard collectType="payment" content={msg.content}>
                          {!stripePromise ? (
                            <p className="chat-bubble-text">
                              {stripeInitError || "Card setup is temporarily unavailable."}
                            </p>
                          ) : !historyQuery.data?.user?.id ? (
                            <p className="chat-bubble-text">Reconnecting your session. Try again in a moment.</p>
                          ) : (
                            <Elements stripe={stripePromise}>
                              <PaymentMethodForm onSuccess={handlePaymentSaved} />
                            </Elements>
                          )}
                        </TrustCard>
                      ) : (
                        <TrustCard collectType={msg.metadata.collectType || "info"} content={msg.content} />
                      )}
                    </div>
                  )}

                  {msg.role === "assistant" && msg.metadata?.type === "payment_collection" && (
                    <div className="chat-bubble-row chat-bubble-row-assistant">
                      <div className="bldg-avatar" style={{ visibility: "hidden" }}>
                        <BldgLogo size="small" />
                      </div>
                      {!stripePromise ? (
                        <p className="chat-bubble-text">
                          {stripeInitError || "Card setup is temporarily unavailable."}
                        </p>
                      ) : !historyQuery.data?.user?.id ? (
                        <p className="chat-bubble-text">Reconnecting your session. Try again in a moment.</p>
                      ) : (
                        <Elements stripe={stripePromise}>
                          <PaymentMethodForm onSuccess={handlePaymentSaved} />
                        </Elements>
                      )}
                    </div>
                  )}

                  {/* Post-booking name collection card */}
                  {isPostBookingName && (
                    <div className="chat-bubble-row chat-bubble-row-assistant message-enter">
                      <div className="bldg-avatar" style={{ visibility: "hidden" }}>
                        <BldgLogo size="small" />
                      </div>
                      <div className="bldg-inline-card">
                        <p className="bldg-inline-card-text">{msg.content}</p>
                        <NameInputCard onSubmit={handleNameSubmit} loading={saveNameMutation.isPending} />
                      </div>
                    </div>
                  )}

                  {/* Post-booking payment collection card */}
                  {isPostBookingPayment && (
                    <div className="chat-bubble-row chat-bubble-row-assistant message-enter">
                      <div className="bldg-avatar" style={{ visibility: "hidden" }}>
                        <BldgLogo size="small" />
                      </div>
                      <div className="bldg-inline-card">
                        <p className="bldg-inline-card-text">{msg.content}</p>
                        {!stripePromise ? (
                          <p className="bldg-inline-card-text" style={{ opacity: 0.5 }}>
                            {stripeInitError || "Card setup is temporarily unavailable."}
                          </p>
                        ) : (
                          <Elements stripe={stripePromise}>
                            <PaymentMethodForm
                              onSuccess={handlePaymentSaved}
                              dark
                              defaultCardholderName={[collectedFirstName, collectedLastName].filter(Boolean).join(" ")}
                            />
                          </Elements>
                        )}
                      </div>
                    </div>
                  )}

                  {/* How it works education card (post-payment) */}
                  {isHowItWorks && (
                    <div className="chat-bubble-row chat-bubble-row-assistant message-enter">
                      <div className="bldg-avatar" style={{ visibility: "hidden" }}>
                        <BldgLogo size="small" />
                      </div>
                      <HowItWorksCard isNew />
                    </div>
                  )}
                </div>
                );
              })}

              {/* Typing indicator — shown for real AI generation (isSending)
                  AND for locally-simulated typing before injected messages */}
              {(isSending || (localTypingActive && postBookingPhase !== "animating")) && (
                <div className="chat-bubble-row chat-bubble-row-assistant message-enter">
                  <div className="bldg-avatar avatar-presence-glow">
                    {laundryMode ? (
                      <WasherIcon animate={false} size={32} />
                    ) : (
                      <BldgLogo
                        size="small"
                        mood={recognizeActive ? "recognize" : "orbit"}
                      />
                    )}
                  </div>
                  {!laundryMode && <div className="typing-shimmer" />}
                </div>
              )}

              <div ref={messagesEndRef} />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Single bottom zone: pill + composer (chips/tiles only in Chat mode) */}
      <div
        className="chat-bottom"
        style={servicesMode ? { background: "#F5F0E8", borderTopColor: "rgba(90,83,74,0.2)" } : undefined}
      >
        {/* Welcome Chips — Chat mode only, empty state */}
        <AnimatePresence>
          {!servicesMode && !showTiles && !isSending && messages.length === 0 && (
            <motion.div
              className="welcome-chips"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
            >
              {getTimeAwareChips().map((chipText, i) => (
                <button
                  key={i}
                  className="welcome-chip tappable chip-stagger"
                  onClick={() => setInput(chipText)}
                >
                  {chipText}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Service Tiles — Chat mode only, empty state */}
        <AnimatePresence>
          {!servicesMode && showTiles && (
            <motion.div
              className="chat-tiles"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
            >
              {SERVICE_TILES.map((tile) => (
                <button
                  key={tile.id}
                  onClick={(e) => handleTileTap(tile, e)}
                  className="chat-tile tappable"
                  disabled={isSending}
                >
                  <span className="chat-tile-icon">{tile.icon}</span>
                  <span className="chat-tile-label">{tile.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Services pill — single instance; toggles Chat / Services mode */}
        {onboardingComplete === true && !isSending && (
          <button
            type="button"
            className={`services-pill ${servicesMode ? "services-pill-active" : ""}`}
            onClick={handleServicesPillToggle}
          >
            <LayoutGrid size={14} />
            <span>Services</span>
          </button>
        )}

        {/* Single composer — shared in both modes */}
        <div className={`chat-composer ${composerExhale ? "composer-exhale" : ""} ${isSending ? "composer-breathing" : ""}`}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={gravityPlaceholder}
            className="chat-input"
            rows={1}
            disabled={isSending}
          />
          <MicButton
            onTranscript={(text) => setInput(text)}
            disabled={isSending}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isSending}
            className={`chat-send-btn ${sendBtnCompress ? "send-btn-compress" : ""}`}
          >
            {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
      </div>

      {/* Full-screen confirmation ceremony overlay */}
      {ceremonyData && (
        <ConfirmationCeremony
          service={ceremonyData.service}
          date={ceremonyData.date}
          window={ceremonyData.window}
          onComplete={() => setCeremonyData(null)}
        />
      )}

      {/* The Vault — full screen overlay */}
      <AnimatePresence>
        {showVault && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            style={{ position: "fixed", inset: 0, zIndex: 900 }}
          >
            <Vault onBack={() => setShowVault(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Account Sheet */}
      <AccountSheet isOpen={accountSheetOpen} onClose={() => setAccountSheetOpen(false)} />
    </div>
  );
}
