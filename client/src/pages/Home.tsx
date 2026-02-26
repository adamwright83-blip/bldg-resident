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
import { Send, Phone, MessageSquare, Loader2, LayoutGrid, ChevronDown, Check } from "lucide-react";
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
import TrustCard from "@/components/TrustCard";
import ConfirmationCeremony from "@/components/ConfirmationCeremony";
import { toast } from "sonner";
import ServicesDrawer from "@/components/ServicesDrawer";
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

  const isLaundryCategory = category === "laundry" || category === "dry-cleaning";

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
  const [drawerOpen, setDrawerOpen] = useState(false);
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

  // Clear ceremony index after animation completes (2s)
  useEffect(() => {
    if (ceremonyIndex !== null) {
      const timer = setTimeout(() => setCeremonyIndex(null), 2200);
      return () => clearTimeout(timer);
    }
  }, [ceremonyIndex]);

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
      return "laundry \u00B7 dry cleaning \u00B7 car wash \u00B7 grooming";
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
    const successMsg: ChatMsg = {
      role: "assistant",
      content: PAYMENT_SAVED_MESSAGE,
      createdAt: new Date(),
    };
    setMessages((prev) => {
      const withoutPaymentPrompt = prev.filter((msg) => {
        if (msg.role !== "assistant") return true;
        const content = msg.content.toLowerCase();
        const isLegacyPrompt =
          content.includes("last thing") && content.includes("add a card");
        const isPaymentCollectMeta =
          msg.metadata?.type === "payment_collection" ||
          (msg.metadata?.type === "onboarding_collect" &&
            msg.metadata?.collectType === "payment");
        return !(isLegacyPrompt || isPaymentCollectMeta);
      });

      const last = withoutPaymentPrompt[withoutPaymentPrompt.length - 1];
      if (last?.role === "assistant" && last.content === PAYMENT_SAVED_MESSAGE) {
        return withoutPaymentPrompt;
      }

      return [...withoutPaymentPrompt, successMsg];
    });
    setOnboardingComplete(true);
  }, []);

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
          // Refetch history to pick up post-booking collection messages
          // Use multiple refetches to ensure we catch DB writes
          setTimeout(() => historyQuery.refetch(), 600);
          setTimeout(() => historyQuery.refetch(), 1500);
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

  return (
    // #6: Night mode class on app shell
    <div className={`app-shell ${nightMode ? "night-mode" : ""}`}>
      <div className="chat-container">
      {/* Header */}
      <header className="chat-header">
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

      {/* Messages Area */}
      <div ref={scrollContainerRef} className="chat-messages">
        {/* #4: Overscroll glow */}
        <div className={`overscroll-glow ${showOverscrollGlow && messages.length > 0 ? "visible" : ""}`} />

        <AnimatePresence mode="wait">
          {showEmptyState ? (
            /* ─── State 1: Empty chat — centered large logo + greeting ─── */
            <motion.div
              key="empty-state"
              className="chat-empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ duration: 0.3 }}
            >
              <div className="chat-empty-inner">
                {/* Hero logo — leaps to first message avatar position on first response */}
                <BldgLogo size="hero" mood="breathe" layoutId="bldg-hero-logo" />
                <p className="chat-empty-text">{emptyGreeting}</p>
              </div>
            </motion.div>
          ) : (
            /* ─── State 2: Active chat — avatar next to every BLDG message ─── */
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
                const isRegularBubble = !(isOnboardingCollect || isBooking);

                // Greeting beat stagger: 3-beat choreographed entrance
                const isGreetingBeat = msg.metadata?.type === "system_greeting" && msg.metadata?.beat != null;
                const greetingDelay = isGreetingBeat
                  ? `${(msg.metadata.beat - 1) * 850}ms`
                  : undefined;
                
                return (
                <div
                  key={msg.id || `msg-${i}`}
                  className={msg._justSent && msg.role === "user" ? "bubble-launch" : "message-enter"}
                  style={greetingDelay ? { animationDelay: greetingDelay, opacity: 0, animationFillMode: "forwards" } : undefined}
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
                </div>
                );
              })}

              {/* Typing indicator */}
              {isSending && (
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
      </div>

      {/* Tiles + Composer */}
      <div className="chat-bottom">

        {/* #8: Welcome Chips with stagger entrance — ONLY in empty state */}
        <AnimatePresence>
          {!showTiles && !isSending && messages.length === 0 && (
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

        {/* Service Tiles — #7: with ripple on tap */}
        <AnimatePresence>
          {showTiles && (
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

        {/* Services Drawer trigger — appears when tiles are hidden (after first message) */}
        <AnimatePresence>
          {!showTiles && !isSending && onboardingComplete === true && (
            <motion.button
              className="services-drawer-trigger"
              onClick={() => setDrawerOpen(true)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <LayoutGrid size={14} />
              <span>Services</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* #1 + #2: Composer with exhale animation and breathing pulse */}
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

      {/* Services Drawer — iOS bottom sheet */}
      <ServicesDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        services={SERVICE_TILES.map((t) => ({
          ...t,
          subtitle: t.id === "vault" ? "History · Receipts · ID" : undefined,
        }))}
        onSelectService={(svc) => {
          if (svc.id === "vault") {
            setDrawerOpen(false);
            setShowVault(true);
            return;
          }
          handleSend(svc.prompt);
        }}
        disabled={isSending}
      />

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
