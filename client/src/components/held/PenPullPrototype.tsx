import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { PaymentMethodForm } from "@/components/PaymentMethodForm";
import {
  getProfileOnboardingStep,
  POST_OTP_PROFILE_ONBOARDING_KEY,
} from "./heldProfileOnboarding";
import { isResidentAppTestMode } from "@/lib/residentTestMode";
import { trpc } from "@/lib/trpc";
import { receiptNicheBg } from "./heldReceiptAssets";
import { mergeHeldServices } from "./heldServiceCollection";
import {
  buildHeldServiceLedgerStage,
  isTerminalHeldService,
} from "./heldServiceLedger";
import {
  getHeldCompositePath,
  HeldArtistDrawing,
  type HeldParsedService,
} from "./HeldArtistDrawing";
import { HeldVoiceCaptureTray } from "./HeldVoiceCaptureTray";
import { PenChain } from "./PenChain";
import VendorProposalSection from "./VendorProposalSection";
import { PenCharm } from "./PenCharm";
import { PenPhysicsDebugPanel } from "./PenPhysicsDebugPanel";
import { HELD_LARGE_PEN_TUNING } from "./heldPenTuning";
import { usePenPhysics, type PenUnlockInfo } from "./usePenPhysics";
import type { PenPhysicsTuningOverrides } from "./penPhysics";
import {
  buildPostOrderChiefOfStaffCopy,
  type PostOrderServiceDetail,
  type PostOrderServiceMeta,
} from "@shared/heldPostOrderCopy";
import { isAffirmation } from "@shared/heldPostOrderClassifier";
import {
  buildCarDetailBookedSentence,
  buildLaundryReturnAnswer,
  CAR_DETAIL_KNOWLEDGE,
  isLaundryService,
  LAUNDRY_BUTLER_KNOWLEDGE,
  withCarDetailBooking,
  withDemoVendorBookingState,
} from "@shared/heldVendorKnowledge";

type PenPullPrototypeProps = {
  composerOpen?: boolean;
  debug?: boolean;
  onUnlock?: (info: PenUnlockInfo) => void;
  penAssetSrc?: string;
  reducedMotion?: boolean;
  showDebugControls?: boolean;
  tuning?: PenPhysicsTuningOverrides;
};

const HELD_ASSETS = {
  composerTray: "/held/audiomode-nursery-tray.png",
  courierEnvelope: "/held/held_courier_envelope.png",
  courierHorseOutbound: "/held/held_courier_horse_outbound.png",
  courierHorseReturn: "/held/held_courier_horse_return.png",
  courierHorseHeadTease: "/held/held_courier_head_tease.png",
  courierNote: "/held/held_courier_note.png",
  courierSatchel: "/held/held_courier_satchel.png",
  courierTail: "/held/held_courier_tail.png",
  courierTailGlow: "/held/held_courier_tail_glow.png",
  encyclopedia: "/held/encyclopedia.png",
  galleryBench: "/held/nursery-cradle.png",
  labyrinthBoard: "/held/held_labyrinth_board.png",
  labyrinthKnob: "/held/held_labyrinth_knob.png",
  logoMark: "/held/held-logo-mark.png",
  laundryProvider: "/held/laundry-butler-provider.png",
  microphone: "/held/microphone.png",
  paper: "/held/held-paper-bg.png",
  phoneBody: "/held/phone_3.png",
  phoneCord: "/held/phone_chain_alone.png",
  postTokenField: "/held/textfield-posttoken.png",
  requestCard: "/held/your-request-card.png",
  tokenCarDetail: "/held/token-cardetail.png",
  tokenDogGroom: "/held/token-doggroom.png",
  tokenDryCleaning: "/held/token-dry-cleaning.png",
  tokenHaircut: "/held/token-haircut.png",
  tokenLaundry: "/held/token-laundry.png",
  tokenRide: "/held/token-uber_waymo.png",
  trayEmptyHeld: "/held/nursery-heldscreen.png",
  trayHeldBox: "/held/nursery-heldbox.png",
  trayHeldFlat: "/held/nursery-heldtray.png",
  trayAudio: "/held/nursery-audiotray.png",
  trayClayTokens: "/held/nursery-tray-claytokens.png",
  tray: "/held/nursery-heldscreen.png",
};

const HELD_TUTORIAL_STORAGE_KEYS = {
  instructionsBook: "held.tutorial.instructionsBook.dismissed",
  audioSwipe: "held.tutorial.audioSwipe.dismissed",
  pen: "held.tutorial.penPull.dismissed",
  phone: "held.tutorial.phoneLift.dismissed",
  token: "held.tutorial.clayToken.dismissed",
} as const;

function readHeldTutorialVisible(storageKey: string) {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(storageKey) !== "1";
  } catch {
    return true;
  }
}

function writeHeldTutorialDismissed(storageKey: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, "1");
  } catch {
    // Local storage can be unavailable in private contexts; the UI can still run.
  }
}

function useHeldOneTimeTutorial(storageKey: string) {
  const [isVisible, setIsVisible] = useState(() => readHeldTutorialVisible(storageKey));

  const dismiss = () => {
    setIsVisible(false);
    writeHeldTutorialDismissed(storageKey);
  };

  return [isVisible, dismiss] as const;
}

function useHeldMountedClass(forceWideTouchQa = false) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add("held-app-mounted");

    const syncWideTouchViewport = () => {
      const isWideTouchViewport =
        forceWideTouchQa ||
        (window.innerWidth > 767 &&
          window.matchMedia("(hover: none) and (pointer: coarse)").matches);

      root.classList.toggle("held-wide-touch-viewport", isWideTouchViewport);
      if (isWideTouchViewport) {
        const scale = window.innerWidth / 430;
        root.style.setProperty("--held-wide-touch-scale", String(scale));
        root.style.setProperty(
          "--held-wide-touch-height",
          `${window.innerHeight / scale}px`,
        );
      } else {
        root.style.removeProperty("--held-wide-touch-scale");
        root.style.removeProperty("--held-wide-touch-height");
      }
    };

    syncWideTouchViewport();
    window.addEventListener("resize", syncWideTouchViewport);
    window.visualViewport?.addEventListener("resize", syncWideTouchViewport);

    return () => {
      window.removeEventListener("resize", syncWideTouchViewport);
      window.visualViewport?.removeEventListener("resize", syncWideTouchViewport);
      root.classList.remove("held-app-mounted");
      root.classList.remove("held-wide-touch-viewport");
      root.style.removeProperty("--held-wide-touch-scale");
      root.style.removeProperty("--held-wide-touch-height");
    };
  }, [forceWideTouchQa]);
}

const COMPOSER_KEY_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "⌫"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["⇧", "Z", "X", "C", "V", "B", "N", "M", "↵"],
];

type PrototypeMode =
  | "rest"
  | "choice"
  | "speech"
  | "typing"
  | "requestReady"
  | "editingRequest"
  | "collectName"
  | "collectPayment"
  | "takingCustody"
  | "drawing"
  | "transforming"
  | "held"
  | "orderError";
type HeldTextCommandResponse = {
  displayRequest: string;
  parsedIntent?: {
    services?: HeldParsedService[];
  };
  rawTranscript: string;
};

type HeldTokenAsset = {
  src: string;
  type: string;
};

type HeldAgentResponse = {
  content?: string;
  booking?: {
    serviceRequestId?: number | null;
    service?: string | null;
    date?: string | null;
    window?: string | null;
    recurrence?: string | null;
    orderId?: number | null;
  } | null;
  collectStep?: "name" | "payment";
};

type HeldOrderMode = "new_order" | "modify_existing_order";

const STRIPE_PUBLISHABLE_FALLBACK =
  "pk_test_51T0xPHCs30FtFkcGlu6o0Tz9GiFtvXGwVT8mTP6NlFf2HMnZQrPxGsohxnMWifKcq6Bxy0wgoDW3VAly6IuOKr8W000xZJFVx2";
const stripePublishableKey =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim() ||
  (import.meta.env.DEV ? STRIPE_PUBLISHABLE_FALLBACK : "");
const stripePromise =
  isResidentAppTestMode || !stripePublishableKey ? null : loadStripe(stripePublishableKey);

const TOKEN_POSITIONS: Record<number, Array<{ left: number; top: number }>> = {
  1: [{ left: 50, top: 50 }],
  2: [
    { left: 24, top: 50 },
    { left: 76, top: 50 },
  ],
  3: [
    { left: 18, top: 38 },
    { left: 50, top: 34 },
    { left: 82, top: 40 },
  ],
  4: [
    { left: 17, top: 36 },
    { left: 50, top: 30 },
    { left: 83, top: 38 },
    { left: 50, top: 72 },
  ],
};

const PHONE_ENGAGE_THRESHOLD_Y = -32;
const PHONE_ENGAGED_Y = -68;
const PHONE_ENGAGED_X = -22;

type LabyrinthPanel = "receipts" | "payment" | null;
type CourierStatus = "idle" | "dispatching" | "courier_out";
type CourierSlipMode = "summary" | "detail";

type LabyrinthCategory = {
  id: "receipts" | "payment" | "account" | "residence" | "preferences" | "profile";
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
  active?: boolean;
};

const LABYRINTH_CATEGORIES: LabyrinthCategory[] = [
  { id: "receipts", label: "Receipts", left: 20.5, top: 9.8, width: 22.6, height: 17.8, active: true },
  { id: "payment", label: "Payment", left: 63.2, top: 9.7, width: 21.4, height: 17.5, active: true },
  { id: "account", label: "Account", left: 42.3, top: 35.1, width: 20.7, height: 17.3 },
  { id: "residence", label: "Residence", left: 18.8, top: 65.3, width: 24, height: 18.6 },
  { id: "preferences", label: "Preferences", left: 63.5, top: 65.3, width: 23.2, height: 18.8 },
  { id: "profile", label: "Profile", left: 46.2, top: 79.5, width: 14.9, height: 12.4 },
];

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// Duration of the request-card stamp -> compress -> lift ceremony (Part 1).
// The card's internal timers run: stamp(~0) -> compress(200ms) -> lift(380ms)
// -> lift transition finishes ~580ms. We hand off to the drawing scene right
// as that completes, measured from the moment the user taps "Set it in motion".
const TAKING_CUSTODY_CEREMONY_MS = 580;

function getHeldDebugScenario() {
  if (typeof window === "undefined" || !import.meta.env.DEV) return null;
  const scenario = new URLSearchParams(window.location.search).get("helddrawing");
  if (scenario === "drycleaning") {
    return {
      request: "Dry cleaning in two days",
      services: [{ type: "dry_cleaning" }] as HeldParsedService[],
    };
  }
  if (scenario === "laundry-drycleaning") {
    return {
      request: "Laundry pickup and dry cleaning in two days",
      services: [
        { type: "laundry_pickup", orderId: 101, status: "booked" },
        { type: "dry_cleaning", orderId: 202, status: "booked" },
      ] as HeldParsedService[],
    };
  }
  if (scenario === "laundry") {
    return {
      request: "Laundry pickup in two days",
      services: [{ type: "laundry" }] as HeldParsedService[],
    };
  }
  return null;
}

export default function PenPullPrototype({
  composerOpen: controlledComposerOpen,
  debug: defaultDebug = false,
  onUnlock,
  penAssetSrc = "/held/fountainpenfull.png",
  reducedMotion,
  showDebugControls = false,
  tuning,
}: PenPullPrototypeProps) {
  const forceWideTouchQa =
    showDebugControls &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("wide-touch-qa") === "1";
  useHeldMountedClass(forceWideTouchQa);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const debugScenario = getHeldDebugScenario();
  const editRequestInputRef = useRef<HTMLTextAreaElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [debug, setDebug] = useState(defaultDebug);
  const [draft, setDraft] = useState("");
  const [editDraft, setEditDraft] = useState("");
  const [internalComposerOpen, setInternalComposerOpen] = useState(() => {
    if (typeof window !== "undefined" && import.meta.env.DEV) {
      return new URLSearchParams(window.location.search).get("heldcomposer") === "open";
    }
    return false;
  });
  const [mode, setMode] = useState<PrototypeMode>(() => {
    if (typeof window !== "undefined" && import.meta.env.DEV) {
      const forced = new URLSearchParams(window.location.search).get("heldmode");
      if (forced) return forced as PrototypeMode;
    }
    return "rest";
  });
  // DEV ONLY: expose a mode setter so the motion-audit harness can step screens.
  if (typeof window !== "undefined" && import.meta.env.DEV) {
    (window as unknown as { __setHeldMode?: (m: string) => void }).__setHeldMode = (m: string) =>
      setMode(m as PrototypeMode);
  }
  const [confirmedRequest, setConfirmedRequest] = useState(() => debugScenario?.request ?? "");
  const [confirmedServices, setConfirmedServices] = useState<HeldParsedService[]>(
    () => debugScenario?.services ?? [],
  );
  const [ceremonyServices, setCeremonyServices] = useState<HeldParsedService[]>([]);
  const [debugOpenLaundryVitrine, setDebugOpenLaundryVitrine] = useState(false);
  const [profileOnboardingActive, setProfileOnboardingActive] = useState(false);
  const [rootVitrineToken, setRootVitrineToken] = useState<HeldTokenAsset | null>(null);
  const [heldAgentMessage, setHeldAgentMessage] = useState("");
  const [heldAgentStatus, setHeldAgentStatus] = useState<
    "idle" | "booking" | "needs_name" | "needs_payment" | "confirmed" | "error"
  >("idle");
  const [lastOrderId, setLastOrderId] = useState<number | null>(null);
  const [nameFirst, setNameFirst] = useState("");
  const [nameLast, setNameLast] = useState("");
  const [pendingOrderRequest, setPendingOrderRequest] = useState("");
  const [pendingOrderServices, setPendingOrderServices] = useState<HeldParsedService[]>([]);
  const [speechTranscript, setSpeechTranscript] = useState("");
  const [labyrinthOpen, setLabyrinthOpen] = useState(false);
  const [labyrinthPanel, setLabyrinthPanel] = useState<LabyrinthPanel>(null);
  const [showInstructionsBook, setShowInstructionsBook] = useState(() =>
    readHeldTutorialVisible(HELD_TUTORIAL_STORAGE_KEYS.instructionsBook),
  );
  const [forceShowInstructionsBook, setForceShowInstructionsBook] = useState(false);
  const [instructionsGuideOpen, setInstructionsGuideOpen] = useState(false);
  const [instructionsGuideSeen, setInstructionsGuideSeen] = useState(false);
  const [bootstrapReady, setBootstrapReady] = useState(showDebugControls);
  const [accountOpen, setAccountOpen] = useState(false);
  const [emailPromptOpen, setEmailPromptOpen] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [emailReceiptsDraftEnabled, setEmailReceiptsDraftEnabled] = useState(true);
  const [pendingReceiptServiceRequestId, setPendingReceiptServiceRequestId] = useState<number | null>(null);
  const restoredOrdersRef = useRef(false);
  const hadActiveBookingsRef = useRef(false);
  // True while the courier horse is crossing or the dispatch slip is open —
  // the Labyrinth knob yields the foreground during that ceremony only.
  const [courierForeground, setCourierForeground] = useState(false);
  const [typedCommandStatus, setTypedCommandStatus] = useState<
    "idle" | "summarizing" | "ready" | "error"
  >("idle");
  const [showPenTutorial, dismissPenTutorial] = useHeldOneTimeTutorial(
    HELD_TUTORIAL_STORAGE_KEYS.pen,
  );
  const [showAudioSwipeTutorial, dismissAudioSwipeTutorial] = useHeldOneTimeTutorial(
    HELD_TUTORIAL_STORAGE_KEYS.audioSwipe,
  );
  const sendMessageMutation = trpc.chat.sendMessage.useMutation();
  // Timestamp (ms) when the takingCustody ceremony began, i.e. when the user
  // tapped "Set it in motion" and the request card mounted in its stamped
  // state. Used to hand off to the drawing scene right as the card's
  // stamp -> compress -> lift completes, decoupled from network latency so
  // there is never an empty screen nor a premature cut.
  const takingCustodyStartRef = useRef<number | null>(null);
  const drawingHandoffTimerRef = useRef<number | null>(null);
  const saveNameMutation = trpc.chat.saveName.useMutation();
  const profileQuery = trpc.chat.getVaultProfile.useQuery();
  const activeBookingsQuery = trpc.chat.getActiveBookings.useQuery(undefined, {
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
  const profileData = profileQuery.data;
  const receiptPreferencesMutation = trpc.chat.updateReceiptEmailPreferences.useMutation();
  const emailReceiptMutation = trpc.chat.emailOrderReceipt.useMutation();
  const logoutMutation = trpc.auth.logout.useMutation();
  const residenceLabel = formatHeldResidenceLabel(profileData?.user);

  useEffect(() => {
    if (showDebugControls || restoredOrdersRef.current) return;
    if (profileQuery.isLoading || activeBookingsQuery.isLoading) return;
    restoredOrdersRef.current = true;
    const bookings = activeBookingsQuery.data?.bookings ?? [];
    if (bookings.length > 0) {
      hadActiveBookingsRef.current = true;
      const services = bookings.map(booking => ({
        type: booking.serviceType,
        status: booking.status,
        orderId: booking.orderId ?? booking.id,
        pickupWindow: booking.scheduledWindow,
      })) as HeldParsedService[];
      const request = bookings
        .map(booking => booking.requestSummary?.trim())
        .filter(Boolean)
        .join(" · ") || "Your services are in motion.";
      setConfirmedRequest(request);
      setConfirmedServices(services);
      setLastOrderId(Number(bookings[0].orderId ?? bookings[0].id));
      setHeldAgentStatus("confirmed");
      setHeldAgentMessage("Your services are in motion.");
      setMode("held");
    } else {
      const forceFullOnboarding =
        sessionStorage.getItem(POST_OTP_PROFILE_ONBOARDING_KEY) === "true";
      const profileStep = getProfileOnboardingStep(
        profileQuery.data?.user,
        forceFullOnboarding,
      );
      if (profileStep === "name") {
        setProfileOnboardingActive(true);
        setHeldAgentStatus("needs_name");
        setHeldAgentMessage("First, tell Held who you are.");
        setMode("collectName");
      } else if (profileStep === "payment") {
        setProfileOnboardingActive(true);
        setHeldAgentStatus("needs_payment");
        setHeldAgentMessage("Add your debit card once to finish setting up Held.");
        setMode("collectPayment");
      }
    }
    setEmailDraft(profileQuery.data?.user?.email ?? "");
    setBootstrapReady(true);
  }, [activeBookingsQuery.data, activeBookingsQuery.isLoading, profileQuery.data, profileQuery.isLoading, showDebugControls]);

  useEffect(() => {
    if (!bootstrapReady || showDebugControls || !hadActiveBookingsRef.current) return;
    if (mode !== "held") return;
    const bookings = activeBookingsQuery.data?.bookings ?? [];
    if (bookings.length === 0) {
      hadActiveBookingsRef.current = false;
      setConfirmedRequest("");
      setConfirmedServices([]);
      setLastOrderId(null);
      setHeldAgentStatus("idle");
      setHeldAgentMessage("");
      setMode("rest");
      return;
    }
    setConfirmedServices(bookings.map(booking => ({
      type: booking.serviceType,
      status: booking.status,
      orderId: booking.orderId ?? booking.id,
      pickupWindow: booking.scheduledWindow,
    })) as HeldParsedService[]);
  }, [activeBookingsQuery.data, bootstrapReady, mode, showDebugControls]);

  const saveReceiptEmail = async () => {
    const email = emailDraft.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return;
    await receiptPreferencesMutation.mutateAsync({ email, enabled: emailReceiptsDraftEnabled, prompted: true });
    if (emailReceiptsDraftEnabled && pendingReceiptServiceRequestId) {
      await emailReceiptMutation.mutateAsync({ serviceRequestId: pendingReceiptServiceRequestId }).catch(error =>
        console.warn("[HELD] first receipt email was not sent", error),
      );
    }
    setPendingReceiptServiceRequestId(null);
    setEmailPromptOpen(false);
    await profileQuery.refetch();
  };
  const skipReceiptEmail = async () => {
    await receiptPreferencesMutation.mutateAsync({ prompted: true });
    setEmailPromptOpen(false);
    await profileQuery.refetch();
  };
  const logoutResident = async () => {
    await logoutMutation.mutateAsync();
    localStorage.removeItem("bldg_onboarding_complete");
    localStorage.removeItem("manus-runtime-user-info");
    window.location.href = "/";
  };

  // ── The returning courier (APP-LEVEL — lives here, not in the post-order
  // screen). When the operator answers on admin/driver, the reply lands on the
  // resident's service_request; this watcher polls for it from ANY screen —
  // idle home included — so reopening the app is enough (SMS optional), and it
  // is never blocked by the outbound courier's parked "courier_out" state
  // (the two bugs that made the first live test show nothing).
  type OperatorFollowupReply = {
    serviceRequestId: number;
    operatorTaskId: string | null;
    type: string | null;
    message: string;
    decision: string | null;
    newPickupTimeWindow: string | null;
    newDeliveryTimeWindow: string | null;
  };
  const followupRepliesQuery = trpc.chat.getFollowupReplies.useQuery(undefined, {
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
  const markFollowupSeenMutation = trpc.chat.markFollowupReplySeen.useMutation();
  const [returnReply, setReturnReply] = useState<OperatorFollowupReply | null>(null);
  const [returnPhase, setReturnPhase] = useState<"riding" | "note">("riding");
  const returnNoteTimerRef = useRef<number | null>(null);
  useEffect(() => {
    const next = followupRepliesQuery.data?.replies?.[0] as OperatorFollowupReply | undefined;
    if (!next || returnReply) return;
    setReturnReply(next);
    setReturnPhase("riding");
    if (returnNoteTimerRef.current) window.clearTimeout(returnNoteTimerRef.current);
    returnNoteTimerRef.current = window.setTimeout(() => setReturnPhase("note"), 5400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followupRepliesQuery.data]);
  const dismissReturnReply = () => {
    const r = returnReply;
    if (!r) return;
    markFollowupSeenMutation.mutate({
      serviceRequestId: r.serviceRequestId,
      operatorTaskId: r.operatorTaskId,
    });
    // Approved changes update the visible order truth (the copy builder reads
    // service.pickupWindow / service.returnWindow when present). On the idle
    // home there may be no services in memory — the note itself carried the
    // truth, and the admin order is already revised server-side.
    if (r.decision === "approved" && (r.newDeliveryTimeWindow || r.newPickupTimeWindow)) {
      setConfirmedServices((prev) =>
        prev.map((s) =>
          isLaundryService(s.type)
            ? {
                ...s,
                ...(r.newDeliveryTimeWindow ? { returnWindow: r.newDeliveryTimeWindow } : {}),
                ...(r.newPickupTimeWindow ? { pickupWindow: r.newPickupTimeWindow } : {}),
              }
            : s,
        ),
      );
    }
    setReturnReply(null);
    setReturnPhase("riding");
    void followupRepliesQuery.refetch();
  };
  const composerOpen = controlledComposerOpen ?? internalComposerOpen;
  const composerTrayVisible =
    composerOpen &&
    (mode === "choice" || mode === "typing" || mode === "requestReady");
  const showRequestReady = mode === "requestReady";
  const showHomeWorld =
    mode === "rest" ||
    mode === "choice" ||
    mode === "speech" ||
    mode === "typing" ||
    mode === "requestReady" ||
    mode === "editingRequest" ||
    mode === "collectName" ||
    mode === "collectPayment" ||
    mode === "takingCustody" ||
    mode === "orderError";
  const showPenGesture = showHomeWorld && mode !== "speech";
  const microphoneClassName =
    mode === "speech"
      ? // Voice-capture: the tray owns the middle of the screen, so the mic
        // drops closer to the writing surface instead of floating above it.
        "translate-y-[270px] opacity-100 scale-100"
      : mode === "choice"
        ? "translate-y-[300px] opacity-100 scale-100"
        : mode === "typing"
          ? "-translate-y-[120px] opacity-0 scale-90"
          : "-translate-y-[120px] opacity-0 scale-90";
  const enterSpeechMode = () => {
    inputRef.current?.blur();
    editRequestInputRef.current?.blur();
    dismissAudioSwipeTutorial();
    console.debug("[HELD] entering speech mode");
    setMode("speech");

    if (controlledComposerOpen === undefined) {
      setInternalComposerOpen(false);
    }
  };
  const enterTypingMode = () => {
    if (!draft && speechTranscript) {
      setDraft(speechTranscript);
    }

    if (mode !== "typing") {
      console.debug("[HELD] entering typing mode");
      setMode("typing");
    }

    if (controlledComposerOpen === undefined) {
      setInternalComposerOpen(true);
    }

    if (document.activeElement !== inputRef.current) {
      inputRef.current?.focus({ preventScroll: true });
      window.requestAnimationFrame(() => {
        inputRef.current?.focus({ preventScroll: true });
      });
    }
  };
  const parseTextCommand = async (text: string) => {
    const response = await fetch("/api/held/text-command", {
      body: JSON.stringify({ text }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Text command failed: ${response.status}`);
    }

    return (await response.json()) as HeldTextCommandResponse;
  };
  const applyTextCommandResult = (text: string, result: HeldTextCommandResponse) => {
    const displayRequest = result.displayRequest?.trim() || result.rawTranscript || text;
    setDraft(displayRequest);
    setEditDraft(displayRequest);
    setSpeechTranscript(displayRequest);
    setConfirmedRequest(displayRequest);
    setConfirmedServices(result.parsedIntent?.services ?? []);
    setTypedCommandStatus("ready");
    setMode("requestReady");
  };
  const applyTextCommandFallback = (text: string) => {
    const displayRequest = buildTypedCommandFallback(text);
    setDraft(displayRequest);
    setEditDraft(displayRequest);
    setSpeechTranscript(displayRequest);
    setConfirmedRequest(displayRequest);
    setConfirmedServices(inferServicesFromRequest(displayRequest));
    setTypedCommandStatus("ready");
    setMode("requestReady");
  };
  const submitTypedCommand = async (overrideText?: string) => {
    const text = (overrideText ?? draft).trim();
    if (!text || typedCommandStatus === "summarizing") {
      return;
    }

    console.debug("[HELD] raw typed text received — booking from RAW words (no rewrite)", {
      length: text.length,
    });
    // HELD is a chatbot: book from the resident's RAW words. We deliberately do
    // NOT summarize/rewrite the text before classification/booking. That rewrite
    // (e.g. "laundry" -> "Laundry service needed.") made the request miss the
    // deterministic laundry classifier and fall to the legacy LLM booking path,
    // which lost the confirmed orderId handoff. Any cleaned/display text must be
    // computed AFTER booking, never before, and must never drive classification.
    setConfirmedRequest(text);
    setDraft(text);
    setEditDraft(text);
    setSpeechTranscript(text);
    setConfirmedServices(inferServicesFromRequest(text));
    // Go straight to booking — no "YOUR REQUEST / Set it in motion" card.
    void beginSetInMotion(text, inferServicesFromRequest(text));
  };
  const enterRequestEditMode = (requestOverride?: string) => {
    const nextText = requestOverride?.trim() || confirmedRequest || draft || speechTranscript;
    console.debug("[HELD] edit request clicked", { hasRequest: Boolean(nextText) });
    setEditDraft(nextText);
    setTypedCommandStatus("idle");
    setHeldAgentStatus("idle");
    setMode("editingRequest");
    if (controlledComposerOpen === undefined) {
      setInternalComposerOpen(false);
    }
    window.requestAnimationFrame(() => {
      editRequestInputRef.current?.focus({ preventScroll: true });
      editRequestInputRef.current?.setSelectionRange(nextText.length, nextText.length);
    });
  };
  const submitEditedRequest = () => {
    const text = editDraft.trim();
    if (!text) return;
    void submitTypedCommand(text);
  };
  const clearDrawingHandoff = () => {
    if (drawingHandoffTimerRef.current !== null) {
      window.clearTimeout(drawingHandoffTimerRef.current);
      drawingHandoffTimerRef.current = null;
    }
    takingCustodyStartRef.current = null;
  };
  const handleHeldAgentResponse = (
    response: HeldAgentResponse,
    request: string,
    services: HeldParsedService[]
  ) => {
    // Any branch that leaves takingCustody for a collect/error screen must
    // cancel the pending drawing handoff so a stale ceremony timer can't fire
    // a screen later. The success branch re-arms its own handoff below.
    if (response.collectStep === "name" || response.collectStep === "payment") {
      clearDrawingHandoff();
    }
    if (response.collectStep === "name") {
      setPendingOrderRequest(request);
      setPendingOrderServices(services);
      setHeldAgentStatus("needs_name");
      setHeldAgentMessage(
        response.content ||
          "I have the pickup ready. Add your name once, then I can set it in motion."
      );
      setMode("collectName");
      return;
    }

    if (response.collectStep === "payment") {
      setPendingOrderRequest(request);
      setPendingOrderServices(services);
      setHeldAgentStatus("needs_payment");
      setHeldAgentMessage(
        response.content ||
          "I have the pickup ready. Add a card once, then I can set it in motion."
      );
      setMode("collectPayment");
      return;
    }

    // Booking-id resolver: accept EITHER a real admin order id OR the local
    // service-request id as proof the booking exists. The backend returns
    // serviceRequestId for a captured request even when the admin orderId
    // round-trip is flaky; requiring orderId alone left the resident stuck on
    // "pending / In motion" for a request that was actually booked.
    const bookingId = Number(
      response.booking?.orderId ?? response.booking?.serviceRequestId ?? NaN,
    );
    // QA log: the exact booking truth the server returned + the resolved id.
    console.log("[HELD][booking] server response", {
      booking: response.booking,
      resolvedBookingId: bookingId,
      collectStep: response.collectStep,
    });
    if (response.booking && Number.isFinite(bookingId) && bookingId > 0) {
      const nextServices = services.length
        ? services
        : inferServicesFromRequest(`${request} ${response.booking.service ?? ""}`);
      const bookedServices = markBookableDemoServices(nextServices, request, bookingId);
      const allBookedServices = lastOrderId
        ? mergeHeldServices(confirmedServices, bookedServices)
        : bookedServices;
      setConfirmedRequest(request);
      setConfirmedServices(allBookedServices);
      setPendingOrderRequest("");
      setPendingOrderServices([]);
      setLastOrderId(bookingId);
      setHeldAgentStatus("confirmed");
      setHeldAgentMessage(response.content || "Taking custody.");
      setMode("takingCustody");
      const serviceRequestId = Number(response.booking.serviceRequestId ?? NaN);
      if (Number.isFinite(serviceRequestId) && serviceRequestId > 0) {
        if (profileData?.user?.email && profileData.user.emailReceiptsEnabled) {
          void emailReceiptMutation.mutateAsync({ serviceRequestId }).catch(error =>
            console.warn("[HELD] receipt email was not sent", error),
          );
        } else if (!profileData?.user?.emailReceiptPromptedAt) {
          setPendingReceiptServiceRequestId(serviceRequestId);
          window.setTimeout(() => setEmailPromptOpen(true), TAKING_CUSTODY_CEREMONY_MS + 500);
        }
      }
      // Hand off to the pen-on-canvas drawing scene right as the request
      // card's stamp → compress → lift ceremony completes. Timed from the tap
      // (takingCustodyStartRef), not from this response, so the seam is
      // identical whether the booking resolved instantly or after a slow
      // round-trip — no empty screen, no premature cut. If the network took
      // longer than the ceremony, hand off on the next tick.
      const elapsed =
        takingCustodyStartRef.current !== null
          ? Date.now() - takingCustodyStartRef.current
          : TAKING_CUSTODY_CEREMONY_MS;
      const remaining = Math.max(0, TAKING_CUSTODY_CEREMONY_MS - elapsed);
      if (drawingHandoffTimerRef.current !== null) {
        window.clearTimeout(drawingHandoffTimerRef.current);
      }
      drawingHandoffTimerRef.current = window.setTimeout(() => {
        drawingHandoffTimerRef.current = null;
        takingCustodyStartRef.current = null;
        setMode("drawing");
      }, remaining);
      return;
    }

    clearDrawingHandoff();
    setPendingOrderRequest(request);
    setPendingOrderServices(services);
    setHeldAgentStatus("error");
    setHeldAgentMessage(
      response.content ||
        "This did not set in motion yet. I kept the request here so you can try again."
    );
    setMode("orderError");
  };
  const beginSetInMotion = async (request = confirmedRequest, services = confirmedServices) => {
    const nextRequest = request.trim() || draft.trim() || speechTranscript.trim();
    if (!nextRequest || heldAgentStatus === "booking" || sendMessageMutation.isPending) return;

    console.debug("[HELD] Set it in motion confirmed");
    const orderMode: HeldOrderMode = "new_order";
    console.debug("[HELD] intent flow chosen", { orderMode });
    setConfirmedRequest(nextRequest);
    const nextServices = services.length ? services : inferServicesFromRequest(nextRequest);
    setCeremonyServices(nextServices);
    setConfirmedServices(current =>
      lastOrderId ? mergeHeldServices(current, nextServices) : nextServices,
    );
    setPendingOrderRequest(nextRequest);
    setPendingOrderServices(nextServices);
    setHeldAgentStatus("booking");
    setHeldAgentMessage("Taking custody.");
    setTypedCommandStatus("idle");
    if (controlledComposerOpen === undefined) {
      setInternalComposerOpen(false);
    }
    // Mark the ceremony start so the drawing handoff can be timed off the
    // card's lift completion rather than off network latency.
    takingCustodyStartRef.current = Date.now();
    if (drawingHandoffTimerRef.current !== null) {
      window.clearTimeout(drawingHandoffTimerRef.current);
      drawingHandoffTimerRef.current = null;
    }
    setMode("takingCustody");

    // Idempotency key for this booking attempt: threaded to the server and on to
    // the admin order as the dedup key, so retries/double-submits reuse one order.
    const clientRequestId = `held_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    try {
      const response = (await sendMessageMutation.mutateAsync({
        content: nextRequest,
        orderMode,
        source: "held",
        clientRequestId,
      })) as HeldAgentResponse;
      handleHeldAgentResponse(response, nextRequest, nextServices);
    } catch (error) {
      console.error("[HELD] Set it in motion failed", error);
      clearDrawingHandoff();
      setHeldAgentStatus("error");
      setHeldAgentMessage(
        "This did not set in motion yet. I kept the request here so you can try again."
      );
      setMode("orderError");
    }
  };
  const retryPendingOrder = () => {
    console.debug("[HELD] try again clicked");
    const request = pendingOrderRequest || confirmedRequest || draft || speechTranscript;
    const services = pendingOrderServices.length
      ? pendingOrderServices
      : confirmedServices.length
        ? confirmedServices
        : inferServicesFromRequest(request);
    void beginSetInMotion(request, services);
  };
  const submitHeldName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const firstName = nameFirst.trim();
    const lastName = nameLast.trim();
    if (!firstName || !lastName || saveNameMutation.isPending) return;

    try {
      await saveNameMutation.mutateAsync({
        firstName,
        lastName,
      });
      if (profileOnboardingActive) {
        setHeldAgentStatus("needs_payment");
        setHeldAgentMessage("Add your debit card once to finish setting up Held.");
        setMode("collectPayment");
        await profileQuery.refetch();
        return;
      }
      setHeldAgentMessage(`Good to meet you, ${firstName}. Taking custody.`);
      retryPendingOrder();
    } catch (error) {
      console.error("[HELD] name save failed", error);
      setHeldAgentStatus("error");
      setHeldAgentMessage("I could not save the name yet. Try once more.");
      setMode("orderError");
    }
  };
  const finishProfileOnboarding = async () => {
    sessionStorage.removeItem(POST_OTP_PROFILE_ONBOARDING_KEY);
    setProfileOnboardingActive(false);
    setHeldAgentStatus("idle");
    setHeldAgentMessage("");
    setMode("rest");
    await profileQuery.refetch();
  };
  const physicsTuning = useMemo(
    () => ({
      ...HELD_LARGE_PEN_TUNING,
      ...tuning,
      dragSpringX: {
        ...HELD_LARGE_PEN_TUNING.dragSpringX,
        ...tuning?.dragSpringX,
      },
      dragSpringY: {
        ...HELD_LARGE_PEN_TUNING.dragSpringY,
        ...tuning?.dragSpringY,
      },
    }),
    [tuning]
  );

  const physics = usePenPhysics({
    active: bootstrapReady,
    composerOpen: composerTrayVisible,
    debug,
    onComposerPenSwipe: enterSpeechMode,
    onUnlock: info => {
      dismissPenTutorial();
      if (controlledComposerOpen === undefined) {
        setInternalComposerOpen(true);
      }
      setMode("choice");
      onUnlock?.(info);
    },
    reducedMotion,
    stageRef,
    tuning: physicsTuning,
  });
  const showPenTutorialHint =
    showPenTutorial &&
    showPenGesture &&
    mode === "rest" &&
    !composerTrayVisible &&
    !physics.isPointerActive;
  useEffect(() => {
    if (mode !== "transforming") return undefined;

    // Hand off to "held" only AFTER the full mount ceremony has played.
    // BUG HISTORY: this was hardcoded 2200ms — tuned for the ORIGINAL 1.55s
    // melt (650ms ink + 1550ms clay) and never updated when the gravity-drain
    // melt grew to 2950ms. Flipping mode sets the child's isHeld prop, whose
    // effect forces phase → "settle", CUTTING THE MELT AT ~52% — the wet-
    // sienna pour, the firing, and the cool-down to greige never rendered in
    // any real booking. Keep this in lockstep with HeldTransformingState's
    // own timeline: ink 650ms + clay (2950ms × ceremonySlow, or 800ms under
    // reduced motion) + 250ms settle overlap.
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    const clayMs = reduced ? 800 : 2950 * getCeremonySlowFactor();
    const handoffMs = 650 + clayMs + 250;
    console.log(
      `[HELD][Ceremony] transforming mounted — full ceremony scheduled, handoff to held in ${Math.round(handoffMs)}ms (reducedMotion: ${reduced})`,
    );

    const timer = window.setTimeout(() => {
      setMode("held");
    }, handoffMs);

    return () => window.clearTimeout(timer);
  }, [mode]);

  // Cancel any pending takingCustody -> drawing handoff on unmount so it can
  // never fire a setMode after the component is gone.
  useEffect(
    () => () => {
      if (drawingHandoffTimerRef.current !== null) {
        window.clearTimeout(drawingHandoffTimerRef.current);
        drawingHandoffTimerRef.current = null;
      }
    },
    []
  );

  const reset = () => {
    if (controlledComposerOpen === undefined) {
      setInternalComposerOpen(false);
    }
    setDraft("");
    setSpeechTranscript("");
    setConfirmedRequest("");
    setConfirmedServices([]);
    setDebugOpenLaundryVitrine(false);
    setRootVitrineToken(null);
    setHeldAgentMessage("");
    setHeldAgentStatus("idle");
    setLastOrderId(null);
    setPendingOrderRequest("");
    setPendingOrderServices([]);
    setLabyrinthOpen(false);
    setLabyrinthPanel(null);
    setForceShowInstructionsBook(false);
    setInstructionsGuideOpen(false);
    setInstructionsGuideSeen(false);
    setTypedCommandStatus("idle");
    setMode("rest");
    physics.reset();
  };
  const consumeInstructionsGuide = () => {
    if (!instructionsGuideSeen) {
      setForceShowInstructionsBook(false);
      setInstructionsGuideOpen(false);
      return;
    }

    setInstructionsGuideOpen(false);
    setForceShowInstructionsBook(false);
    setInstructionsGuideSeen(false);
    if (showInstructionsBook) {
      setShowInstructionsBook(false);
      writeHeldTutorialDismissed(HELD_TUTORIAL_STORAGE_KEYS.instructionsBook);
    }
  };
  const toggleInstructionsGuide = () => {
    if (instructionsGuideOpen) {
      consumeInstructionsGuide();
      return;
    }

    setInstructionsGuideOpen(true);
    setInstructionsGuideSeen(true);
  };
  const showInstructionsFromLabyrinth = () => {
    setLabyrinthOpen(false);
    setLabyrinthPanel(null);
    setForceShowInstructionsBook(true);
    setInstructionsGuideOpen(true);
    setInstructionsGuideSeen(true);
  };
  const handleLabyrinthOpenChange = (nextOpen: boolean) => {
    if (nextOpen && instructionsGuideOpen) {
      consumeInstructionsGuide();
    }
    setLabyrinthOpen(nextOpen);
  };

  useEffect(() => {
    if (!showDebugControls) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("postorder") === "1") {
      // Default post-order QA path: a plain request with NO scripted scenario
      // facts. Proves the screen renders only safe, request-grounded narration.
      const request = "Pick up my laundry tomorrow and book dog grooming this week.";
      setConfirmedRequest(request);
      setConfirmedServices(
        markBookableDemoServices([{ type: "laundry_pickup" }, { type: "dog_grooming" }], request, 1),
      );
      setLastOrderId(orderId => orderId ?? 1);
      setMode("held");
      return;
    }

    if (params.get("postorder") === "ceremony") {
      // Ceremony QA path: land in `transforming` so the full mount ceremony
      // (ink → INK GATHERS → settle) replays deterministically. The live flow
      // only reaches this after a successful authenticated order, which QA
      // sessions don't have.
      const request = "Laundry pickup ASAP, dog grooming tomorrow, car detail before Friday.";
      setConfirmedRequest(request);
      setConfirmedServices(
        markBookableDemoServices(
          [{ type: "laundry_pickup" }, { type: "dog_grooming" }, { type: "car_detail" }],
          request,
          1,
        ),
      );
      setLastOrderId(orderId => orderId ?? 1);
      setMode("transforming");
      return;
    }

    if (params.get("postorder") === "courier" || params.get("courier") === "1") {
      // Courier QA path: a vendor-facing laundry schedule change as the active
      // request, so the Muybridge crossing fires deterministically on settle.
      const request = "Can LAUNDRY BUTLER deliver at 5pm instead of 7–9pm?";
      setConfirmedRequest(request);
      setConfirmedServices(
        markBookableDemoServices([{ type: "laundry_pickup" }], request, 1),
      );
      setLastOrderId(orderId => orderId ?? 1);
      setMode("held");
      return;
    }

    if (params.get("postorder") === "demo") {
      // Rich demo path: provider-candidate metadata genuinely exists, so the
      // narration MAY name providers/windows. This is the only path allowed to.
      setConfirmedRequest("Groom Theo this weekend.");
      setConfirmedServices([
        {
          type: "dog_grooming",
          dogName: "Theo",
          providerCandidates: [
            { name: "Maria", window: "Saturday at 11" },
            { name: "Jordan" },
          ],
        },
      ]);
      setLastOrderId(orderId => orderId ?? 1);
      setMode("held");
      return;
    }

    if (params.get("vitrine") !== "1") return;

    setConfirmedRequest("Laundry pickup is in motion.");
    setConfirmedServices(markBookableDemoServices([{ type: "laundry_pickup" }], "Laundry pickup is in motion.", 1));
    setLastOrderId(orderId => orderId ?? 1);
    setMode("held");
    setRootVitrineToken({ src: HELD_ASSETS.tokenLaundry, type: "laundry_pickup" });
  }, [showDebugControls]);

  // ?postorder=ceremony works in PRODUCTION too (the block above is gated to
  // debug builds): the owner must be able to replay the full ink→clay
  // ceremony on the live site without placing a paid booking.
  useEffect(() => {
    if (showDebugControls) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("postorder") !== "ceremony") return;
    const request = "Laundry pickup ASAP, dog grooming tomorrow, car detail before Friday.";
    setConfirmedRequest(request);
    setConfirmedServices(
      markBookableDemoServices(
        [{ type: "laundry_pickup" }, { type: "dog_grooming" }, { type: "car_detail" }],
        request,
        1,
      ),
    );
    setLastOrderId(orderId => orderId ?? 1);
    setMode("transforming");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!bootstrapReady) {
    return (
      <main className="grid h-dvh place-items-center bg-[#f4ecdf] text-[#2a2520]">
        <div className="text-center">
          <img alt="HELD" className="mx-auto h-14 w-14 object-contain" src={HELD_ASSETS.logoMark} />
          <p className="mt-5 font-serif text-[25px] italic">Opening what’s being held.</p>
        </div>
      </main>
    );
  }

  const accountInitials = [profileData?.user?.firstName, profileData?.user?.lastName]
    .filter(Boolean)
    .map(value => String(value).trim().charAt(0).toUpperCase())
    .join("") || "R";

  return (
    <main className="held-app-stage h-dvh min-h-dvh overflow-hidden bg-[#f4ecdf] text-[#2C2824] md:flex md:items-start md:justify-center md:bg-[#151311] md:px-4 md:py-2">
      <section className="held-app-frame relative h-dvh w-screen max-w-none md:h-[min(844px,calc(100dvh-16px))] md:w-full md:max-w-[430px] md:overflow-hidden md:rounded-[48px] md:border-[10px] md:border-[#11100e] md:shadow-[0_24px_80px_rgba(0,0,0,0.44)]">
        <div
          ref={stageRef}
          className="relative h-full w-full overflow-hidden bg-[#f4ecdf]"
          data-composer-open={composerTrayVisible ? "true" : "false"}
          data-held-mode={mode}
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(255,252,246,0.72), rgba(244,235,222,0.86)), url(${HELD_ASSETS.paper})`,
            backgroundPosition: "center",
            backgroundSize: "cover, 420px 420px",
            touchAction: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
        >
          <div className="held-device-notch pointer-events-none absolute left-1/2 top-4 z-20 hidden h-9 w-28 -translate-x-1/2 rounded-full bg-black md:block" />

          {showHomeWorld && (
            <img
              alt=""
              className={`pointer-events-none absolute left-1/2 top-[-154px] z-30 w-[118px] -translate-x-1/2 select-none drop-shadow-[0_16px_26px_rgba(43,28,14,0.24)] transition-[opacity,transform] duration-[960ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${microphoneClassName}`}
              data-held-mic-mode={mode}
              draggable={false}
              src={HELD_ASSETS.microphone}
            />
          )}
          {(mode === "choice" || mode === "speech") && (
            <button
              aria-label="Use microphone"
              className="absolute left-1/2 top-[118px] z-[60] h-[150px] w-[150px] -translate-x-1/2 rounded-full opacity-0"
              onClick={enterSpeechMode}
              type="button"
            />
          )}

          {showHomeWorld && <header className="held-home-header pointer-events-none absolute left-[8%] top-[7%] z-20">
            <img alt="HELD" className="h-10 w-10 object-contain" src={HELD_ASSETS.logoMark} />
            <p className="mt-1 text-[10px] uppercase tracking-[0.32em] text-[#7a6d5f]">
              {residenceLabel}
            </p>
          </header>}

          {showHomeWorld && mode !== "collectName" && mode !== "collectPayment" && <section className="held-home-copy pointer-events-none absolute left-[8%] top-[17%] z-10 max-w-[210px]">
            <h1 className="font-serif text-[42px] leading-none text-[#2d251d]">
              Held.
            </h1>
            <p className="mt-3 max-w-[160px] text-[14px] leading-5 text-[#55493d]">
              {mode === "takingCustody"
                ? "Taking custody."
                : mode === "collectName"
                  ? "Name this motion."
                  : mode === "collectPayment"
                    ? "Secure it once."
                    : mode === "orderError"
                      ? "Not set yet."
                      : "Nothing is in motion yet."}
            </p>
          </section>}

          {showHomeWorld && (
            <img
              alt=""
              className={`held-home-rest-tray pointer-events-none absolute bottom-[-34px] left-1/2 z-10 w-[130%] -translate-x-1/2 select-none drop-shadow-[0_18px_24px_rgba(45,29,16,0.20)] transition-opacity duration-[420ms] ${
                composerTrayVisible ||
                mode === "speech" ||
                mode === "collectName" ||
                mode === "collectPayment" ||
                mode === "takingCustody" ||
                mode === "orderError"
                  ? "opacity-0"
                  : "opacity-100"
              }`}
              draggable={false}
              src={HELD_ASSETS.tray}
            />
          )}

          <div
            aria-hidden="true"
            className={`held-home-divider pointer-events-none absolute bottom-[72px] left-[9%] right-[9%] z-20 h-px bg-[#b78a38] transition-opacity duration-200 ${
              composerTrayVisible ||
              mode === "speech" ||
              mode === "collectName" ||
              mode === "collectPayment" ||
              mode === "takingCustody" ||
              mode === "orderError"
                ? "opacity-0"
                : "opacity-25"
            }`}
          />

          <HeldVoiceCaptureTray
            active={mode === "speech"}
            onConfirmRequest={(request, services) => void beginSetInMotion(request, services)}
            onEditRequest={enterRequestEditMode}
            onTranscriptChange={setSpeechTranscript}
            transcript={speechTranscript}
          />

          {showPenGesture && (
            <>
              <PenChain
                {...physics.chainRefs}
                anchorFill="#9f7528"
                anchorRadius={2.6}
                className="z-30"
                glintStrokeWidth={2.1}
                highlightStroke="rgba(255, 234, 178, 0.58)"
                highlightStrokeWidth={0.8}
                mainStroke="rgba(154, 107, 31, 0.78)"
                mainStrokeWidth={2}
              />
              <PenCharm
                {...physics.penRefs}
                {...physics.pointerHandlers}
                className={`z-[80] ${showPenTutorialHint ? "held-tutorial-pen-nudge" : ""}`}
                objectFit="contain"
                penAssetSrc={penAssetSrc}
                transformOrigin="50% 3%"
              />
              {showPenTutorialHint && (
                <HeldTutorialHint
                  arrowClassName="held-tutorial-arrow-down"
                  className="left-[38%] top-[47%] z-[74] w-[210px] -translate-x-1/2 text-center"
                  label="PULL THE PEN DOWN"
                  message="to make a request."
                />
              )}
            </>
          )}

          <AnimatePresence>
            {rootVitrineToken?.type === "laundry_pickup" ? (
              <LaundryServiceDetail
                key="root-laundry-vitrine"
                onClose={() => setRootVitrineToken(null)}
              />
            ) : rootVitrineToken ? (
              <HeldServiceVitrine
                key="root-service-vitrine"
                displayRequest={confirmedRequest}
                onClose={() => setRootVitrineToken(null)}
                token={rootVitrineToken}
              />
            ) : null}
          </AnimatePresence>

          <div
            className={`pointer-events-none absolute bottom-[6px] left-1/2 z-30 w-[92%] transition-[opacity,transform] duration-[520ms] ${
              composerTrayVisible
                ? "translate-x-[-50%] translate-y-0 opacity-100"
                : "translate-x-[-50%] translate-y-[112%] opacity-0"
            }`}
            style={{
              transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <img
              alt=""
              className="w-full select-none drop-shadow-[0_-16px_34px_rgba(44,32,22,0.22)]"
              draggable={false}
              src={HELD_ASSETS.composerTray}
            />
            <HeldComposerKeyboard />
          </div>

          {mode === "choice" && !physics.isPointerActive && (
            <p className="pointer-events-none absolute bottom-[218px] left-[22%] z-[44] w-[170px] whitespace-nowrap text-center font-serif text-[14px] italic leading-6 text-[#745b45]/88">
              Tap & type your request
            </p>
          )}

          {mode === "choice" && showAudioSwipeTutorial && !physics.isPointerActive && (
            <HeldTutorialHint
              arrowClassName="held-tutorial-arrow-point-right"
              arrowShape="right"
              className="left-[10%] top-[39%] z-[74] w-[190px] text-center"
              compact
              label="AUDIO MODE"
              message="tap and pull the pen right."
              stepNumber={2}
            />
          )}

          {(mode === "choice" || mode === "typing") && (
            <textarea
              ref={inputRef}
              aria-label="Tap & type your request"
              autoCapitalize="sentences"
              autoComplete="off"
              className={`pointer-events-auto absolute left-[14%] right-[14%] z-[96] resize-none rounded-[6px] border px-4 py-3 text-center font-serif text-[17px] italic leading-6 text-[#2c2824] caret-[#9a681f] outline-none transition-[background,border,bottom,box-shadow,opacity] ${
                mode === "typing" ? "bottom-[278px] min-h-[104px]" : "bottom-[186px] min-h-[84px]"
              } ${
                mode === "typing"
                  ? "border-[#cdb792]/45 bg-[#fff8ec]/86 opacity-100 shadow-[0_4px_14px_rgba(50,35,20,0.06)] placeholder:text-[#8a6f55]/58 focus:border-[#b78a38]/50 focus:bg-[#fff9ef]/92"
                  : "border-transparent bg-transparent opacity-100 shadow-none placeholder:text-[#7b5b3e]/90 focus:border-transparent focus:bg-transparent"
              }`}
              data-testid="held-composer-input"
              onChange={event => {
                setDraft(event.currentTarget.value);
                setTypedCommandStatus("idle");
                if (event.currentTarget.value.length > 0) {
                  enterTypingMode();
                }
              }}
              onFocus={() => enterTypingMode()}
              onKeyDown={event => {
                enterTypingMode();
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submitTypedCommand();
                }
              }}
              onPointerDown={event => {
                if (mode === "choice") {
                  enterTypingMode();
                }
                event.currentTarget.focus({ preventScroll: true });
              }}
              onTouchStart={event => {
                if (mode === "choice") {
                  enterTypingMode();
                }
                event.currentTarget.focus({ preventScroll: true });
              }}
              placeholder={mode === "typing" ? "Tap & type your request" : ""}
              enterKeyHint="send"
              rows={4}
              value={draft}
            />
          )}

          {mode === "typing" && (
            <button
              aria-label="Submit typed request"
              className={`absolute bottom-[288px] right-[9%] z-[97] grid h-11 w-11 place-items-center rounded-full border border-[#b78a38]/55 bg-[#c5a475]/80 font-serif text-[22px] leading-none text-[#fffaf2] shadow-[0_8px_18px_rgba(70,43,18,0.18)] transition-[opacity,transform] active:scale-95 ${
                draft.trim() ? "opacity-100" : "opacity-55"
              }`}
              onClick={() => void submitTypedCommand()}
              type="button"
            >
              ↑
            </button>
          )}

          {showRequestReady && (
            <HeldRequestReadyCard
              displayRequest={confirmedRequest || draft}
              isWorking={typedCommandStatus === "summarizing"}
              onConfirm={() => {
                console.debug("[HELD] Set it in motion tapped from typed request");
                void beginSetInMotion();
              }}
              onEdit={enterRequestEditMode}
              onRequestTap={enterRequestEditMode}
            />
          )}

          {mode === "takingCustody" && (
            <HeldRequestReadyCard
              displayRequest={confirmedRequest || draft}
              isStamped
              onConfirm={() => undefined}
              onEdit={enterRequestEditMode}
            />
          )}

          {mode === "collectName" && (
            <HeldLaunchRecoveryCard
              message={heldAgentMessage}
              title="Your name"
            >
              <form className="mt-4 space-y-3" onSubmit={submitHeldName}>
                <input
                  autoComplete="given-name"
                  className="h-12 w-full rounded-[4px] border border-[#d4c2a5]/80 bg-[#fffaf2]/78 px-4 font-serif text-[16px] text-[#2f2923] outline-none placeholder:text-[#8a7a68]"
                  onChange={event => setNameFirst(event.currentTarget.value)}
                  placeholder="First name"
                  value={nameFirst}
                />
                <input
                  autoComplete="family-name"
                  className="h-12 w-full rounded-[4px] border border-[#d4c2a5]/80 bg-[#fffaf2]/78 px-4 font-serif text-[16px] text-[#2f2923] outline-none placeholder:text-[#8a7a68]"
                  onChange={event => setNameLast(event.currentTarget.value)}
                  placeholder="Last name"
                  value={nameLast}
                />
                <button
                  className="min-h-12 w-full text-right font-serif text-[16px] text-[#9a681f] disabled:opacity-50"
                  disabled={!nameFirst.trim() || !nameLast.trim() || saveNameMutation.isPending}
                  type="submit"
                >
                  {saveNameMutation.isPending ? "Saving..." : "Continue →"}
                </button>
              </form>
            </HeldLaunchRecoveryCard>
          )}

          {mode === "collectPayment" && (
            <HeldLaunchRecoveryCard
              actionLabel="Retry"
              message={heldAgentMessage}
              onEdit={enterRequestEditMode}
              onRetry={retryPendingOrder}
              title="Payment"
            >
              <div className="mt-4">
                <Elements stripe={stripePromise}>
                  <PaymentMethodForm
                    dark
                    defaultCardholderName={[nameFirst, nameLast].filter(Boolean).join(" ")}
                    onSuccess={profileOnboardingActive ? finishProfileOnboarding : retryPendingOrder}
                  />
                </Elements>
              </div>
            </HeldLaunchRecoveryCard>
          )}

          {mode === "orderError" && (
            <HeldLaunchRecoveryCard
              actionLabel={sendMessageMutation.isPending ? "Trying..." : "Try again →"}
              message={heldAgentMessage}
              onEdit={enterRequestEditMode}
              onRetry={retryPendingOrder}
              title="Almost"
            />
          )}

          {mode === "editingRequest" && (
            <HeldRequestReadyCard
              displayRequest={editDraft}
              editInputRef={editRequestInputRef}
              editValue={editDraft}
              isEditing
              isWorking={typedCommandStatus === "summarizing"}
              onConfirm={submitEditedRequest}
              onEdit={enterRequestEditMode}
              onEditChange={setEditDraft}
            />
          )}

          {showDebugControls && (
            <div className="absolute bottom-4 left-4 z-50 flex gap-2 text-[11px] text-[#3b3128]">
              <button
                className="rounded-full border border-[#a98545]/45 bg-[#fbf6eb]/80 px-3 py-2 shadow-sm backdrop-blur"
                onClick={() => setDebug(isOpen => !isOpen)}
                type="button"
              >
                debug {debug ? "on" : "off"}
              </button>
              <button
                className="rounded-full border border-[#a98545]/45 bg-[#fbf6eb]/80 px-3 py-2 shadow-sm backdrop-blur"
                onClick={() => {
                  setConfirmedRequest("Laundry pickup is in motion.");
                  setConfirmedServices([{ type: "laundry_pickup" }]);
                  setLastOrderId(orderId => orderId ?? 1);
                  setMode("held");
                  setRootVitrineToken({ src: HELD_ASSETS.tokenLaundry, type: "laundry_pickup" });
                }}
                type="button"
              >
                vitrine
              </button>
              {physics.tilt.permissionStatus === "prompt" && (
                <button
                  className="rounded-full border border-[#a98545]/45 bg-[#fbf6eb]/80 px-3 py-2 shadow-sm backdrop-blur"
                  onClick={physics.requestMotionPermission}
                  type="button"
                >
                  enable motion
                </button>
              )}
            </div>
          )}

          {showDebugControls && debug && (
            <PenPhysicsDebugPanel
              fallbackTilt={physics.tilt.fallbackAngle}
              motionStatus={physics.tilt.permissionStatus}
              onReset={reset}
              onSetFallbackTilt={physics.setFallbackTilt}
              onSimulateUnlock={physics.simulateUnlock}
              snapshot={physics.debugSnapshot}
            />
          )}

          {mode === "drawing" && (
            <HeldArtistDrawing
              displayRequest={confirmedRequest}
              onDrawingComplete={() => setMode("transforming")}
              services={ceremonyServices.length ? ceremonyServices : confirmedServices}
            />
          )}

          {/* Ceremony letterhead — the screen is NEVER a blank bright page.
              While the artist draws (pen-approach delay included), the
              wordmark + a quiet count line anchor the composition, exactly
              like a letterpress page heading. Sits above HeldArtistDrawing
              (z-80) and disappears when the transforming screen brings its
              own header. */}
          {mode === "drawing" && (
            <div className="pointer-events-none absolute left-[8%] right-[8%] top-[7%] z-[86]">
              <p className="font-serif text-[30px] leading-none text-[#2a2520]">Held.</p>
              <p className="mt-2 font-serif text-[13px] italic text-[#6f6254]">
                {(() => {
                  const n = Math.max(1, confirmedServices.length);
                  const words = ["", "One thing is", "Two things are", "Three things are", "Four things are", "Five things are"];
                  return `${words[Math.min(n, 5)] ?? `${n} things are`} being held.`;
                })()}
              </p>
            </div>
          )}

          {(mode === "transforming" || mode === "held") && (
            <HeldTransformingState
              debugOpenLaundryVitrine={debugOpenLaundryVitrine}
              displayRequest={confirmedRequest}
              forceShowInstructionsBook={forceShowInstructionsBook}
              instructionsGuideOpen={instructionsGuideOpen}
              instructionsBookVisible={showInstructionsBook || forceShowInstructionsBook}
              isHeld={mode === "held"}
              lastOrderId={lastOrderId}
              onAddService={(text) => void beginSetInMotion(text, inferServicesFromRequest(text))}
              onCourierForegroundChange={setCourierForeground}
              onDebugLaundryVitrineOpened={() => setDebugOpenLaundryVitrine(false)}
              onInstructionsGuideConsumed={consumeInstructionsGuide}
              onInstructionsGuideToggle={toggleInstructionsGuide}
              penAssetSrc={penAssetSrc}
              residenceLabel={residenceLabel}
              services={confirmedServices}
            />
          )}

          {/* ── Returning courier (APP-LEVEL overlay) ──────────────────────
              The operator replied. Horse rides LEFT→RIGHT (it went out
              right-to-left), then the note opens with the operator's actual
              words. Renders over ANY screen — idle home included — so simply
              reopening the app delivers the reply. */}
          {returnReply && (
            <div className="pointer-events-none absolute inset-0 z-[120]">
              {returnPhase === "riding" && (
                <motion.img
                  src={HELD_ASSETS.courierHorseReturn}
                  alt=""
                  initial={{ x: "-110%" }}
                  animate={{ x: "440%" }}
                  transition={{ duration: 5.2, ease: "linear" }}
                  className="absolute bottom-[24%] left-0 w-[34%] max-w-[340px] drop-shadow-[0_16px_18px_rgba(52,31,12,0.25)]"
                />
              )}
              {returnPhase === "note" && (
                <motion.div
                  initial={{ opacity: 0, y: 26, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="pointer-events-auto absolute left-1/2 top-1/2 w-[86%] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#b4884b]/40 bg-[#f6efe3] p-5 shadow-2xl"
                >
                  <p className="text-[11px] font-bold tracking-[0.18em] text-[#7a5a2e]">
                    LAUNDRY BUTLER — REPLY
                  </p>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#2d2417]">
                    “{returnReply.message}”
                  </p>
                  <p className="mt-2 text-[12px] font-semibold text-[#5f4a26]">
                    {returnReply.decision === "approved" && returnReply.newDeliveryTimeWindow
                      ? `Confirmed — delivery ${returnReply.newDeliveryTimeWindow}.`
                      : returnReply.decision === "approved" && returnReply.newPickupTimeWindow
                        ? `Confirmed — pickup ${returnReply.newPickupTimeWindow}.`
                        : returnReply.decision === "declined"
                          ? "They couldn’t make that change."
                          : "Reply received."}
                  </p>
                  <button
                    type="button"
                    onClick={dismissReturnReply}
                    className="mt-4 w-full rounded-lg bg-[#2d2417] py-2.5 text-sm font-semibold text-[#f6efe3]"
                  >
                    Got it
                  </button>
                </motion.div>
              )}
            </div>
          )}

        </div>

        <button
          aria-label="Open resident account"
          className="absolute right-[6%] top-[6.5%] z-[155] grid h-11 w-11 place-items-center rounded-full border border-[#b8893c]/70 bg-[#f8efdc]/92 font-serif text-[14px] tracking-[0.08em] text-[#5b4632] shadow-[0_7px_16px_rgba(55,35,14,0.18)] backdrop-blur"
          onClick={() => setAccountOpen(true)}
          type="button"
        >
          {accountInitials}
        </button>

        <AnimatePresence>
          {accountOpen && (
            <motion.div className="absolute inset-0 z-[180] bg-[#251b13]/35 p-5 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.section className="absolute inset-x-5 top-[11%] rounded-[20px] border border-[#d8c19a] bg-[#fbf4e7] p-5 text-[#2a2520] shadow-2xl" initial={{ y: -18 }} animate={{ y: 0 }}>
                <button aria-label="Close resident account" className="absolute right-4 top-3 text-2xl text-[#756452]" onClick={() => setAccountOpen(false)} type="button">×</button>
                <div className="grid h-14 w-14 place-items-center rounded-full border border-[#b8893c]/70 bg-[#efe0bf] font-serif text-lg">{accountInitials}</div>
                <h2 className="mt-3 font-serif text-2xl">{[profileData?.user?.firstName, profileData?.user?.lastName].filter(Boolean).join(" ") || "Resident"}</h2>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-[#7a6d5f]">Phone</dt><dd>{formatHeldPhone(profileData?.user?.phoneE164)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-[#7a6d5f]">Email</dt><dd className="truncate">{profileData?.user?.email || "Not added"}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-[#7a6d5f]">Residence</dt><dd>{residenceLabel}</dd></div>
                </dl>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button className="rounded-xl border border-[#b8893c]/45 px-4 py-3 font-serif" onClick={() => { setAccountOpen(false); setLabyrinthPanel("receipts"); }} type="button">Vault</button>
                  <button className="rounded-xl border border-[#b8893c]/45 px-4 py-3 font-serif" onClick={() => setEmailPromptOpen(true)} type="button">Settings</button>
                </div>
                <button className="mt-4 w-full py-2 text-sm text-[#8b3026] underline underline-offset-4" onClick={() => void logoutResident()} type="button">Log out</button>
              </motion.section>
            </motion.div>
          )}
          {emailPromptOpen && (
            <motion.div className="absolute inset-0 z-[190] grid place-items-center bg-[#251b13]/38 p-6 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <section className="w-full rounded-[20px] border border-[#d8c19a] bg-[#fbf4e7] p-6 shadow-2xl">
                <p className="text-[10px] uppercase tracking-[0.28em] text-[#8d6b35]">Digital receipts</p>
                <h2 className="mt-2 font-serif text-2xl">Where should we send them?</h2>
                <p className="mt-2 text-sm leading-5 text-[#6f6254]">Optional. Your phone remains your only sign-in.</p>
                <input aria-label="Receipt email" className="mt-5 h-12 w-full rounded-xl border border-[#cbb58f] bg-white/70 px-4 text-base outline-none focus:border-[#9f6f24]" onChange={event => setEmailDraft(event.target.value)} placeholder="you@example.com" type="email" value={emailDraft} />
                <label className="mt-4 flex items-center gap-3 text-sm"><input checked={emailReceiptsDraftEnabled} onChange={event => setEmailReceiptsDraftEnabled(event.target.checked)} type="checkbox" /> Email my receipts</label>
                <button className="mt-5 h-12 w-full rounded-xl bg-[#2b241d] text-white disabled:opacity-50" disabled={receiptPreferencesMutation.isPending || !/^\S+@\S+\.\S+$/.test(emailDraft.trim())} onClick={() => void saveReceiptEmail()} type="button">Save receipt email</button>
                <button className="mt-3 w-full py-2 text-sm text-[#756452]" onClick={() => void skipReceiptEmail()} type="button">Not now</button>
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Marble labyrinth knob — OUTSIDE the overflow:hidden stage div ──
            Root cause of invisible knob: the stage div has `overflow-hidden`
            which clips anything that extends past its right edge. The board
            parks at x≈54% of its own width so the knob (left:-7.2% of board)
            peeks ~25px into view from the right. At x:102% (old value) the
            knob was 150px off-screen on every real phone. Moving the board
            here (sibling of the overflow-hidden div, inside the relative
            held-app-frame section) lets it extend freely off screen-right
            while the knob remains visible. */}
        <HeldLabyrinthDrawer
          activePanel={labyrinthPanel}
          guideActive={instructionsGuideOpen}
          isOpen={labyrinthOpen}
          onClose={() => setLabyrinthOpen(false)}
          onOpenChange={handleLabyrinthOpenChange}
          onSelectPanel={(panel) => {
            setLabyrinthOpen(false);
            setLabyrinthPanel(panel);
          }}
          onShowInstructions={showInstructionsFromLabyrinth}
          visible={
            (showHomeWorld || mode === "held" || mode === "transforming") &&
            !courierForeground
          }
        />

        <AnimatePresence>
          {labyrinthPanel === "receipts" && (
            <HeldLabyrinthReceiptsLayer
              key="labyrinth-receipts"
              onClose={() => setLabyrinthPanel(null)}
            />
          )}
          {labyrinthPanel === "payment" && (
            <HeldLabyrinthPaymentLayer
              key="labyrinth-payment"
              onClose={() => setLabyrinthPanel(null)}
            />
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}

function HeldLabyrinthDrawer({
  activePanel,
  guideActive,
  isOpen,
  onClose,
  onOpenChange,
  onSelectPanel,
  onShowInstructions,
  visible,
}: {
  activePanel: LabyrinthPanel;
  guideActive: boolean;
  isOpen: boolean;
  onClose: () => void;
  onOpenChange: (isOpen: boolean) => void;
  onSelectPanel: (panel: Exclude<LabyrinthPanel, null>) => void;
  onShowInstructions: () => void;
  visible: boolean;
}) {
  const dragStartXRef = useRef<number | null>(null);
  const [pressedCategory, setPressedCategory] = useState<string | null>(null);
  const isHidden = !visible || activePanel !== null;

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onClose]);

  if (isHidden) {
    return null;
  }

  const startDrag = (event: PointerEvent<HTMLButtonElement>) => {
    dragStartXRef.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const finishDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const startX = dragStartXRef.current;
    dragStartXRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture can already be released on very quick taps.
    }

    if (startX === null) {
      onOpenChange(true);
      return;
    }

    const dx = event.clientX - startX;
    if (isOpen && dx > 42) {
      onOpenChange(false);
      return;
    }
    if (!isOpen && dx < -10) {
      onOpenChange(true);
      return;
    }

    onOpenChange(!isOpen);
  };

  const handleCategorySelect = (category: LabyrinthCategory) => {
    setPressedCategory(category.id);
    window.setTimeout(() => setPressedCategory(null), 170);

    if (category.active && (category.id === "receipts" || category.id === "payment")) {
      window.navigator.vibrate?.(8);
      onSelectPanel(category.id);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.button
            aria-label="Close labyrinth"
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-[118] bg-[#20160e]/18"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={onClose}
            transition={{ duration: 0.22, ease: "easeOut" }}
            type="button"
          />
        )}
      </AnimatePresence>

      {/* The labyrinth is ONE physical object that lives just off-screen to the
          right; only its own built-in brass knob peeks on the home screen.
          Tapping the knob slides the WHOLE board in like a drawer — a single
          persistent element animated with pure transform (NO opacity fade, NO
          mount/unmount), so it always reads as one continuous object and never
          as a separate asset appearing. Closed x parks it far enough right that
          only the knob shows (was 42%, which revealed the wooden frame edge);
          this value can be nudged a few % to fine-tune the peek per device. */}
      <motion.div
        animate={
          isOpen
            ? { x: "-50%", y: "-50%", rotateX: 3, scale: 1 }
            : { x: "48%", y: "-50%", rotateX: 0, scale: 0.94 }
        }
        className={`absolute left-1/2 top-[46%] w-[min(94vw,392px)] max-w-[96%] origin-center touch-none ${
          guideActive ? "z-[136]" : "z-[122]"
        }`}
        initial={false}
        style={{ perspective: 1200 }}
        transition={{
          type: "spring",
          stiffness: 116,
          damping: 24,
          mass: 1.25,
        }}
      >
        <div
          className="relative aspect-[1448/1086] w-full"
          style={{
            filter: "drop-shadow(0 30px 34px rgba(36, 22, 10, 0.28))",
          }}
        >
          <img
            alt=""
            className="pointer-events-none h-full w-full select-none object-contain"
            draggable={false}
            src={HELD_ASSETS.labyrinthBoard}
          />

          <button
            aria-label={isOpen ? "Close labyrinth drawer" : "Open labyrinth drawer"}
            className="absolute left-[-7.2%] top-[38.5%] h-[24%] w-[18%] touch-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#d6ac54]/70"
            onPointerDown={startDrag}
            onPointerUp={finishDrag}
            type="button"
          />

          {isOpen &&
            LABYRINTH_CATEGORIES.map(category => (
              <button
                aria-label={category.active ? `Open ${category.label}` : category.label}
                className="absolute rounded-[6px] outline-none transition-transform duration-150 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#d6ac54]/55"
                key={category.id}
                onClick={() => handleCategorySelect(category)}
                onPointerDown={() => setPressedCategory(category.id)}
                onPointerLeave={() => setPressedCategory(null)}
                onPointerUp={() => window.setTimeout(() => setPressedCategory(null), 120)}
                style={{
                  left: `${category.left}%`,
                  top: `${category.top}%`,
                  width: `${category.width}%`,
                  height: `${category.height}%`,
                  transform:
                    pressedCategory === category.id
                      ? "translateY(2px) scale(0.985)"
                      : "translateY(0) scale(1)",
                }}
                type="button"
              />
            ))}
          {isOpen && (
            <button
              aria-label="Show controls guide again"
              className="absolute left-[31%] top-[55%] w-[38%] rounded-[6px] border border-[#c19a54]/45 bg-[#f9efd9]/82 px-3 py-2 text-center font-serif text-[#2d241c] shadow-[0_8px_18px_rgba(42,26,12,0.16)] outline-none transition-transform duration-150 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#d6ac54]/70"
              onClick={onShowInstructions}
              type="button"
            >
              <span className="block text-[12px] uppercase tracking-[0.18em]">Instructions</span>
              <span className="mt-1 block text-[11px] italic leading-tight text-[#6c5946]">
                Show controls guide again
              </span>
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
}

function serviceTypeToLabel(t: string): string {
  if (t === "laundry") return "Laundry";
  if (t === "dry-cleaning") return "Dry cleaning";
  if (t === "car-wash") return "Car wash";
  if (t === "cleaning") return "Home cleaning";
  if (t === "grooming") return "Pet grooming";
  if (t === "amenity") return "Amenity";
  if (t === "maintenance") return "Maintenance";
  return "Service";
}

function serviceTypeInitials(t: string): string {
  if (t === "laundry" || t === "dry-cleaning") return "LB";
  if (t === "car-wash") return "CW";
  if (t === "cleaning") return "HC";
  if (t === "grooming") return "PG";
  return "H";
}

function formatReceiptDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function HeldLabyrinthReceiptsLayer({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const { data: requestsData } = trpc.chat.getRequests.useQuery();
  const { data: profileData } = trpc.chat.getVaultProfile.useQuery();
  const cardLast4 = profileData?.user?.cardLast4 ?? "****";

  const ACTIVE_STATUSES = new Set([
    "pending", "paid", "confirmed", "in-progress",
    "scheduled", "contacting-vendor", "awaiting-vendor", "new",
  ]);

  const allRequests: any[] = requestsData?.requests ?? [];

  const activeOrders = allRequests
    .filter((r: any) => ACTIVE_STATUSES.has(r.status))
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const receipts = allRequests
    .filter((r: any) => r.receiptUrl && String(r.receiptUrl).trim())
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <motion.section
      animate={{ opacity: 1, x: 0 }}
      className="absolute inset-0 z-[150] overflow-hidden bg-[#15100b] text-[#3a2f23]"
      exit={{ opacity: 0, x: 24 }}
      initial={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <img
        alt=""
        className="absolute inset-0 h-full w-full select-none object-cover"
        draggable={false}
        src={receiptNicheBg}
      />
      <div
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{
          background:
            "radial-gradient(46% 30% at 85% 10%, rgba(255,198,112,0.3), rgba(255,184,98,0.1) 55%, transparent 78%)",
        }}
      />
      <button
        aria-label="Return to held home"
        className="absolute left-[6%] top-[2.8%] z-30 flex h-9 items-center gap-1.5 rounded-full border border-[#b8893c]/70 bg-[#fff8ec]/82 px-3.5 font-serif text-[13px] italic text-[#8d6322] shadow-[0_8px_18px_rgba(0,0,0,0.35)] transition-transform active:scale-[0.97]"
        onClick={onClose}
        type="button"
      >
        <span aria-hidden="true" className="text-[18px] leading-none">‹</span>
        <span>Back</span>
      </button>

      <div className="absolute inset-x-[11%] top-[8.2%] z-10">
        <div
          className="relative rounded-[10px] px-4 pb-3 pt-3.5 text-center"
          style={{
            background: "rgba(62,44,24,0.05)",
            boxShadow:
              "inset 0 2px 5px rgba(62,44,24,0.28), inset 0 -1px 0 rgba(255,250,238,0.55), 0 1px 0 rgba(255,250,238,0.4)",
          }}
        >
          <span className="pointer-events-none absolute inset-[5px] rounded-[7px] border border-[#a98e5e]/40" />
          <h1
            className="font-serif text-[16.5px] uppercase tracking-[0.34em] text-[#5d4a30]"
            style={{ textShadow: "0 1px 0 rgba(255,250,238,0.6)" }}
          >
            Receipts Archive
          </h1>
          <p className="mt-1 font-serif text-[12.5px] italic text-[#7a6a52]">
            Your past orders &amp; payments
          </p>
        </div>
      </div>

      <div className="absolute inset-x-[8.5%] bottom-[4.5%] top-[27%] z-10 overflow-y-auto pt-1">

        {/* ── ACTIVE ORDERS ── */}
        {activeOrders.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.3em] text-[#7a6a52]">
              Active orders
            </p>
            <ul className="space-y-2">
              {activeOrders.map((r: any) => (
                <li
                  key={r.id}
                  className="list-none overflow-hidden rounded-[5px]"
                  style={{
                    background: "linear-gradient(180deg, #fff8ec 0%, #f7edd8 100%)",
                    boxShadow:
                      "0 1px 0 rgba(255,252,242,0.9) inset, 0 -1px 0 rgba(100,72,30,0.12) inset, 0 4px 12px rgba(18,10,3,0.24)",
                  }}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Type medallion */}
                    <div
                      className="grid h-[40px] w-[40px] shrink-0 place-items-center rounded-full border border-[#b39256]/55"
                      style={{
                        background: "radial-gradient(circle at 38% 32%, #f7eeda, #ecdfc2 78%)",
                      }}
                    >
                      <span className="font-serif text-[12px] text-[#6b5638]">
                        {serviceTypeInitials(r.serviceType ?? "")}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[8px] font-semibold uppercase tracking-[0.22em] text-[#8a6c3c]">
                        {serviceTypeToLabel(r.serviceType ?? "")}
                      </p>
                      <p className="mt-[1px] truncate font-serif text-[15px] leading-[1.1] text-[#2f261b]">
                        {r.requestSummary ?? serviceTypeToLabel(r.serviceType ?? "")}
                      </p>
                      {(r.scheduledDate || r.scheduledWindow) && (
                        <p className="mt-[2px] text-[9.5px] text-[#6b5e4c]">
                          {r.scheduledDate ?? formatReceiptDate(r.createdAt)}
                          {r.scheduledWindow ? ` · ${r.scheduledWindow}` : ""}
                        </p>
                      )}
                    </div>
                    {/* Status pill */}
                    <span
                      className="shrink-0 rounded-full border px-2 py-[3px] text-[8px] font-semibold uppercase tracking-[0.16em]"
                      style={{
                        background: "rgba(184,137,60,0.12)",
                        borderColor: "rgba(184,137,60,0.45)",
                        color: "#7a5c1e",
                      }}
                    >
                      {r.status === "in-progress"
                        ? "In progress"
                        : r.status === "contacting-vendor"
                          ? "Contacting"
                          : r.status === "awaiting-vendor"
                            ? "Awaiting"
                            : r.status ?? "Active"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── VENDOR PROPOSALS ── passive; renders nothing when none exist */}
        <VendorProposalSection variant="light" />

        {/* ── RECEIPTS ── */}
        <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.3em] text-[#7a6a52]">
          Receipts
        </p>
        {receipts.length === 0 ? (
          <p className="mt-2 font-serif text-[14px] italic text-[#7a6a52]">
            No receipts yet.
          </p>
        ) : (
          <ul className="space-y-3 pb-4">
            {receipts.map((r: any) => (
              <HeldReceiptCard
                key={r.id}
                amount={
                  r.upgradePriceCents != null
                    ? `$${(r.upgradePriceCents / 100).toFixed(2)}`
                    : "—"
                }
                cardLast4={cardLast4}
                category={serviceTypeToLabel(r.serviceType ?? "")}
                initials={serviceTypeInitials(r.serviceType ?? "")}
                orderId={r.orderId}
                receiptUrl={r.receiptUrl}
                summary={r.requestSummary ?? serviceTypeToLabel(r.serviceType ?? "")}
                when={r.scheduledDate ?? formatReceiptDate(r.createdAt)}
              />
            ))}
          </ul>
        )}
      </div>
    </motion.section>
  );
}

function HeldReceiptCard({
  amount,
  cardLast4,
  category,
  initials,
  orderId,
  receiptUrl,
  summary,
  when,
}: {
  amount: string;
  cardLast4: string;
  category: string;
  initials: string;
  orderId: number | null;
  receiptUrl: string;
  summary: string;
  when: string;
}) {
  return (
    <li className="list-none">
      <a
        className="block overflow-hidden rounded-[6px]"
        href={receiptUrl}
        rel="noopener noreferrer"
        style={{
          background: "linear-gradient(180deg, #fdf5e4 0%, #f7ecd4 55%, #f2e6cc 100%)",
          boxShadow:
            "0 1px 0 rgba(255,252,242,0.85) inset, 0 -1px 0 rgba(100,72,30,0.14) inset, 0 8px 18px rgba(18,10,3,0.28), 0 2px 4px rgba(18,10,3,0.18)",
        }}
        target="_blank"
      >
        <div className="flex items-center gap-3 py-3.5 pl-4 pr-4">
          {/* Badge medallion */}
          <div
            className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full border border-[#b39256]/65"
            style={{
              background: "radial-gradient(circle at 38% 32%, #f7eeda, #ecdfc2 78%)",
              boxShadow:
                "inset 0 1px 2px rgba(255,252,242,0.8), inset 0 -2px 3px rgba(94,70,38,0.18), 0 2px 4px rgba(40,26,12,0.18)",
            }}
          >
            <div className="grid h-[42px] w-[42px] place-items-center rounded-full border border-[#b39256]/45">
              <span className="font-serif text-[14px] tracking-[0.04em] text-[#6b5638]">
                {initials}
              </span>
            </div>
          </div>

          {/* Text block */}
          <div className="min-w-0 flex-1">
            <p className="text-[8.5px] font-semibold uppercase tracking-[0.22em] text-[#8a6c3c]">
              {category}
            </p>
            <p className="mt-[2px] truncate font-serif text-[17px] leading-[1.1] text-[#2f261b]">
              {summary}
            </p>
            {orderId != null && (
              <p className="mt-[3px] text-[10px] text-[#6b5e4c]">
                Order #{orderId} · Residence
              </p>
            )}
            <p className="mt-[3px] flex items-center gap-1.5 text-[9.5px] text-[#7a6a52]">
              <svg
                aria-hidden="true"
                className="h-[9px] w-[9px] shrink-0"
                fill="none"
                stroke="#7a6a52"
                strokeLinecap="round"
                strokeWidth="1.4"
                viewBox="0 0 12 12"
              >
                <rect height="8.5" rx="1.2" width="10" x="1" y="2.2" />
                <path d="M1 4.6h10M3.6 1v2M8.4 1v2" />
              </svg>
              <span>{when}</span>
              <span className="tracking-[0.12em]">•••• {cardLast4}</span>
            </p>
          </div>

          {/* Right column */}
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="flex items-center gap-1 rounded-full bg-[#dde3c8]/90 px-2 py-[2.5px] text-[8.5px] font-semibold text-[#55663f]">
              Paid
              <span className="grid h-[11px] w-[11px] place-items-center rounded-full bg-[#6f7f53]">
                <svg
                  aria-hidden="true"
                  className="h-[7px] w-[7px]"
                  fill="none"
                  stroke="#f4f0e2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 10 10"
                >
                  <path d="M1.5 5.2 4 7.6 8.5 2.5" />
                </svg>
              </span>
            </span>
            <span className="font-serif text-[20px] leading-none text-[#2f261b]">
              {amount}
            </span>
            <span aria-hidden="true" className="text-[14px] leading-none text-[#8a6c3c]">
              ›
            </span>
          </div>
        </div>
      </a>
    </li>
  );
}

function HeldLabyrinthPaymentLayer({ onClose }: { onClose: () => void }) {
  const { data: profileData } = trpc.chat.getVaultProfile.useQuery();
  const user = profileData?.user || null;

  return (
    <motion.section
      animate={{ opacity: 1, x: 0 }}
      className="absolute inset-0 z-[150] overflow-hidden bg-[#f4ede0] text-[#2a2520]"
      exit={{ opacity: 0, x: 24 }}
      initial={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(255,252,246,0.78), rgba(244,237,224,0.94)), url(/held/held-paper-bg.png)",
          backgroundPosition: "center",
          backgroundSize: "cover, 420px 420px",
        }}
      />
      <button
        aria-label="Return to labyrinth"
        className="absolute right-[7%] top-[6.5%] z-20 grid h-10 w-10 place-items-center rounded-full border border-[#b8893c]/75 bg-[#fff8ec]/76 font-serif text-[22px] text-[#9b6f23] shadow-[0_8px_18px_rgba(68,45,20,0.12)]"
        onClick={onClose}
        type="button"
      >
        ‹
      </button>
      <div className="relative z-10 flex h-full flex-col px-[8%] pb-8 pt-[18%]">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[#7a6d5f]">
          Labyrinth
        </p>
        <h1 className="mt-3 font-serif text-[44px] leading-none text-[#2a2520]">
          Payment
        </h1>
        <p className="mt-3 max-w-[280px] font-serif text-[17px] italic leading-6 text-[#594c3f]">
          The card Held keeps on file for services at your residence.
        </p>

        <section className="mt-8 rounded-[6px] border border-[#d3be96]/80 bg-[#fff8ec]/76 p-5 shadow-[0_22px_36px_rgba(50,35,20,0.14)] backdrop-blur-[2px]">
          <div className="mb-5 flex items-center justify-between border-b border-[#b8893c]/24 pb-4">
            <span className="text-[10px] uppercase tracking-[0.24em] text-[#6f6254]">
              Current card
            </span>
            <span className="font-serif text-[18px] text-[#2a2520]">
              {user?.paymentMethodSaved ? `•••• ${user.cardLast4 || "****"}` : "Not saved"}
            </span>
          </div>
          <Elements stripe={stripePromise}>
            <PaymentMethodForm onSuccess={onClose} />
          </Elements>
        </section>
      </div>
    </motion.section>
  );
}

function HeldComposerKeyboard() {
  return (
    <div
      aria-hidden="true"
      className="absolute bottom-[13.5%] left-[14.5%] right-[14.5%] z-[3] space-y-[4px]"
    >
      {COMPOSER_KEY_ROWS.map((row, rowIndex) => (
        <div
          className={`flex justify-center gap-[3px] ${
            rowIndex === 1 ? "px-[5.5%]" : ""
          }`}
          key={row.join("")}
        >
          {row.map(key => {
            const isWide = key === "⇧" || key === "↵" || key === "⌫";
            return (
              <span
                className={`grid h-[24px] place-items-center rounded-[5px] border border-[#d5c8b6]/70 bg-[#f4eee5]/95 text-[13px] font-medium leading-none text-[#2d2925] shadow-[0_2px_3px_rgba(69,48,31,0.16),inset_0_1px_0_rgba(255,255,255,0.78)] ${
                  isWide ? "w-[34px]" : "w-[24px]"
                }`}
                key={key}
              >
                {key}
              </span>
            );
          })}
        </div>
      ))}
      <div className="flex gap-[4px] pt-[1px]">
        <span className="grid h-[25px] w-[55px] place-items-center rounded-[6px] border border-[#cfc3b5]/70 bg-[#cfc5b7]/94 text-[13px] font-medium leading-none text-[#2d2925] shadow-[0_2px_3px_rgba(69,48,31,0.14),inset_0_1px_0_rgba(255,255,255,0.58)]">
          123
        </span>
        <span className="grid h-[25px] flex-1 place-items-center rounded-[6px] border border-[#d5c8b6]/70 bg-[#f7f2ea]/96 text-[13px] font-medium leading-none text-[#2d2925] shadow-[0_2px_3px_rgba(69,48,31,0.14),inset_0_1px_0_rgba(255,255,255,0.78)]">
          space
        </span>
        <span className="grid h-[25px] w-[55px] place-items-center rounded-[6px] border border-[#b8915f]/50 bg-[#c69a61]/88 text-[13px] font-medium leading-none text-[#2d2925] shadow-[0_2px_3px_rgba(69,48,31,0.16),inset_0_1px_0_rgba(255,255,255,0.36)]">
          return
        </span>
      </div>
    </div>
  );
}

function HeldLaunchRecoveryCard({
  actionLabel,
  children,
  onEdit,
  message,
  onRetry,
  title,
}: {
  actionLabel?: string;
  children?: ReactNode;
  message: string;
  onEdit?: () => void;
  onRetry?: () => void;
  title: string;
}) {
  return (
    <section className="absolute left-1/2 top-[48%] z-[110] w-[84%] -translate-x-1/2">
      <div className="rounded-[4px] border border-[#d4c2a5]/80 bg-[#fff8ec]/88 px-5 py-5 shadow-[0_18px_30px_rgba(50,35,20,0.16)] backdrop-blur-[2px]">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#7a6d5f]">
          {title}
        </p>
        <p className="mt-3 font-serif text-[17px] italic leading-6 text-[#2f2923]">
          {message || "I have the pickup ready."}
        </p>
        {children}
        {(onEdit || onRetry) && <div className="mt-4 flex min-h-12 items-center justify-between gap-4">
          {onEdit ? (
            <button
              className="text-left font-serif text-[13px] italic text-[#7a6d5f] underline decoration-[#b78a38]/30 underline-offset-4"
              onClick={() => onEdit()}
              type="button"
            >
              Edit request
            </button>
          ) : (
            <span />
          )}
          {onRetry && <button
            className="min-h-12 flex-1 text-right font-serif text-[16px] text-[#9a681f] transition-transform active:scale-[0.98]"
            onClick={onRetry}
            type="button"
          >
            {actionLabel}
          </button>}
        </div>}
      </div>
    </section>
  );
}

function HeldRequestReadyCard({
  displayRequest,
  editInputRef,
  editValue = "",
  isEditing = false,
  isStamped = false,
  isWorking = false,
  onConfirm,
  onEdit,
  onEditChange,
  onRequestTap,
}: {
  displayRequest: string;
  editInputRef?: RefObject<HTMLTextAreaElement | null>;
  editValue?: string;
  isEditing?: boolean;
  isStamped?: boolean;
  isWorking?: boolean;
  onConfirm: () => void;
  onEdit: () => void;
  onEditChange?: (value: string) => void;
  onRequestTap?: () => void;
}) {
  // Ceremony Part 1 — the request card stamps, compresses, then lifts away as
  // the pen detaches. Stages sequence on mount once `isStamped` turns true.
  //   idle    -> resting card (requestReady)
  //   stamp   -> H crest presses down, card holds firm (~0-180ms)
  //   compress-> card tightens vertically as it seals (~180-360ms)
  //   lift    -> card rises + recedes + fades, handing off to the pen (~360-560ms)
  const [stampStage, setStampStage] = useState<"idle" | "arming" | "stamp" | "compress" | "lift">(
    isStamped ? "arming" : "idle"
  );
  useEffect(() => {
    if (!isStamped) {
      setStampStage("idle");
      return;
    }
    // Paint the un-pressed crest for one frame, then drive the press so the
    // "stamp" punch is actually visible rather than mounting already-pressed.
    let raf = 0;
    raf = window.requestAnimationFrame(() => {
      raf = window.requestAnimationFrame(() => setStampStage("stamp"));
    });
    const toCompress = window.setTimeout(() => setStampStage("compress"), 200);
    const toLift = window.setTimeout(() => setStampStage("lift"), 380);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(toCompress);
      window.clearTimeout(toLift);
    };
  }, [isStamped]);

  const sectionTransform =
    stampStage === "lift"
      ? "translate(-50%, -22px) scale(0.965)"
      : "translate(-50%, 0px) scale(1)";
  const sectionOpacity = stampStage === "lift" ? 0 : 1;
  const cardScaleY =
    stampStage === "compress" || stampStage === "lift" ? 0.965 : 1;
  // "arming" = mounted but not yet pressed (large/faint crest); any later
  // stage = pressed (settled crest).
  const crestPressed = stampStage !== "idle" && stampStage !== "arming";

  return (
    <section
      className="absolute left-1/2 top-[56%] z-[110] w-[84%]"
      style={{
        transform: sectionTransform,
        opacity: sectionOpacity,
        transition:
          "transform 200ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease-out",
        willChange: "transform, opacity",
      }}
    >
      <div
        className="relative overflow-hidden rounded-[4px] border border-[#d4c2a5]/80 bg-[#fff8ec]/86 px-5 py-5 shadow-[0_16px_26px_rgba(50,35,20,0.14)] backdrop-blur-[2px]"
        style={{
          transform: `scaleY(${cardScaleY})`,
          transformOrigin: "50% 38%",
          transition: "transform 180ms cubic-bezier(0.34, 1.4, 0.64, 1)",
          willChange: "transform",
        }}
      >
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#7a6d5f]">
          Your request
        </p>
        {isEditing ? (
          <textarea
            ref={editInputRef}
            aria-label="Edit your request"
            autoFocus
            className="mt-3 min-h-[86px] w-full resize-none rounded-[3px] border border-[#d8c8ad]/65 bg-[#fffaf2]/70 px-3 py-2 font-serif text-[17px] italic leading-6 text-[#2f2923] outline-none focus:border-[#b78a38]/70"
            onChange={event => onEditChange?.(event.currentTarget.value)}
            onKeyDown={event => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onConfirm();
              }
            }}
            value={editValue}
          />
        ) : (
          <button
            aria-label="Edit request text"
            className="mt-3 block min-h-[54px] w-full text-left font-serif text-[17px] italic leading-6 text-[#2f2923]"
            disabled={isStamped || isWorking}
            onClick={() => onRequestTap?.()}
            type="button"
          >
            {isWorking ? "Making sense of it." : displayRequest || "Making sense of it."}
          </button>
        )}
        {isStamped && (
          <span
            className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full border border-[#a77724] bg-[#b78632]/10 font-serif text-[19px] text-[#9a681f]"
            style={{
              transform: crestPressed ? "scale(1)" : "scale(1.32)",
              opacity: crestPressed ? 1 : 0,
              boxShadow: crestPressed
                ? "0 2px 7px rgba(122,84,18,0.34), inset 0 1px 2px rgba(255,244,214,0.5)"
                : "0 0 0 rgba(0,0,0,0)",
              transition:
                "transform 170ms cubic-bezier(0.3, 1.5, 0.5, 1), opacity 120ms ease-out, box-shadow 170ms ease-out",
              willChange: "transform, opacity",
            }}
          >
            H
          </span>
        )}
        <div className="mt-4 flex items-center justify-between gap-4">
          <button
            className="text-left font-serif text-[13px] italic text-[#7a6d5f] underline decoration-[#b78a38]/30 underline-offset-4"
            disabled={isStamped}
            onClick={() => onEdit()}
            type="button"
          >
            {isEditing ? "Editing" : "Edit request"}
          </button>
          <button
            aria-label="Set it in motion"
            className="min-h-12 flex-1 touch-manipulation text-right font-serif text-[16px] text-[#9a681f] transition-transform duration-150 active:scale-[0.98] disabled:opacity-60"
            disabled={isWorking || isStamped || (isEditing && !editValue.trim())}
            onClick={onConfirm}
            type="button"
          >
            {isStamped ? "Taking custody." : isEditing ? "Done →" : "Set it in motion →"}
          </button>
        </div>
      </div>
    </section>
  );
}

function formatHeldResidenceLabel(
  user?: { buildingSlug?: string | null; unit?: string | null } | null
) {
  const building = user?.buildingSlug?.trim();
  const unit = user?.unit?.trim();

  if (!building || !unit) {
    return "RESIDENCE 1807 · 12A";
  }

  return `RESIDENCE ${building.toUpperCase()} · ${unit.toUpperCase()}`;
}

function formatHeldPhone(phone?: string | null) {
  if (!phone) return "Not available";
  const digits = phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  if (digits.length !== 10) return phone;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const PLAN_MS_PER_CHAR = 45;

function PlanLine({
  className,
  delay,
  msPerChar = PLAN_MS_PER_CHAR,
  text,
}: {
  className?: string;
  delay: number;
  msPerChar?: number;
  text: string;
}) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    let raf: number;
    const timer = setTimeout(() => {
      let startTime = 0;
      const tick = (ts: number) => {
        if (!startTime) startTime = ts;
        const chars = Math.min(Math.floor((ts - startTime) / msPerChar), text.length);
        setDisplayed(text.slice(0, chars));
        if (chars < text.length) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [text, delay, msPerChar]);
  if (!displayed) return null;
  return <p className={className}>{displayed}</p>;
}

function PlanServiceRow({
  delay,
  details,
  label,
  onHighlight,
  serviceType,
}: {
  delay: number;
  details: PostOrderServiceDetail[];
  label: string;
  onHighlight?: (serviceType: string) => void;
  serviceType: string;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  if (!visible) return null;
  return (
    <button
      className="group mt-4 w-full touch-manipulation rounded-[2px] text-left transition-[transform,background] duration-200 active:scale-[0.995] active:bg-[#f7edd8]/35"
      onPointerDown={() => onHighlight?.(serviceType)}
      type="button"
    >
      <p className="text-[11px] uppercase tracking-[0.2em] text-[#5c4f42]">{label}</p>
      <div className="mt-1.5 space-y-1">
        {details.map(detail => (
          <p
            className="font-sans text-[12.5px] leading-[1.45] text-[#342e28]"
            key={`${detail.label}-${detail.value}`}
          >
            <span className="text-[10px] uppercase tracking-[0.12em] text-[#7a6d5f]">
              {detail.label}:
            </span>{" "}
            <span>{detail.value}</span>
          </p>
        ))}
      </div>
    </button>
  );
}

function HeldPhoneListeningGlyph() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-[42px] flex -translate-x-1/2 items-end gap-[3px]"
    >
      {[10, 16, 24, 16, 10].map((height, index) => (
        <motion.span
          animate={{
            height: [height, height + 9, height],
            opacity: [0.32, 0.92, 0.32],
          }}
          className="w-[2px] rounded-full bg-[#b8893c]"
          key={`${height}-${index}`}
          transition={{
            duration: 0.9,
            ease: "easeInOut",
            repeat: Infinity,
            delay: index * 0.08,
          }}
        />
      ))}
    </div>
  );
}

function HeldCourierGesture({
  message,
  onCloseSlip,
  onDispatchComplete,
  onOpenSlip,
  serviceLabel,
  stateLabel,
  slipMode,
  slipOpen,
  status,
  trotStripUrl,
}: {
  message: string;
  onCloseSlip: () => void;
  onDispatchComplete: () => void;
  onOpenSlip: (mode: CourierSlipMode) => void;
  serviceLabel: string;
  stateLabel: string;
  slipMode: CourierSlipMode;
  slipOpen: boolean;
  status: CourierStatus;
  // Muybridge trot strip (lazy data-URL). Null until its chunk resolves —
  // the static outbound horse is the graceful fallback for that window.
  trotStripUrl: string | null;
}) {
  const [tailDragX, setTailDragX] = useState(0);
  const [tailPointerId, setTailPointerId] = useState<number | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const tailLongPressTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  useEffect(
    () => () => {
      if (tailLongPressTimerRef.current !== null) {
        window.clearTimeout(tailLongPressTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (status !== "dispatching" || !prefersReducedMotion) return undefined;
    const timer = window.setTimeout(onDispatchComplete, 360);
    return () => window.clearTimeout(timer);
  }, [onDispatchComplete, prefersReducedMotion, status]);

  useEffect(() => {
    if (!slipOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseSlip();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onCloseSlip, slipOpen]);

  const startTailDrag = (event: PointerEvent<HTMLButtonElement>) => {
    setTailPointerId(event.pointerId);
    setTailDragX(0);
    event.currentTarget.setPointerCapture(event.pointerId);
    if (tailLongPressTimerRef.current !== null) {
      window.clearTimeout(tailLongPressTimerRef.current);
    }
    tailLongPressTimerRef.current = window.setTimeout(() => {
      onOpenSlip("detail");
      tailLongPressTimerRef.current = null;
    }, 520);
  };

  const moveTailDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (tailPointerId !== event.pointerId) return;
    if (Math.abs(event.movementX) > 3 && tailLongPressTimerRef.current !== null) {
      window.clearTimeout(tailLongPressTimerRef.current);
      tailLongPressTimerRef.current = null;
    }
    const nextX = clampNumber(event.movementX + tailDragX, 0, 86);
    setTailDragX(nextX);
    if (nextX > 34) {
      onOpenSlip("summary");
    }
  };

  const finishTailDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (tailPointerId !== event.pointerId) return;
    if (tailLongPressTimerRef.current !== null) {
      window.clearTimeout(tailLongPressTimerRef.current);
      tailLongPressTimerRef.current = null;
    }
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // The pointer can already be released on a quick tap.
    }
    if (tailDragX > 28) {
      onOpenSlip("summary");
    }
    setTailPointerId(null);
    window.setTimeout(() => setTailDragX(0), 120);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-[132] overflow-visible">
      {status === "dispatching" && !prefersReducedMotion && (
        <>
          {/* The horse is NOT a loading indicator. It is the product's proof
              that HELD sent word outside the app, and it gets ceremony:
              ~1s identifiable entrance, a steady museum-paced crossing through
              open paper space (middle band — never the header, rows rail,
              cradle, or phone), and a slight acceleration off the left edge.
              4s minimum, featured-exhibit scale. */}
          {/* Path + pace are expressed in `left` percentages of the SCREEN
              frame (not vw): on desktop the app lives in a 430px presentation
              frame while vw tracks the monitor, which made the old horse
              sprint past in under a second. Percentages keep the crossing at
              the same museum pace on real mobile and inside the desktop frame.

              The horse itself is a living Muybridge plate — a 4-phase trot
              cycle (sprite strip, steps(4)) so the legs genuinely articulate.
              Its vertical motion is gait-locked (2 bobs per stride) and the
              contact shadow pulses with the hooves: trotting, not floating. */}
          <motion.div
            aria-hidden="true"
            animate={{ left: ["102%", "24%", "-12%", "-78%"], opacity: [0, 1, 1, 0] }}
            className="absolute top-[57%] h-8 w-[58%]"
            initial={{ left: "102%", opacity: 0 }}
            transition={{ duration: 5.2, times: [0, 0.26, 0.78, 1], ease: ["easeOut", "linear", "easeIn"] }}
          >
            <div className="held-courier-shadow h-full w-full rounded-full bg-[#5f3a16] blur-[12px]" />
          </motion.div>
          <motion.button
            aria-label="Open courier satchel note"
            animate={{
              left: ["102%", "22%", "-14%", "-80%"],
              rotate: [0.6, 0.1, -0.2, 0.4],
            }}
            className="pointer-events-auto absolute top-[30%] z-[2] aspect-[682/572] w-[72%] max-w-[340px] border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-[#b8893c]/70"
            initial={{ left: "102%", rotate: 0.6 }}
            onAnimationComplete={onDispatchComplete}
            onClick={() => onOpenSlip("summary")}
            transition={{
              duration: 5.2,
              times: [0, 0.26, 0.78, 1],
              ease: ["easeOut", "linear", "easeIn"],
            }}
            type="button"
          >
            {trotStripUrl ? (
              <div
                aria-hidden="true"
                className="held-courier-trot-sprite h-full w-full drop-shadow-[0_18px_20px_rgba(52,31,12,0.22)]"
                style={{ backgroundImage: `url("${trotStripUrl}")` }}
              />
            ) : (
              <img
                alt=""
                className="h-full w-full object-contain drop-shadow-[0_18px_20px_rgba(52,31,12,0.22)]"
                draggable={false}
                src={HELD_ASSETS.courierHorseOutbound}
              />
            )}
          </motion.button>
        </>
      )}

      {status === "courier_out" && (
        <>
          <aside
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[calc(19%+env(safe-area-inset-bottom))] left-0 top-[10%] z-[3] w-[58px]"
          >
            <div className="absolute inset-y-3 right-0 w-px bg-[#b8893c]/14" />
            <div className="absolute inset-y-4 left-[5px] w-[42px] rounded-r-[3px] bg-[linear-gradient(90deg,rgba(247,237,216,0.42),rgba(247,237,216,0))] shadow-[2px_0_10px_rgba(54,34,16,0.06)]" />
          </aside>
          <button
            aria-label="Open courier dispatch slip"
            className="pointer-events-auto absolute left-[-18px] top-[25%] z-[4] h-[57%] w-[92px] touch-none border-0 bg-transparent p-0 opacity-[0.94] outline-none transition-[filter,opacity,transform] hover:opacity-100 focus-visible:ring-2 focus-visible:ring-[#b8893c]/70"
            onClick={() => onOpenSlip("summary")}
            onContextMenu={event => event.preventDefault()}
            onPointerCancel={finishTailDrag}
            onPointerDown={startTailDrag}
            onPointerMove={moveTailDrag}
            onPointerUp={finishTailDrag}
            onPointerLeave={() => {
              if (tailPointerId === null) return;
              if (tailLongPressTimerRef.current !== null) {
                window.clearTimeout(tailLongPressTimerRef.current);
                tailLongPressTimerRef.current = null;
              }
              setTailPointerId(null);
              setTailDragX(0);
            }}
            onTouchStart={() => window.navigator.vibrate?.(4)}
            style={{ transform: `translateX(${tailDragX}px)` }}
            type="button"
          >
            {/* The horse-head sliver is a deliberate "courier is away" marker:
                mostly offstage, but alive enough to invite the status slip. */}
            <span
              aria-hidden="true"
              className="absolute bottom-[10%] left-[36px] z-0 h-[76%] w-[24px] rounded-full bg-[#5f3a16]/18 blur-[9px]"
            />
            <img
              alt=""
              className="relative z-[1] h-full w-auto max-w-none object-contain object-right drop-shadow-[0_12px_16px_rgba(54,34,16,0.28)]"
              draggable={false}
              src={HELD_ASSETS.courierHorseHeadTease}
            />
          </button>
        </>
      )}

      {/* The slip emerges FROM the tassel (left rail anchor), not from
          nowhere — it slides out rightward from the tassel's position. */}
      {slipOpen && (
        <motion.section
          animate={{ opacity: 1, x: 0, y: 0 }}
          className="pointer-events-auto absolute left-[8%] right-[8%] top-[27%] z-[12] text-[#2a2520]"
          exit={{ opacity: 0, x: -22 }}
          initial={{ opacity: 0, x: -34, y: 6 }}
          style={{ transformOrigin: "left 40%" }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative min-h-[252px] overflow-hidden rounded-[3px] border border-[#c39a54]/42 bg-[#fff8ea]/88 px-5 py-5 shadow-[0_18px_34px_rgba(52,33,15,0.18)] backdrop-blur-[1px]">
            <img
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-16 -right-14 w-[220px] rotate-[-4deg] opacity-[0.08]"
              draggable={false}
              src={HELD_ASSETS.courierNote}
            />
            <img
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-8 w-[148px] rotate-[8deg] opacity-20"
              draggable={false}
              src={HELD_ASSETS.courierEnvelope}
            />
            <img
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-8 right-2 w-[96px] rotate-[6deg] opacity-25"
              draggable={false}
              src={HELD_ASSETS.courierSatchel}
            />
            <div className="relative z-10">
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#7a6d5f]">
                Courier slip
              </p>
              <h2 className="mt-2 font-serif text-[25px] italic leading-tight text-[#2a2520]">
                Word is out.
              </h2>
              <div className="mt-4 border-y border-[#b8893c]/24 py-3">
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#6f6254]">
                  Asked on your behalf
                </p>
                <p className="mt-2 font-serif text-[16px] italic leading-6 text-[#2f2923]">
                  “{message}”
                </p>
              </div>
              <div className="mt-3 grid grid-cols-[34%_1fr] gap-3 text-[12px] leading-5 text-[#56483b]">
                <span className="uppercase tracking-[0.16em] text-[#7a6d5f]">Thread</span>
                <span className="font-serif text-[15px] italic text-[#2f2923]">{serviceLabel}</span>
                <span className="uppercase tracking-[0.16em] text-[#7a6d5f]">State</span>
                <span className="font-serif text-[15px] italic text-[#2f2923]">{stateLabel}</span>
              </div>
              {slipMode === "detail" && (
                <p className="mt-4 border-t border-[#b8893c]/20 pt-3 font-serif text-[14px] italic leading-5 text-[#5c4c3e]">
                  Held has not received a vendor or operator answer yet, so nothing is marked confirmed.
                </p>
              )}
              <div className="mt-5 flex items-center justify-between gap-4">
                <button
                  className="font-serif text-[14px] italic text-[#8d6828] underline decoration-[#b8893c]/35 underline-offset-4"
                  onClick={() => onOpenSlip(slipMode === "detail" ? "summary" : "detail")}
                  type="button"
                >
                  {slipMode === "detail" ? "Less detail" : "Operational truth"}
                </button>
                <button
                  className="font-serif text-[14px] italic text-[#8d6828]"
                  onClick={onCloseSlip}
                  type="button"
                >
                  Fold
                </button>
              </div>
            </div>
          </div>
        </motion.section>
      )}
    </div>
  );
}

// QA affordance (gated by query param, same spirit as postorder=*): multiply
// the melt timings so the beats can be reviewed/captured in slow motion.
function getCeremonySlowFactor(): number {
  if (typeof window === "undefined") return 1;
  return new URLSearchParams(window.location.search).get("ceremonySlow") === "1" ? 3 : 1;
}

// ── THE LINE MELTS (gravity drain) ──────────────────────────────────────────
// Ink-to-clay mutation (vision board 5→6→7), built on one physical truth:
// melting material drains DOWNWARD. No mid-air gathering, no suction.
//
//   1. SOFTEN  — the drawn line thickens into warm matter and sags; lowest
//                spans belly hardest. Drips swell at the underside.
//   2. DRAIN   — the line pours down: every point falls toward a waterline
//                under the drawing (lower material lands first), runs along
//                it sideways into the nearest puddle, and the puddles GROW
//                as the strand empties into them. Drips race ahead.
//   3. RISE    — puddles draw up into rounded clay mounds (surface tension),
//                wobble settling, warming complete; the tokens take form
//                inside the mounds as they shrink to token size.
//
// Beat names stay "tension" | "gather" | "condense" so the parent's token
// reveal logic is untouched. One rAF timeline; path d-strings are rebuilt
// imperatively per frame (React renders once per beat).
// ── CLAY FIRING COLOR JOURNEY (single source of truth) ─────────────────────
// Real clay changes color as it fires — THAT is the transformation's magic.
// Both the SVG fallback's warm(w) AND the WebGL shader's clayColor(w) are
// generated from these stops, so the journey can never diverge between
// renderers:
//   0.00  ink black      (26,26,26)    — the drawn line
//   0.30  warming umber  (74,44,30)    — the ink remembers it's earth
//   0.55  WET SLIP       (148,75,42)   — saturated burnt sienna, liquid
//   0.80  ember warmth   (172,92,48)   — inner heat as the mounds rise
//   1.00  quench cooling (163,122,96)  — the heat leaving the clay
//   1.20  FIRED GREIGE   (161,144,126) — the resting token clay color
// The FINAL stop matches the token PNGs (car/scissors greige) so the
// mound→token crossfade is seamless. If the token assets ever change color,
// tune ONLY that last stop.
const CLAY_STOPS: Array<[number, [number, number, number]]> = [
  [0.0, [26, 26, 26]],
  [0.3, [74, 44, 30]],
  [0.55, [148, 75, 42]],
  [0.8, [172, 92, 48]],
  [1.0, [163, 122, 96]],
  [1.2, [161, 144, 126]],
];

// ── WEBGL METABALL FLUID RENDERER ───────────────────────────────────────────
// The melt's PHYSICS (sampling, waterline, drips, beats) stays untouched —
// this swaps only the PAINT. The same animated points the SVG renderer
// positions are packed as metaball sources each frame; the fragment shader
// fuses them into one liquid field and lights it like real material:
// analytic surface normals from the field gradient, one warm key light
// (upper-left, matching the app), specular that PEAKS while the clay is wet
// and dies to matte as it fires to greige, fresnel rim sheen, and contact
// occlusion at the field's edge. This is what makes the clay read as
// 3-dimensional wet material instead of flat strokes.
// Returns null (→ SVG fallback) when WebGL is unavailable, the device's
// uniform budget is too small, or the shader fails to compile.
const MELT_MAX_BALLS = 112;

function buildClayColorGlsl(): string {
  // Piecewise-mix chain generated from CLAY_STOPS — single source of truth.
  const v = (c: [number, number, number]) =>
    `vec3(${(c[0] / 255).toFixed(4)},${(c[1] / 255).toFixed(4)},${(c[2] / 255).toFixed(4)})`;
  let body = "";
  for (let i = 0; i < CLAY_STOPS.length - 1; i++) {
    const [w0, c0] = CLAY_STOPS[i];
    const [w1, c1] = CLAY_STOPS[i + 1];
    const cond = i < CLAY_STOPS.length - 2 ? `if (w < ${w1.toFixed(4)}) ` : "";
    body += `  ${cond}return mix(${v(c0)}, ${v(c1)}, clamp((w - ${w0.toFixed(4)}) / ${(w1 - w0).toFixed(4)}, 0.0, 1.0));\n`;
  }
  return `vec3 clayColor(float w) {\n  w = clamp(w, 0.0, 1.2);\n${body}}\n`;
}

type MeltGlRenderer = {
  draw: (balls: Float32Array, ws: Float32Array, count: number, fade: number) => void;
  dispose: () => void;
};

function createMeltGlRenderer(
  canvas: HTMLCanvasElement,
  cssW: number,
  cssH: number,
): MeltGlRenderer | null {
  try {
    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      depth: false,
      stencil: false,
    }) as WebGLRenderingContext | null;
    if (!gl) {
      console.warn("[HELD][LineMelts] WebGL unavailable — SVG fallback");
      return null;
    }
    const maxVecs = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) as number;
    // uB consumes MELT_MAX_BALLS vec4 + uW MELT_MAX_BALLS/4 vec4 + headroom.
    if (maxVecs < MELT_MAX_BALLS + MELT_MAX_BALLS / 4 + 16) {
      console.warn(
        `[HELD][LineMelts] device uniform budget too small (${maxVecs}) — SVG fallback`,
      );
      return null;
    }

    // Render at reduced backing resolution: liquid is soft by nature, the
    // upscale is free smoothing, and the per-pixel ball loop cost drops ~60%.
    const scale = Math.min(window.devicePixelRatio || 1, 1.6) * 0.66;
    canvas.width = Math.max(2, Math.round(cssW * scale));
    canvas.height = Math.max(2, Math.round(cssH * scale));

    const vsSrc = "attribute vec2 aP; void main(){ gl_Position = vec4(aP, 0.0, 1.0); }";
    const fsSrc = `precision highp float;
uniform vec2 uResCss;
uniform float uScale;
uniform int uCount;
uniform float uFade;
uniform vec4 uB[${MELT_MAX_BALLS}];
uniform float uW[${MELT_MAX_BALLS}];
${buildClayColorGlsl()}
void main() {
  // gl_FragCoord is backing-pixels, y-up. Ball coords are CSS px, y-down.
  vec2 p = vec2(gl_FragCoord.x / uScale, uResCss.y - gl_FragCoord.y / uScale);
  float F = 0.0;
  vec2 g = vec2(0.0);
  vec3 col = vec3(0.0);
  float wsum = 0.0;
  float wAvg = 0.0;
  for (int i = 0; i < ${MELT_MAX_BALLS}; i++) {
    if (i >= uCount) break;
    vec4 b = uB[i];
    vec2 d = (p - b.xy) / b.zw;
    float s = dot(d, d);
    float c = 1.0 / (s * s + 1.0);
    F += c;
    float dcds = -2.0 * s * c * c;
    g += dcds * 2.0 * d / b.zw;
    col += clayColor(uW[i]) * c;
    wsum += c;
    wAvg += uW[i] * c;
  }
  if (wsum < 1e-4) { gl_FragColor = vec4(0.0); return; }
  col /= wsum;
  wAvg /= wsum;
  float T = 0.5;
  float alpha = smoothstep(T - 0.07, T + 0.09, F) * 0.97 * uFade;
  if (alpha <= 0.004) { gl_FragColor = vec4(0.0); return; }
  // Surface normal from the analytic field gradient — the 3D illusion.
  vec3 n = normalize(vec3(-g * 14.0, 1.0));
  vec3 L = normalize(vec3(-0.5, -0.62, 0.62));
  float diff = max(dot(n, L), 0.0);
  // Wet clay shines; fired clay is matte. dryness follows the color journey.
  float dry = smoothstep(0.85, 1.18, wAvg);
  float gloss = mix(90.0, 10.0, dry);
  float specStr = mix(1.05, 0.06, dry);
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(n, H), 0.0), gloss) * specStr;
  float rim = pow(1.0 - clamp(n.z, 0.0, 1.0), 2.0) * 0.30 * (1.0 - dry);
  float edge = smoothstep(T, T + 0.45, F);
  float occl = mix(0.74, 1.0, edge);
  float under = 1.0 - 0.18 * clamp(n.y, 0.0, 1.0) * (1.0 - dry * 0.5);
  vec3 c3 = col * (0.50 + 0.55 * diff) * occl * under
          + vec3(1.0, 0.96, 0.88) * spec
          + col * rim;
  gl_FragColor = vec4(c3, alpha);
}`;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) throw new Error("createShader failed");
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh);
        console.error("[HELD][LineMelts] shader compile failed:", log);
        throw new Error(`shader compile: ${log}`);
      }
      return sh;
    };
    const prog = gl.createProgram();
    if (!prog) throw new Error("createProgram failed");
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(prog);
      console.error("[HELD][LineMelts] program link failed:", log);
      throw new Error(`program link: ${log}`);
    }
    gl.useProgram(prog);

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const aP = gl.getAttribLocation(prog, "aP");
    gl.enableVertexAttribArray(aP);
    gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);

    const uResCss = gl.getUniformLocation(prog, "uResCss");
    const uScale = gl.getUniformLocation(prog, "uScale");
    const uCount = gl.getUniformLocation(prog, "uCount");
    const uFade = gl.getUniformLocation(prog, "uFade");
    const uB = gl.getUniformLocation(prog, "uB[0]");
    const uW = gl.getUniformLocation(prog, "uW[0]");
    gl.uniform2f(uResCss, cssW, cssH);
    gl.uniform1f(uScale, scale);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    return {
      draw(balls, ws, count, fade) {
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (count <= 0) return;
        gl.uniform1i(uCount, Math.min(count, MELT_MAX_BALLS));
        gl.uniform1f(uFade, fade);
        gl.uniform4fv(uB, balls);
        gl.uniform1fv(uW, ws);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      dispose() {
        try {
          (gl.getExtension("WEBGL_lose_context") as { loseContext(): void } | null)?.loseContext();
        } catch {
          // context already lost
        }
      },
    };
  } catch (error) {
    console.warn("[HELD][LineMelts] WebGL init failed — SVG fallback", error);
    return null;
  }
}

function HeldInkGathers({
  inkSvgRef,
  onBeatChange,
  pathD,
  rootRef,
  targets,
}: {
  inkSvgRef: React.RefObject<SVGSVGElement | null>;
  onBeatChange: (beat: "tension" | "gather" | "condense" | "done") => void;
  pathD: string;
  rootRef: React.RefObject<HTMLDivElement | null>;
  targets: Array<{ x: number; y: number }>;
}) {
  const strandRefs = useRef<Array<SVGPathElement | null>>([]);
  const dripRefs = useRef<Array<SVGEllipseElement | null>>([]);
  const poolRefs = useRef<Array<SVGEllipseElement | null>>([]);
  const moundRefs = useRef<Array<SVGCircleElement | null>>([]);
  const rafRef = useRef<number | null>(null);
  const onBeatChangeRef = useRef(onBeatChange);
  onBeatChangeRef.current = onBeatChange;
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  // WebGL metaball renderer (primary). "pending" until the canvas mounts and
  // init runs on the first animation tick; "svg" = graceful fallback.
  const meltCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRendererRef = useRef<MeltGlRenderer | null>(null);
  const glModeRef = useRef<"pending" | "gl" | "svg">("pending");
  const [glMode, setGlMode] = useState<"pending" | "gl" | "svg">("pending");

  const MAX_STRANDS = 12;
  const DRIP_COUNT = 4;
  const MOUNDS_PER_POOL = 3;

  useLayoutEffect(() => {
    const root = rootRef.current;
    const inkSvg = inkSvgRef.current;
    if (!root || !inkSvg) return undefined;

    const slow = getCeremonySlowFactor();
    const SOFTEN_MS = 850 * slow;
    const DRAIN_MS = 1150 * slow;
    const RISE_MS = 950 * slow;

    type MeltPoint = {
      x0: number;
      y0: number;
      sag: number;       // soften droop depth
      fallDelay: number; // 0..0.55 — lower points drain first
      runX: number;      // x it slides to along the waterline
      x: number;
      y: number;
    };

    const probes: SVGPathElement[] = [];

    try {
      const rect = root.getBoundingClientRect();
      setBox({ w: rect.width, h: rect.height });

      const ns = "http://www.w3.org/2000/svg";
      const segments = pathD.split(/(?=M)/).map(s => s.trim()).filter(Boolean);
      const segLens: number[] = [];
      let totalLen = 0;
      for (const segment of segments) {
        const probe = document.createElementNS(ns, "path");
        probe.setAttribute("d", segment);
        probe.setAttribute("fill", "none");
        probe.setAttribute("stroke", "none");
        inkSvg.appendChild(probe);
        const length = probe.getTotalLength();
        probes.push(probe);
        segLens.push(length);
        totalLen += length;
      }
      const ctm = probes[0]?.getScreenCTM();
      if (!ctm || !Number.isFinite(totalLen) || totalLen <= 0) {
        throw new Error("ink path unmappable");
      }
      const toLocal = (vx: number, vy: number) => ({
        x: ctm.a * vx + ctm.c * vy + ctm.e - rect.left,
        y: ctm.b * vx + ctm.d * vy + ctm.f - rect.top,
      });
      const rand = (i: number) => {
        const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
        return v - Math.floor(v);
      };

      // First pass: sample all points to learn the drawing's extent.
      const rawStrands: Array<Array<{ x: number; y: number }>> = [];
      let drawMinY = Infinity;
      let drawMaxY = -Infinity;
      segments.forEach((_, si) => {
        const length = segLens[si];
        const n = Math.max(10, Math.round((length / totalLen) * 116));
        const pts: Array<{ x: number; y: number }> = [];
        for (let i = 0; i < n; i++) {
          const raw = probes[si].getPointAtLength((i / (n - 1)) * length);
          const p = toLocal(raw.x, raw.y);
          pts.push(p);
          if (p.y < drawMinY) drawMinY = p.y;
          if (p.y > drawMaxY) drawMaxY = p.y;
        }
        rawStrands.push(pts);
      });

      // The waterline: where liquid lands and runs. Just under the drawing,
      // safely above the token-formation row (targets), pinned between them.
      const targetY = targets.reduce((s, t) => s + t.y, 0) / targets.length;
      const waterline = Math.min(
        targetY - 6,
        drawMaxY + Math.min(46, Math.max(18, (targetY - drawMaxY) * 0.42)),
      );

      // Pool x-centers: token x positions (left→right), so liquid running
      // along the waterline piles up exactly under where each token forms.
      const poolXs = [...targets].sort((a, b) => a.x - b.x).map(t => t.x);
      const nearestPool = (x: number) => {
        let best = 0;
        let bestDist = Infinity;
        poolXs.forEach((px, pi) => {
          const d = Math.abs(px - x);
          if (d < bestDist) {
            bestDist = d;
            best = pi;
          }
        });
        return best;
      };
      // Map sorted-pool index back to the original target order for mounds.
      const sortedTargets = [...targets].sort((a, b) => a.x - b.x);

      // Second pass: build melt points with gravity ordering — LOWER points
      // (closer to the waterline) start falling FIRST, like a form draining.
      const strands: MeltPoint[][] = rawStrands.map((pts, si) =>
        pts.map((p, i) => {
          const heightFrac = (p.y - drawMinY) / Math.max(1, drawMaxY - drawMinY);
          const pool = nearestPool(p.x);
          const jitter = (rand(si * 131 + i * 7) - 0.5) * 16;
          return {
            x0: p.x,
            y0: p.y,
            sag: 6 + (0.5 + 0.5 * Math.sin(i * 0.43 + si * 1.9)) * 16 * (0.45 + 0.55 * heightFrac),
            fallDelay: (1 - heightFrac) * 0.55,
            runX: poolXs[pool] + jitter,
            x: p.x,
            y: p.y,
          };
        }),
      );

      // Drips: hang from the lowest belly points of the longest strands.
      const allPts = strands.flat();
      const dripAnchors = [...allPts]
        .sort((a, b) => b.y0 - a.y0)
        .filter((_, idx) => idx % 7 === 0)
        .slice(0, DRIP_COUNT);

      const easeInOut = (t: number) =>
        t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const easeIn = (t: number) => t * t;
      const easeOutBack = (t: number) => {
        const c1 = 1.20158;
        return 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      };
      const warm = (w: number) => {
        const ww = clampNumber(w, 0, 1.2);
        let i = 0;
        while (i < CLAY_STOPS.length - 2 && ww > CLAY_STOPS[i + 1][0]) i++;
        const [w0, c0] = CLAY_STOPS[i];
        const [w1, c1] = CLAY_STOPS[i + 1];
        const t = w1 === w0 ? 0 : clampNumber((ww - w0) / (w1 - w0), 0, 1);
        const ch = (a: number, b: number) => Math.round(a + (b - a) * t);
        return `rgb(${ch(c0[0], c1[0])},${ch(c0[1], c1[1])},${ch(c0[2], c1[2])})`;
      };
      const buildD = (pts: MeltPoint[]) => {
        if (pts.length < 3) {
          return `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} L${pts[pts.length - 1].x.toFixed(1)} ${pts[pts.length - 1].y.toFixed(1)}`;
        }
        let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
        for (let i = 1; i < pts.length - 1; i++) {
          const mx = (pts[i].x + pts[i + 1].x) / 2;
          const my = (pts[i].y + pts[i + 1].y) / 2;
          d += ` Q${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
        }
        const last = pts[pts.length - 1];
        return `${d} L${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
      };

      // Puddle fill fractions per pool (grow as material arrives).
      const poolFill = new Array(poolXs.length).fill(0);
      console.log(
        `[HELD][LineMelts] melt running: ${strands.length} strands → ${poolXs.length} pools (firing color journey active)`,
      );

      let started = 0;
      let lastBeat = "tension";
      onBeatChangeRef.current("tension");

      // GL ball buffers (reused every frame — zero allocation in the loop).
      const ballBuf = new Float32Array(MELT_MAX_BALLS * 4);
      const wBuf = new Float32Array(MELT_MAX_BALLS);
      let ballCount = 0;
      const pushBall = (x: number, y: number, rx: number, ry: number, w: number) => {
        if (ballCount >= MELT_MAX_BALLS) return;
        const o = ballCount * 4;
        ballBuf[o] = x;
        ballBuf[o + 1] = y;
        ballBuf[o + 2] = Math.max(rx, 0.01);
        ballBuf[o + 3] = Math.max(ry, 0.01);
        wBuf[ballCount] = w;
        ballCount++;
      };
      // Decimate strand points into the ball budget: ~72 strand balls max,
      // leaving headroom for drips + pools + mounds. The metaball field fuses
      // neighbors, so a stride > 1 still reads as one continuous liquid line.
      const strandStride = Math.max(1, Math.ceil(allPts.length / 72));

      const tick = (time: number) => {
        if (!started) started = time;
        const elapsed = time - started;

        // Lazy GL init on the first ticks (the canvas mounts right after the
        // measuring render). After 300ms without a canvas, commit to SVG.
        if (glModeRef.current === "pending") {
          const cv = meltCanvasRef.current;
          if (cv) {
            const rectNow = root.getBoundingClientRect();
            const renderer = createMeltGlRenderer(cv, rectNow.width, rectNow.height);
            if (renderer) {
              glRendererRef.current = renderer;
              glModeRef.current = "gl";
              setGlMode("gl");
              console.log(
                `[HELD][LineMelts] renderer: WebGL metaball fluid (${MELT_MAX_BALLS}-ball budget, lit + specular)`,
              );
            } else {
              glModeRef.current = "svg";
              setGlMode("svg");
            }
          } else if (elapsed > 300) {
            glModeRef.current = "svg";
            setGlMode("svg");
            console.warn("[HELD][LineMelts] melt canvas never mounted — SVG fallback");
          }
        }
        const glr = glModeRef.current === "gl" ? glRendererRef.current : null;
        ballCount = 0;
        let glFade = 1;

        let beat: "tension" | "gather" | "condense" | "done";
        if (elapsed < SOFTEN_MS) beat = "tension";
        else if (elapsed < SOFTEN_MS + DRAIN_MS) beat = "gather";
        else if (elapsed < SOFTEN_MS + DRAIN_MS + RISE_MS) beat = "condense";
        else beat = "done";
        if (beat !== lastBeat) {
          lastBeat = beat;
          onBeatChangeRef.current(beat);
        }
        if (beat === "done") {
          glr?.draw(ballBuf, wBuf, 0, 0);
          rafRef.current = null;
          return;
        }

        if (beat === "tension") {
          // SOFTEN — the line becomes warm matter: thickens, sags, drips swell.
          const t = easeInOut(elapsed / SOFTEN_MS);
          const strokeW = 2.2 + 8.5 * t;
          strands.forEach((pts, si) => {
            for (const p of pts) {
              p.x = p.x0;
              p.y = p.y0 + p.sag * t;
            }
            if (glr) {
              for (let i = 0; i < pts.length; i += strandStride) {
                const r = strokeW * 0.55 + 1.4;
                pushBall(pts[i].x, pts[i].y, r, r, 0.3 * t);
              }
            } else {
              const el = strandRefs.current[si];
              if (!el) return;
              el.setAttribute("d", buildD(pts));
              el.setAttribute("stroke-width", `${strokeW.toFixed(2)}`);
              el.setAttribute("stroke", warm(0.3 * t));
              el.setAttribute("opacity", "0.93");
            }
          });
          dripAnchors.forEach((anchor, di) => {
            const local = clampNumber((t - 0.35 - di * 0.06) / 0.6, 0, 1);
            const stretch = local * local;
            const cx = anchor.x0;
            const cy = anchor.y0 + anchor.sag + stretch * 16;
            const rx = 3.4 * local;
            const ry = 3.4 * local * (1 + stretch * 0.8);
            if (glr) {
              if (local > 0) pushBall(cx, cy, rx + 1.1, ry + 1.1, 0.25);
            } else {
              const el = dripRefs.current[di];
              if (!el) return;
              el.setAttribute("cx", `${cx.toFixed(1)}`);
              el.setAttribute("cy", `${cy.toFixed(1)}`);
              el.setAttribute("rx", `${rx.toFixed(2)}`);
              el.setAttribute("ry", `${ry.toFixed(2)}`);
              el.setAttribute("fill", warm(0.25));
              el.setAttribute("opacity", `${local > 0 ? 0.92 : 0}`);
            }
          });
        } else if (beat === "gather") {
          // DRAIN — the form empties downward. Lower material falls first,
          // lands on the waterline, runs sideways into its puddle; puddles
          // grow as the strand pours in. Pure gravity, no suction.
          const t = (elapsed - SOFTEN_MS) / DRAIN_MS;
          const width = 10.7 + 9 * easeInOut(Math.min(1, t * 1.4));
          const strandFade = t > 0.9 ? 1 - (t - 0.9) / 0.1 : 1;
          let arrived = 0;
          strands.forEach((pts, si) => {
            for (const p of pts) {
              // Per-point local time: starts after fallDelay, fills the rest.
              const lt = clampNumber((t - p.fallDelay) / (1 - p.fallDelay), 0, 1);
              const fall = easeIn(Math.min(1, lt / 0.55));
              const run = lt < 0.55 ? 0 : easeInOut((lt - 0.55) / 0.45);
              const sagY = p.y0 + p.sag;
              p.y = sagY + (waterline - sagY) * fall;
              p.x = p.x0 + (p.runX - p.x0) * run;
              if (lt >= 0.92) arrived++;
            }
            if (glr) {
              const r = (width * 0.55 + 1.4) * Math.sqrt(Math.max(strandFade, 0));
              for (let i = 0; i < pts.length; i += strandStride) {
                pushBall(pts[i].x, pts[i].y, r, r, 0.3 + 0.4 * t);
              }
            } else {
              const el = strandRefs.current[si];
              if (!el) return;
              el.setAttribute("d", buildD(pts));
              el.setAttribute("stroke-width", `${width.toFixed(2)}`);
              el.setAttribute("stroke", warm(0.3 + 0.4 * t));
              // The strand fades only at the very end, once nearly all of it
              // has poured in — the puddles carry the mass from here.
              el.setAttribute("opacity", `${(0.93 * strandFade).toFixed(3)}`);
            }
          });
          // Puddles: lens-shaped, growing with arrival fraction.
          const totalPts = allPts.length;
          const arrivalFrac = clampNumber(arrived / Math.max(1, totalPts), 0, 1);
          poolXs.forEach((px, pi) => {
            poolFill[pi] = Math.max(poolFill[pi], arrivalFrac);
            const grow = easeInOut(clampNumber(arrivalFrac * 1.25, 0, 1));
            const rx = 8 + 30 * grow;
            const ry = 2.5 + 8.5 * grow;
            const poolAlpha = clampNumber(arrivalFrac * 2.4, 0, 1);
            if (glr) {
              if (poolAlpha > 0.02) {
                const sc = Math.sqrt(poolAlpha);
                pushBall(px, waterline + 3, rx * sc, ry * sc, 0.55);
              }
            } else {
              const el = poolRefs.current[pi];
              if (!el) return;
              el.setAttribute("cx", `${px.toFixed(1)}`);
              el.setAttribute("cy", `${(waterline + 3).toFixed(1)}`);
              el.setAttribute("rx", `${rx.toFixed(2)}`);
              el.setAttribute("ry", `${ry.toFixed(2)}`);
              el.setAttribute("fill", warm(0.55));
              el.setAttribute("opacity", `${(0.94 * poolAlpha).toFixed(3)}`);
            }
          });
          // Drips race ahead of the drain and splash into the waterline.
          dripAnchors.forEach((anchor, di) => {
            const lt = clampNumber(t / 0.45 - di * 0.05, 0, 1);
            const fall = easeIn(lt);
            const y = anchor.y0 + anchor.sag + 16 + (waterline - anchor.y0 - anchor.sag - 16) * fall;
            const visible = lt < 1;
            if (glr) {
              if (visible) pushBall(anchor.x0, y, 4.5, 3.4 * (1 + fall * 1.1) + 1.1, 0.55);
            } else {
              const el = dripRefs.current[di];
              if (!el) return;
              el.setAttribute("cx", `${anchor.x0.toFixed(1)}`);
              el.setAttribute("cy", `${y.toFixed(1)}`);
              el.setAttribute("rx", "3.4");
              el.setAttribute("ry", `${(3.4 * (1 + fall * 1.1)).toFixed(2)}`);
              el.setAttribute("opacity", `${visible ? 0.92 : 0}`);
            }
          });
        } else {
          // RISE — surface tension pulls each puddle up into a rounded clay
          // mound; wobble settles; tokens take form inside as it tightens.
          const t = (elapsed - SOFTEN_MS - DRAIN_MS) / RISE_MS;
          const riseT = easeOutBack(clampNumber(t * 1.15, 0, 1));
          const fadeT = clampNumber((t - 0.55) / 0.45, 0, 1);
          glFade = 1 - fadeT;
          if (!glr) {
            strands.forEach((_, si) => strandRefs.current[si]?.setAttribute("opacity", "0"));
            dripRefs.current.forEach(el => el?.setAttribute("opacity", "0"));
          }
          poolXs.forEach((px, pi) => {
            const target = sortedTargets[pi] ?? { x: px, y: waterline };
            // Puddle flattens away as the mound rises out of it.
            const shrink = 1 - easeInOut(clampNumber(t * 1.3, 0, 1)) * 0.8;
            const poolRx = 38 * shrink;
            const poolRy = 11 * shrink * (1 - t * 0.5);
            if (glr) {
              pushBall(px, waterline + 3, poolRx, poolRy, 0.55 + 0.4 * t);
            } else {
              const pool = poolRefs.current[pi];
              if (pool) {
                pool.setAttribute("rx", `${poolRx.toFixed(2)}`);
                pool.setAttribute("ry", `${poolRy.toFixed(2)}`);
                pool.setAttribute("fill", warm(0.55 + 0.4 * t));
                pool.setAttribute("opacity", `${((1 - fadeT) * 0.9).toFixed(3)}`);
              }
            }
            for (let c = 0; c < MOUNDS_PER_POOL; c++) {
              const wobble = Math.sin((t * 7 + pi * 1.3 + c * 2.1)) * (1 - t) * 2.2;
              // Mound lifts from the waterline up to the token spot.
              const lift = riseT;
              const cx = px + Math.cos(c * 2.4 + pi) * (1 - t) * (5 + c * 3) + wobble;
              const baseY = waterline + 2;
              const cy = baseY + (target.y - baseY) * lift;
              const r = Math.max(0, (21 - c * 4.5) * (0.35 + 0.65 * lift) * (1 - fadeT * 0.5));
              if (glr) {
                if (r > 0.2) pushBall(cx, cy, r, r, 0.65 + 0.55 * t);
              } else {
                const el = moundRefs.current[pi * MOUNDS_PER_POOL + c];
                if (!el) continue;
                el.setAttribute("cx", `${cx.toFixed(1)}`);
                el.setAttribute("cy", `${cy.toFixed(1)}`);
                el.setAttribute("r", `${r.toFixed(2)}`);
                el.setAttribute("fill", warm(0.65 + 0.55 * t));
                el.setAttribute("opacity", `${((1 - fadeT) * 0.93).toFixed(3)}`);
              }
            }
          });
        }

        glr?.draw(ballBuf, wBuf, ballCount, glFade);
        rafRef.current = window.requestAnimationFrame(tick);
      };
      rafRef.current = window.requestAnimationFrame(tick);

      return () => {
        if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
        glRendererRef.current?.dispose();
        glRendererRef.current = null;
        for (const probe of probes) {
          try {
            inkSvg.removeChild(probe);
          } catch {
            // already detached
          }
        }
      };
    } catch (error) {
      console.warn("[HELD][LineMelts] falling back to crossfade", error);
      for (const probe of probes) {
        try {
          inkSvg.removeChild(probe);
        } catch {
          // already detached
        }
      }
      onBeatChangeRef.current("condense");
      return undefined;
    }
  }, [inkSvgRef, pathD, rootRef, targets]);

  if (!box) return null;

  return (
    <>
      {/* PRIMARY: WebGL metaball fluid — fused liquid with real lighting
          (analytic normals, warm key light, wet specular that dies to matte
          as the clay fires). The SVG below renders ONLY when GL is
          unavailable or init failed. */}
      <canvas
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[24]"
        ref={meltCanvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: glMode === "svg" ? "none" : "block",
        }}
      />
      {glMode !== "gl" && (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[24]"
      height="100%"
      viewBox={`0 0 ${box.w} ${box.h}`}
      width="100%"
    >
      <defs>
        {/* Gooey: strand, drips, puddles and mounds fuse into one liquid. */}
        <filter id="held-ink-goo" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
          <feColorMatrix
            in="b"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 16 -6"
          />
        </filter>
      </defs>
      <g filter="url(#held-ink-goo)">
        {Array.from({ length: MAX_STRANDS }).map((_, i) => (
          <path
            d=""
            fill="none"
            key={`strand-${i}`}
            opacity="0"
            ref={el => {
              strandRefs.current[i] = el;
            }}
            stroke="#1A1A1A"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
          />
        ))}
        {Array.from({ length: DRIP_COUNT }).map((_, i) => (
          <ellipse
            cx="-20"
            cy="-20"
            fill="#1A1A1A"
            key={`drip-${i}`}
            opacity="0"
            rx="0"
            ry="0"
            ref={el => {
              dripRefs.current[i] = el;
            }}
          />
        ))}
        {targets.map((_, pi) => (
          <ellipse
            cx="-20"
            cy="-20"
            fill="#1A1A1A"
            key={`pool-${pi}`}
            opacity="0"
            rx="0"
            ry="0"
            ref={el => {
              poolRefs.current[pi] = el;
            }}
          />
        ))}
        {targets.flatMap((_, pi) =>
          Array.from({ length: MOUNDS_PER_POOL }).map((_, c) => (
            <circle
              cx="-20"
              cy="-20"
              fill="#1A1A1A"
              key={`mound-${pi}-${c}`}
              opacity="0"
              r="0"
              ref={el => {
                moundRefs.current[pi * MOUNDS_PER_POOL + c] = el;
              }}
            />
          )),
        )}
      </g>
    </svg>
      )}
    </>
  );
}

function HeldTutorialHint({
  arrowClassName,
  arrowShape = "down",
  className,
  compact = false,
  label,
  message,
  stepNumber = 1,
}: {
  arrowClassName?: string;
  arrowShape?: "down" | "longDown" | "downRight" | "right";
  className: string;
  compact?: boolean;
  label: string;
  message: string;
  stepNumber?: number;
}) {
  const arrow =
    arrowShape === "right"
      ? {
          className: "h-10 w-20",
          path: "M3 18 C22 17 44 17 62 18 M52 8 L67 18 L52 28",
          viewBox: "0 0 72 36",
        }
      : arrowShape === "longDown"
      ? {
          className: "h-[280px] w-11",
          path: "M18 3 C17 47 16 92 17 150 M8 140 L18 156 L29 140",
          viewBox: "0 0 36 168",
        }
      : arrowShape === "downRight"
        ? {
            className: "h-24 w-16",
            path: "M18 3 C17 14 16 25 17 38 M8 29 L18 42 L29 29",
            viewBox: "0 0 36 56",
          }
        : {
            className: "h-14 w-9",
            path: "M18 3 C17 14 16 25 17 38 M8 29 L18 42 L29 29",
            viewBox: "0 0 36 56",
          };

  return (
    <div
      aria-hidden="true"
      className={`held-tutorial-hint pointer-events-none absolute ${className}`}
    >
      <div
        className={`mx-auto flex items-center justify-center gap-3 text-[#2a2520]/45 ${
          compact ? "mb-1 w-[92px]" : "mb-2 w-[120px]"
        }`}
      >
        <span className="h-px flex-1 bg-current" />
        <span className="font-serif text-[15px] leading-none text-[#2a2520]/75">
          {stepNumber}
        </span>
        <span className="h-px flex-1 bg-current" />
      </div>
      <p
        className={`font-serif font-semibold uppercase text-[#2a2520] ${
          compact ? "text-[14px] leading-[1.22] tracking-[0.14em]" : "text-[18px] tracking-[0.16em]"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1 font-serif text-[#3d342c]/86 ${
          compact ? "text-[13px] leading-[17px]" : "text-[15px] leading-5"
        }`}
      >
        {message}
      </p>
      <svg
        aria-hidden="true"
        className={`held-tutorial-arrow mx-auto mt-3 block ${arrow.className} ${arrowClassName ?? ""}`}
        fill="none"
        viewBox={arrow.viewBox}
      >
        <path
          d={arrow.path}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
        />
      </svg>
    </div>
  );
}

function HeldInstructionBook({
  isGuideOpen,
  onToggleGuide,
}: {
  isGuideOpen: boolean;
  onToggleGuide: () => void;
}) {
  return (
    <>
      <motion.button
        aria-label={isGuideOpen ? "Hide controls guide" : "Open controls guide"}
        animate={
          isGuideOpen
            ? { rotate: -4, scale: 1.06, y: -7 }
            : { rotate: -7, scale: 1, y: 0 }
        }
        className="absolute bottom-[calc(36px+4.2%+env(safe-area-inset-bottom))] left-[4.5%] z-[122] w-[78px] border-0 bg-transparent p-0 outline-none drop-shadow-[0_13px_15px_rgba(39,25,13,0.28)] transition-[filter] focus-visible:ring-2 focus-visible:ring-[#b8893c]/70"
        onClick={onToggleGuide}
        transition={{ type: "spring", stiffness: 280, damping: 18 }}
        type="button"
      >
        <img
          alt=""
          className="pointer-events-none h-auto w-full select-none"
          draggable={false}
          src={HELD_ASSETS.encyclopedia}
        />
      </motion.button>
      {isGuideOpen && (
        <>
          <HeldTutorialHint
            arrowClassName="held-tutorial-arrow-down"
            arrowShape="longDown"
            className="bottom-[calc(36px+11.5%+env(safe-area-inset-bottom))] left-[43%] z-[121] w-[166px] -translate-x-1/2 text-center"
            compact
            label="GET ORDER STATUS"
            message="tap the clay."
            stepNumber={1}
          />
          <HeldTutorialHint
            arrowClassName="held-tutorial-arrow-down h-16 w-10"
            className="bottom-[calc(36px+20.5%+env(safe-area-inset-bottom))] right-[0%] z-[121] w-[148px] text-center"
            compact
            label="CONTACT HELD"
            message="lift the phone."
            stepNumber={2}
          />
          <HeldTutorialHint
            arrowClassName="held-tutorial-arrow-down-right"
            arrowShape="downRight"
            className="bottom-[calc(36px+48%+env(safe-area-inset-bottom))] left-[82%] z-[121] w-[140px] -translate-x-1/2 text-center"
            compact
            label="SETTINGS & RECEIPTS"
            message="tap the knob."
            stepNumber={3}
          />
        </>
      )}
    </>
  );
}

function HeldSuspendedPen({ penAssetSrc }: { penAssetSrc: string }) {
  const reducedMotion = useReducedMotion();
  const rotationTarget = useMotionValue(0);
  const rotation = useSpring(rotationTarget, { damping: 11, mass: 2.4, stiffness: 28 });
  const impulseRef = useRef(0);
  const [chainBend, setChainBend] = useState(0);
  const lowPower = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const device = navigator as Navigator & { deviceMemory?: number };
    return (device.hardwareConcurrency ?? 8) <= 4 || (device.deviceMemory ?? 8) <= 4;
  }, []);

  useEffect(() => {
    if (reducedMotion || lowPower) return;
    let frame = 0;
    let lastScrollY = window.scrollY;
    const clamp = (value: number) => Math.max(-3.5, Math.min(3.5, value));
    const react = (value: number) => {
      impulseRef.current = clamp(value);
      setChainBend(clamp(value) * 1.7);
    };
    const onPointerMove = (event: globalThis.PointerEvent) =>
      react((event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 3.8);
    const onOrientation = (event: DeviceOrientationEvent) => react((event.gamma ?? 0) * 0.075);
    const onScroll = () => {
      react((window.scrollY - lastScrollY) * 0.045);
      lastScrollY = window.scrollY;
    };
    const tick = (time: number) => {
      impulseRef.current *= 0.976;
      rotationTarget.set(clamp(Math.sin(time / 4200) * 0.62 + impulseRef.current));
      setChainBend(current => current * 0.985);
      frame = window.requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("deviceorientation", onOrientation, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("deviceorientation", onOrientation);
      window.removeEventListener("scroll", onScroll);
    };
  }, [lowPower, reducedMotion, rotationTarget]);

  return (
    <motion.div
      aria-hidden="true"
      animate={lowPower && !reducedMotion ? { rotate: [0, 0.45, 0, -0.45, 0] } : undefined}
      className="pointer-events-none absolute left-1/2 top-[1.2%] z-20 h-[132px] w-[min(76%,360px)] -translate-x-1/2 origin-top"
      style={!lowPower && !reducedMotion ? { rotate: rotation } : undefined}
      transition={{ duration: 15, ease: "easeInOut", repeat: Infinity }}
    >
      <span className="absolute left-1/2 top-0 z-10 h-[13px] w-[13px] -translate-x-1/2 rounded-full border border-[#8c6126] bg-[radial-gradient(circle_at_35%_30%,#f6df9e,#9d6a24_60%,#5e3a12)] shadow-[0_2px_5px_rgba(58,36,13,0.34)]" />
      <svg className="absolute inset-x-0 top-[6px] h-[146px] w-full overflow-visible" viewBox="0 0 300 150">
        <path d={`M150 2 C${132 + chainBend} 42 ${91 + chainBend} 99 43 143`} fill="none" stroke="#a8752d" strokeLinecap="round" strokeWidth="2" />
        <path d={`M150 2 C${168 + chainBend} 42 ${209 + chainBend} 99 257 143`} fill="none" stroke="#a8752d" strokeLinecap="round" strokeWidth="2" />
      </svg>
      <img
        alt=""
        className="absolute left-1/2 top-[22px] h-[268px] w-auto max-w-none -translate-x-1/2 rotate-90 select-none drop-shadow-[0_7px_9px_rgba(31,21,13,0.28)]"
        draggable={false}
        src={penAssetSrc}
      />
    </motion.div>
  );
}

function HeldTransformingState({
  debugOpenLaundryVitrine = false,
  displayRequest,
  forceShowInstructionsBook,
  instructionsBookVisible,
  instructionsGuideOpen,
  isHeld,
  lastOrderId,
  onAddService,
  onCourierForegroundChange,
  onDebugLaundryVitrineOpened,
  onInstructionsGuideConsumed,
  onInstructionsGuideToggle,
  penAssetSrc,
  residenceLabel,
  services,
}: {
  debugOpenLaundryVitrine?: boolean;
  displayRequest: string;
  forceShowInstructionsBook: boolean;
  instructionsBookVisible: boolean;
  instructionsGuideOpen: boolean;
  isHeld: boolean;
  // The real admin order id once the booking succeeded. When present, the
  // post-order copy MUST render laundry as Booked — the screen reflects the
  // admin order state, never a stale "pending" left over from pre-booking.
  lastOrderId: number | null;
  // Delegate a brand-new service ("also dry clean my jacket") back to the parent
  // booking flow — the post-order phone must NOT create orders itself.
  onAddService?: (text: string) => void;
  // Reports when the courier crossing or the open slip owns the foreground,
  // so the Labyrinth knob can step aside instead of overlapping the ceremony.
  onCourierForegroundChange?: (busy: boolean) => void;
  onDebugLaundryVitrineOpened?: () => void;
  onInstructionsGuideConsumed: () => void;
  onInstructionsGuideToggle: () => void;
  penAssetSrc: string;
  residenceLabel: string;
  services: HeldParsedService[];
}) {
  const longPressTimerRef = useRef<number | null>(null);
  const longPressOpenedRef = useRef(false);
  const pressStartRef = useRef<{ x: number; y: number } | null>(null);
  const submittedFollowupsRef = useRef<string[]>([]);
  const phonePointerRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    didDrag: boolean;
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    didDrag: false,
  });
  const [selectedToken, setSelectedToken] = useState<HeldTokenAsset | null>(null);
  const [activeServices, setActiveServices] = useState<HeldParsedService[]>(services);
  const [isPhoneEngaged, setIsPhoneEngaged] = useState(false);
  const [phoneDragY, setPhoneDragY] = useState(0);
  const [composerValue, setComposerValue] = useState("");
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [phoneReply, setPhoneReply] = useState("");
  const [phoneReplyVisible, setPhoneReplyVisible] = useState(false);
  const [phoneReplyStatus, setPhoneReplyStatus] = useState<"idle" | "thinking">("idle");
  const [courierStatus, setCourierStatus] = useState<CourierStatus>("idle");
  const [courierMessage, setCourierMessage] = useState("");
  const [courierThreadLabel, setCourierThreadLabel] = useState("Current service thread");
  const [courierStateLabel, setCourierStateLabel] = useState("Awaiting outside reply.");
  const [courierSlipOpen, setCourierSlipOpen] = useState(false);
  const [courierSlipMode, setCourierSlipMode] = useState<CourierSlipMode>("summary");
  const [highlightedServiceType, setHighlightedServiceType] = useState<string | null>(null);
  const highlightTimerRef = useRef<number | null>(null);
  const composerInputRef = useRef<HTMLInputElement | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  // Server-owned post-order intelligence: classify + (for cancel/timing) create a
  // REAL operator task. The horse rides only when the server confirms a task.
  const postOrderFollowupMutation = trpc.chat.postOrderFollowup.useMutation();
  // True when the LAST server reply offered to book ("Want me to book one?") —
  // a bare "yes" then resumes booking via the parent flow instead of re-running
  // the follow-up resolver against the word "yes".
  const pendingBookOfferRef = useRef(false);
  // Ink-to-Clay -> Tokens Settle ceremony (two ceremonial beats):
  //   ink    -> the drawn ink line rests on the paper (mode === transforming)
  //   clay   -> ink thickens then dissolves as clay tokens condense out of it,
  //             materializing at the drawing's position (upper paper)
  //   settle -> the clay tokens travel down and settle into the walnut tray
  const [phase, setPhase] = useState<"ink" | "clay" | "settle">(isHeld ? "settle" : "ink");
  // Ink Gathers beat within the clay window: tension (line beads up & sags) →
  // gather (ink flows along its own line into pools; a drip falls) →
  // condense (pools contract & warm; tokens form inside the clay).
  const [gatherBeat, setGatherBeat] = useState<
    "idle" | "tension" | "gather" | "condense" | "done"
  >("idle");
  const stageRootRef = useRef<HTMLDivElement | null>(null);
  const inkSvgRef = useRef<SVGSVGElement | null>(null);
  const prefersReducedClay = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true,
    [],
  );
  useEffect(() => {
    // The ink->clay->settle ceremony is driven by its own timeline on mount,
    // NOT by the backend (isHeld). Mount ceremony (vision board 5→6→7):
    //   ink    (0–650ms)    the Picasso line rests on the paper
    //   clay   (650–3600ms) THE LINE MELTS — the drawn line thickens & sags
    //                       like warm wax (900ms), slides off its own shape
    //                       and piles into clay heaps (1100ms), then the
    //                       heaps condense as the tokens form inside (900ms)
    //   settle (~3600ms)    the formed clay tokens drop into the walnut cradle
    // Reduced motion keeps the original quick crossfade (650/1450).
    // ceremonySlow=1 stretches the melt 3x for review/QA.
    if (isHeld) {
      setPhase("settle");
      return;
    }
    const clayWindowMs = prefersReducedClay ? 800 : 2950 * getCeremonySlowFactor();
    if (prefersReducedClay) {
      console.warn(
        "[HELD][Ceremony] prefers-reduced-motion is ON for this device — the liquid melt is SKIPPED (quick crossfade). macOS: System Settings → Accessibility → Display → Reduce motion.",
      );
    }
    console.log(
      `[HELD][Ceremony] mount ceremony: ink 650ms → clay ${Math.round(clayWindowMs)}ms → settle`,
    );
    const toClay = window.setTimeout(() => setPhase("clay"), 650);
    const toSettle = window.setTimeout(() => setPhase("settle"), 650 + clayWindowMs);
    return () => {
      window.clearTimeout(toClay);
      window.clearTimeout(toSettle);
    };
  }, [isHeld, prefersReducedClay]);
  useEffect(() => {
    setActiveServices(services);
  }, [services]);
  const isInk = phase === "ink";
  const isSettled = phase === "settle";
  const hasTriggeredInitialCourier = useRef(false);
  // Load the Muybridge trot strip (its own lazy chunk) as soon as the
  // post-order screen mounts: the courier's first crossing must begin
  // mid-stride, never pop in late — and the home screen pays nothing for it.
  const [trotStripUrl, setTrotStripUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void import("./courierTrotStrip").then(
      module => {
        if (active) setTrotStripUrl(module.COURIER_TROT_STRIP_DATA_URL);
      },
      error => console.warn("[HELD] courier trot strip failed to load", error),
    );
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!isSettled) return;
    if (hasTriggeredInitialCourier.current) return;

    if (displayRequest) {
      const normalized = displayRequest.toLowerCase().replace(/\s+/g, " ").trim();
      const hasLaundry = /\b(laundry|wash|dry clean|dry-clean|clothes|hamper)\b/.test(normalized);
      const isLaundryScheduleChange =
        (hasLaundry || /\b(laundry|butler|they)\b/.test(normalized)) &&
        (/\b(earlier|sooner|later|move|change|switch|reschedule|adjust)\b/i.test(normalized) ||
         (/\b(5\s*pm|5|8\s*am|8)\b/.test(normalized) && /\b(deliver|return|bring|get|pickup|pick up|need|have)\b/.test(normalized)));

      if (isLaundryScheduleChange) {
        hasTriggeredInitialCourier.current = true;
        setCourierMessage(displayRequest);
        setCourierThreadLabel("LAUNDRY BUTLER");
        setCourierStateLabel("Awaiting outside reply.");
        setCourierSlipOpen(false);
        setCourierSlipMode("summary");
        // Ceremony: let the chief-of-staff line land and the page settle
        // before the courier enters — the horse must be understood, not flash.
        const dispatchTimer = window.setTimeout(
          () => setCourierStatus("dispatching"),
          2600,
        );
        return () => window.clearTimeout(dispatchTimer);
      }
    }
  }, [isSettled, displayRequest]);
  const tokens = getTokenAssets(activeServices, displayRequest);
  const drawing = getHeldCompositePath(displayRequest, activeServices);
  // Post-order narration is built entirely from the active request + parsed
  // service metadata — no scripted scenario copy. Every fact comes from real
  // plan state or safe generic fallback language.
  // Operational truth: once a real admin order id exists, the laundry service
  // IS booked — even if the array that reached this screen predates the booking
  // (some entry paths set confirmedServices before the orderId is known). Stamp
  // the confirmed order id onto laundry rows here so the post-order copy can
  // never show "In motion / Pending: Pickup scheduling" for an order that
  // actually exists. The headline + row both read from this same enriched state.
  const servicesForCopy = useMemo<HeldParsedService[]>(() => {
    const resolved =
      lastOrderId == null
        ? activeServices
        : activeServices.map(service =>
            isLaundryService(service.type) && service.orderId == null
              ? { ...service, orderId: lastOrderId, status: service.status ?? "booked" }
              : service,
          );
    // QA log: the exact service objects entering the post-order copy builder.
    // For a successful laundry booking these MUST carry status:"booked" and an
    // orderId/serviceRequestId — if they don't, the bug is upstream (booking
    // response / state handoff), NOT the copy builder.
    console.log(
      "[HELD][copy] services → buildPostOrderChiefOfStaffCopy",
      resolved.map(s => ({ type: s.type, status: s.status ?? null, orderId: s.orderId ?? null })),
      { lastOrderId },
    );
    return resolved;
  }, [activeServices, lastOrderId]);
  const postOrderCopy = useMemo(
    () =>
      buildPostOrderChiefOfStaffCopy(
        { displayRequest, services: servicesForCopy as PostOrderServiceMeta[] },
        displayRequest,
      ),
    [servicesForCopy, displayRequest],
  );
  const ledgerStage = useMemo(
    () => buildHeldServiceLedgerStage(servicesForCopy),
    [servicesForCopy],
  );
  const ghostPaths = [drawing.main, ...(drawing.details ?? [])];
  const tokenPositions = TOKEN_POSITIONS[Math.min(tokens.length, 4)] ?? TOKEN_POSITIONS[1];
  // Where the ink pools: the EXACT spots tokens occupy during the clay beat
  // (token tray pre-settle layout: container bottom-35%/h-32%/w-88%, tokens
  // offset -112px). Measured from the live stage so the clay condenses
  // precisely under each forming token.
  const [gatherTargets, setGatherTargets] = useState<Array<{ x: number; y: number }>>([]);
  useLayoutEffect(() => {
    if (phase !== "clay" || prefersReducedClay) return;
    const root = stageRootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const count = Math.max(1, tokens.length);
    const next = tokenPositions.slice(0, count).map(position => ({
      x: rect.width * (0.06 + 0.88 * (position.left / 100)),
      y: rect.height * (0.33 + 0.32 * (position.top / 100)) - 112,
    }));
    setGatherTargets(next);
  }, [phase, prefersReducedClay, tokenPositions, tokens.length]);
  const courierServiceLabel = courierThreadLabel || getCourierServiceLabel(activeServices, displayRequest);
  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };
  const openToken = (token: HeldTokenAsset) => {
    if (instructionsGuideOpen) {
      onInstructionsGuideConsumed();
    }
    setSelectedToken(token);
  };
  const returnPhoneToDock = () => {
    phonePointerRef.current.pointerId = null;
    phonePointerRef.current.didDrag = false;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsPhoneEngaged(false);
    setPhoneDragY(0);
    setIsComposerFocused(false);
    setPhoneReply("");
    setPhoneReplyVisible(false);
    setPhoneReplyStatus("idle");
  };
  const engagePhone = () => {
    if (instructionsGuideOpen) {
      onInstructionsGuideConsumed();
    }
    window.navigator.vibrate?.(8);
    setIsPhoneEngaged(true);
    setPhoneDragY(0);
  };
  const startPhoneLift = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    phonePointerRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      didDrag: false,
    };
    setPhoneDragY(0);
  };
  const movePhoneLift = (event: PointerEvent<HTMLButtonElement>) => {
    const pointer = phonePointerRef.current;
    if (pointer.pointerId !== event.pointerId) return;

    event.preventDefault();
    const deltaY = event.clientY - pointer.startY;
    const deltaX = event.clientX - pointer.startX;
    pointer.didDrag = pointer.didDrag || Math.hypot(deltaX, deltaY) > 4;

    if (isPhoneEngaged && deltaY > 28) {
      returnPhoneToDock();
      return;
    }

    const resistedY = clampNumber(deltaY, PHONE_ENGAGED_Y, 16);
    setPhoneDragY(resistedY);

    if (resistedY <= PHONE_ENGAGE_THRESHOLD_Y) {
      engagePhone();
    }
  };
  const finishPhoneLift = (event: PointerEvent<HTMLButtonElement>) => {
    const pointer = phonePointerRef.current;
    if (pointer.pointerId !== event.pointerId) return;

    event.preventDefault();
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released after a quick tap.
    }

    if (phoneDragY <= PHONE_ENGAGE_THRESHOLD_Y || (!pointer.didDrag && event.pointerType === "mouse")) {
      engagePhone();
    } else if (!isPhoneEngaged) {
      setPhoneDragY(0);
    }

    pointer.pointerId = null;
    pointer.didDrag = false;
  };
  const submitFollowup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitFollowupValue(composerInputRef.current?.value);
  };
  // Shared dim→reply→horse beat. The horse is proof that HELD sent word OUTSIDE
  // the app; it rides ONLY when a real operator task exists (server-confirmed) or
  // the local fallback's vendor-facing branch fires.
  const renderFollowup = (opts: {
    reply: string;
    triggersCourier: boolean;
    threadLabel?: string | null;
    stateLabel?: string | null;
    nextValue: string;
  }) => {
    setPhoneReplyVisible(false);
    setPhoneReply(opts.reply);
    setPhoneReplyStatus("idle");
    window.setTimeout(() => setPhoneReplyVisible(true), 220);
    if (opts.triggersCourier) {
      setCourierMessage(opts.nextValue);
      setCourierThreadLabel(opts.threadLabel || "LAUNDRY BUTLER");
      setCourierStateLabel(opts.stateLabel || "Awaiting outside reply.");
      setCourierSlipOpen(false);
      setCourierSlipMode("summary");
      const replyReadMs = 340 + opts.reply.length * 20 + 650;
      const horseDelay = Math.min(4200, Math.max(1800, replyReadMs));
      window.setTimeout(() => setCourierStatus("dispatching"), horseDelay);
    }
  };
  const submitFollowupValue = async (valueOverride?: string) => {
    const nextValue = (valueOverride ?? composerValue).trim();
    if (!nextValue || phoneReplyStatus === "thinking") return;

    console.debug("[HELD] phone follow-up captured", nextValue);
    setComposerValue("");
    submittedFollowupsRef.current = [...submittedFollowupsRef.current, nextValue];

    // Stateful "yes": if the previous reply offered to book ("Want me to book
    // one?"), a bare agreement resumes that pending action through the PARENT
    // deterministic booking flow — it must NOT re-run the follow-up resolver
    // against the word "yes" and repeat the same fallback.
    if (pendingBookOfferRef.current && isAffirmation(nextValue)) {
      pendingBookOfferRef.current = false;
      renderFollowup({
        reply: "On it — booking your laundry pickup now.",
        triggersCourier: false,
        nextValue,
      });
      onAddService?.("laundry");
      return;
    }

    setPhoneReplyStatus("thinking");

    try {
      // SERVER owns the decision: it loads this resident's active order, classifies
      // the message, and (for cancel/timing) creates a REAL operator task. The
      // client never passes a trusted orderId or books here.
      const res = await postOrderFollowupMutation.mutateAsync({ message: nextValue });

      // Remember whether THIS reply offered to book — consumed by the next message.
      pendingBookOfferRef.current = Boolean((res as { offeredBooking?: boolean }).offeredBooking);

      // A brand-new service is booked by the PARENT booking flow — and ONLY on
      // the server's EXPLICIT contract (bookNewService === true). The client
      // never infers "new service" from text on its own: the live ritual-replay
      // incident ("…7pm is too late" → full Picasso/clay re-book) came from
      // trusting intent alone. Existing-order resolutions render reply +
      // dispatch slip only — no ritual, no clay token, no booking flow.
      if (res.intent === "add_service" && (res as { bookNewService?: boolean }).bookNewService === true) {
        renderFollowup({
          reply: res.reply || "On it — setting that up as a new request.",
          triggersCourier: false,
          nextValue,
        });
        onAddService?.(nextValue);
        return;
      }

      // Horse ONLY when the server actually created an operator task.
      renderFollowup({
        reply: res.reply || "I’ve got that.",
        triggersCourier: Boolean(res.triggersCourier && res.operatorTaskCreated),
        threadLabel: "dispatchSlip" in res ? res.dispatchSlip?.thread : undefined,
        stateLabel: "dispatchSlip" in res ? res.dispatchSlip?.state : undefined,
        nextValue,
      });
    } catch (error) {
      // Network/server failure → degrade gracefully to the local responder so the
      // phone never hangs. (This is a fallback, not the primary path.)
      console.warn("[HELD] postOrderFollowup failed; using local fallback", error);
      const followup = buildReactivePhoneFollowup(nextValue, activeServices, displayRequest);
      if (followup.nextServices) setActiveServices(followup.nextServices);
      renderFollowup({
        reply: followup.reply,
        triggersCourier: followup.triggersCourier,
        threadLabel: followup.threadLabel,
        stateLabel: followup.courierStateLabel,
        nextValue,
      });
    }
  };

  useEffect(() => {
    if (!isPhoneEngaged || typeof window === "undefined") return undefined;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return undefined;
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event: any) => {
      let transcript = "";
      let final = false;
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0]?.transcript || "";
        final ||= event.results[index].isFinal === true;
      }
      const nextValue = transcript.trim();
      if (nextValue) setComposerValue(nextValue);
      if (final && nextValue) void submitFollowupValue(nextValue);
    };
    recognition.onerror = (event: any) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        console.warn("[HELD] phone speech recognition error", event.error);
      }
    };
    speechRecognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (error) {
      console.warn("[HELD] phone speech recognition did not start", error);
    }
    return () => {
      recognition.abort();
      speechRecognitionRef.current = null;
    };
    // The lift gesture is the permission-bearing interaction that starts the mic.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPhoneEngaged]);
  const startTokenPress = (token: HeldTokenAsset, event: PointerEvent<HTMLButtonElement>) => {
    clearLongPress();
    longPressOpenedRef.current = false;
    pressStartRef.current = { x: event.clientX, y: event.clientY };
    longPressTimerRef.current = window.setTimeout(() => {
      longPressOpenedRef.current = true;
      if (token.type === "laundry_pickup") {
        window.navigator.vibrate?.(8);
      }
      openToken(token);
      longPressTimerRef.current = null;
    }, 520);
  };
  const moveTokenPress = (event: PointerEvent<HTMLButtonElement>) => {
    if (!pressStartRef.current) return;
    const dx = Math.abs(event.clientX - pressStartRef.current.x);
    const dy = Math.abs(event.clientY - pressStartRef.current.y);
    if (dx > 10 || dy > 10) {
      clearLongPress();
    }
  };

  useEffect(() => clearLongPress, []);

  useEffect(() => {
    if (!isPhoneEngaged) return undefined;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        returnPhoneToDock();
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isPhoneEngaged]);

  useEffect(() => {
    if (!debugOpenLaundryVitrine) return;
    setSelectedToken({ src: HELD_ASSETS.tokenLaundry, type: "laundry_pickup" });
    onDebugLaundryVitrineOpened?.();
  }, [debugOpenLaundryVitrine, onDebugLaundryVitrineOpened]);

  const openCourierSlip = (mode: CourierSlipMode) => {
    setCourierSlipMode(mode);
    setCourierSlipOpen(true);
  };
  const emphasizeServiceType = (serviceType: string) => {
    setHighlightedServiceType(serviceType);
    if (highlightTimerRef.current !== null) {
      window.clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedServiceType(current => (current === serviceType ? null : current));
      highlightTimerRef.current = null;
    }, 920);
  };
  const courierRailActive = courierStatus === "courier_out";
  // While the courier is dispatching (and once a phone reply owns the page),
  // the older chief/status copy must already be receded — the horse never
  // crosses over full-opacity prose, and no two readable layers ever stack.
  const courierDimsCopy = courierStatus === "dispatching" || Boolean(phoneReply);
  const hasActiveTrayWork = isSettled && tokens.length > 0;
  const courierOwnsForeground = courierStatus === "dispatching" || courierSlipOpen;
  // During tension+gather the ink is still liquid — no token imagery yet.
  // Tokens crossfade in during condense, forming inside the clay.
  const gatherClayHidesTokens =
    phase === "clay" &&
    !prefersReducedClay &&
    (gatherBeat === "idle" || gatherBeat === "tension" || gatherBeat === "gather");
  const showInstructionBook =
    (instructionsBookVisible || forceShowInstructionsBook) &&
    isSettled &&
    tokens.length > 0 &&
    !isPhoneEngaged &&
    !selectedToken &&
    !courierOwnsForeground &&
    !phoneReply;

  useEffect(() => {
    onCourierForegroundChange?.(courierOwnsForeground);
  }, [courierOwnsForeground, onCourierForegroundChange]);
  useEffect(
    () => () => {
      onCourierForegroundChange?.(false);
    },
    [onCourierForegroundChange],
  );

  useEffect(
    () => () => {
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }
    },
    []
  );

  return (
    <div
      className={`absolute inset-0 overflow-hidden bg-[#f4ecdf] pb-[max(10px,env(safe-area-inset-bottom))] ${
        selectedToken ? "z-[120]" : "z-[85]"
      }`}
      ref={stageRootRef}
      onPointerDownCapture={event => {
        if (!isPhoneEngaged) return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest("[data-held-phone-interactive='true']")) return;
        returnPhoneToDock();
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(255,252,246,0.78), rgba(244,235,222,0.9)), url(/held/held-paper-bg.png)",
          backgroundPosition: "center",
          backgroundSize: "cover, 420px 420px",
        }}
      />
      {isSettled && <HeldSuspendedPen penAssetSrc={penAssetSrc} />}
      <header className={`pointer-events-none absolute z-30 text-[#2a2520] ${isSettled ? "left-1/2 top-[22%] w-[76%] -translate-x-1/2 text-center" : "left-[8%] right-[8%] top-[5.2%] flex items-start justify-between"}`}>
        <div className={isSettled ? "flex flex-col items-center" : ""}>
          <img alt="HELD" className="h-10 w-10 object-contain" src={HELD_ASSETS.logoMark} />
          <p className="mt-1 text-[11px] uppercase tracking-[0.28em]">{residenceLabel}</p>
        </div>
      </header>

      <section
        className={`absolute left-1/2 top-[18%] z-10 w-[66%] -translate-x-1/2 transition-all duration-700 ${
          isInk || (phase === "clay" && !prefersReducedClay)
            ? "translate-y-0 opacity-100 scale-100"
            : "-translate-y-3 opacity-0 scale-[0.88]"
        }`}
      >
        <div
          className="relative aspect-[0.78/1] w-full shadow-[0_16px_24px_rgba(50,35,20,0.12)] transition-colors duration-500"
          style={{
            backgroundColor:
              isInk || (phase === "clay" && !prefersReducedClay)
                ? "rgba(247,236,217,0.8)"
                : "rgba(247,236,217,0)",
          }}
        >
          <svg
            aria-hidden="true"
            className="absolute inset-[7%] h-[86%] w-[86%] overflow-visible"
            preserveAspectRatio="xMidYMid meet"
            ref={inkSvgRef}
            viewBox="0 0 430 260"
          >
            {ghostPaths.map((d, index) => (
              <path
                key={index}
                d={d}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  // The Line Melts: the melt strand replaces this stroke
                  // 1:1 at full thickness, so the crisp original fades out
                  // quickly under it the moment melting begins.
                  opacity: isInk
                    ? 0.18
                    : phase === "clay"
                      ? gatherBeat === "tension"
                        ? 0.1
                        : 0
                      : 0,
                  stroke: "#1A1A1A",
                  strokeWidth: isInk ? 2 : 1.8,
                  transition:
                    "opacity 420ms ease-out, stroke-width 320ms ease-out",
                }}
              />
            ))}
          </svg>
        </div>
      </section>

      {/* THE LINE MELTS overlay: the drawn line itself thickens, sags,
          slides off its own shape and piles into clay heaps that condense
          into the tokens. Mounts only once pool targets are measured;
          skipped under reduced motion (quick crossfade stays). */}
      {phase === "clay" && !prefersReducedClay && gatherTargets.length > 0 && (
        <HeldInkGathers
          inkSvgRef={inkSvgRef}
          onBeatChange={setGatherBeat}
          pathD={drawing.main}
          rootRef={stageRootRef}
          targets={gatherTargets}
        />
      )}

      {isSettled && (
        <section
          className={`pointer-events-auto absolute top-[29%] bottom-[40%] z-20 flex flex-col text-[#2a2520] transition-all duration-[350ms] ease-out overflow-y-auto no-scrollbar ${
            courierRailActive
              ? "left-[54px] right-[8%] items-start text-left"
              : "left-1/2 w-[82%] -translate-x-1/2 items-center text-center"
          } ${
            isPhoneEngaged
              ? "opacity-0 blur-[8px] pointer-events-none"
              : courierDimsCopy
                ? "pointer-events-none"
                : "opacity-100"
          }`}
        >
          <div className={`w-full transition-opacity duration-[350ms] ${courierDimsCopy ? "opacity-20" : "opacity-100"}`}>
            <p className="text-[10px] uppercase tracking-[0.34em] text-[#9b6b2c]">{ledgerStage.serviceName}</p>
            <h1 className="mt-2 font-serif text-[clamp(25px,7vw,34px)] leading-[1.08]">{ledgerStage.stage}</h1>
            <p className="mt-3 font-serif text-[clamp(14px,4vw,17px)] italic leading-[1.35] text-[#5d5145]">{ledgerStage.sentence}</p>
            <div className="mx-auto my-5 h-px w-12 bg-[#b8893c]/75" />
            <dl className="mx-auto grid w-full max-w-[310px] grid-cols-[88px_1fr] gap-x-4 gap-y-3 text-left text-[13px] leading-tight">
              <dt className="uppercase tracking-[0.2em] text-[#8a7d70]">Status:</dt><dd>{ledgerStage.status}</dd>
              <dt className="uppercase tracking-[0.2em] text-[#8a7d70]">Pending:</dt><dd>{ledgerStage.pending}</dd>
              <dt className="uppercase tracking-[0.2em] text-[#8a7d70]">Service:</dt><dd>{ledgerStage.serviceName}</dd>
            </dl>
            <div className="mx-auto my-5 h-px w-12 bg-[#b8893c]/75" />
            <p className="font-serif text-[15px] italic text-[#9b6b2c]">No action required.</p>
          </div>
        </section>
      )}

      {/* Phone reply owns a dedicated clean band: the chief/status copy has
          already dimmed/blurred away before this fades in (150–250ms beat), so
          two readable prose layers never occupy the same location. While the
          horse crosses, the reply itself recedes too — the courier crosses a
          quieted page. */}
      {isSettled && phoneReply && (
        <section
          className={`pointer-events-none absolute left-1/2 top-[28%] z-[65] w-[82%] -translate-x-1/2 text-center transition-opacity duration-[350ms] ease-out ${
            phoneReplyVisible
              ? courierStatus === "dispatching"
                ? "opacity-20"
                : "opacity-100"
              : "opacity-0"
          }`}
        >
          <PlanLine
            className="font-serif text-[17px] italic leading-[1.4] text-[#2a2520]"
            delay={120}
            msPerChar={20}
            text={phoneReply}
          />
        </section>
      )}

      {/* The Ask Held composer gets its own clean band, clearly above the
          divider/cradle so it never feels squeezed against the physical layer. */}
      {isSettled && (
        <form
          className={`absolute bottom-[calc(22px+31.5%+env(safe-area-inset-bottom))] left-1/2 z-[90] w-[84%] -translate-x-1/2 transition-all duration-200 ${
            isPhoneEngaged
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-[6px] opacity-0"
          }`}
          data-held-phone-interactive="true"
          onSubmit={submitFollowup}
        >
          <label className="sr-only" htmlFor="held-phone-followup">
            Ask Held
          </label>
          <input
            className="h-9 w-full border-0 border-b border-[#b8893c] bg-transparent px-1 text-center font-serif text-[16px] italic leading-none text-[#2a2520] outline-none placeholder:text-[#756452]/65 focus:border-[#9f6f24]"
            disabled={phoneReplyStatus === "thinking"}
            id="held-phone-followup"
            ref={composerInputRef}
            onBlur={() => setIsComposerFocused(false)}
            onFocus={() => setIsComposerFocused(true)}
            onChange={event => {
              if (phoneReply) {
                setPhoneReply("");
                setPhoneReplyVisible(false);
              }
              if (phoneReplyStatus !== "idle") setPhoneReplyStatus("idle");
              setComposerValue(event.target.value);
            }}
            onKeyDown={event => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              void submitFollowupValue(event.currentTarget.value);
            }}
            placeholder="Ask Held..."
            type="text"
            value={composerValue}
          />
          <p className="mt-1 text-center font-serif text-[12px] italic leading-none text-[#7a6d5f]">
            speak or type
          </p>
          {isPhoneEngaged && !isComposerFocused && (!phoneReply || phoneReplyStatus === "thinking") && (
            <HeldPhoneListeningGlyph />
          )}
        </form>
      )}

      {/* The full physical object layer (divider, cradle, pen, tokens, phone)
          is lifted together so the walnut cradle always sits fully visible
          with breathing room — never cut off at the frame's bottom edge. */}
      {isSettled && (
        <div
          aria-hidden="true"
          className="absolute bottom-[calc(36px+24.5%+env(safe-area-inset-bottom))] left-1/2 z-20 h-px w-[85%] -translate-x-1/2 bg-[#b8893c]"
        />
      )}

      <img
        alt=""
        className={`pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 select-none transition-all duration-700 ${
          !isInk
            ? "bottom-[calc(46px+env(safe-area-inset-bottom))] w-[66%] opacity-100 drop-shadow-[0_16px_16px_rgba(45,29,16,0.32)]"
            : "bottom-[-6%] w-[108%] opacity-80 drop-shadow-[0_22px_30px_rgba(45,29,16,0.26)]"
        }`}
        data-held-home-cradle="true"
        draggable={false}
        src={HELD_ASSETS.trayHeldBox}
      />
      {isSettled && (
        <>
          <img
            alt=""
            aria-hidden="true"
            className={`pointer-events-none absolute bottom-[calc(48px+env(safe-area-inset-bottom))] right-[10px] z-[124] h-[clamp(176px,23dvh,202px)] w-auto max-w-none select-none drop-shadow-[0_9px_10px_rgba(38,24,13,0.20)] transition-all duration-300 ease-out ${
              isPhoneEngaged ? "opacity-90" : "opacity-0"
            }`}
            draggable={false}
            src={HELD_ASSETS.phoneCord}
            style={{
              transform: isPhoneEngaged
                ? "translate(-12px, -50px) rotate(-2deg) scaleX(0.62)"
                : "translate(18px, 10px) rotate(4deg) scale(0.48)",
              transformOrigin: "82% 92%",
            }}
          />
          <button
            aria-label="Lift phone to speak to Held"
            className={`group absolute bottom-[calc(46px+env(safe-area-inset-bottom))] right-[14px] z-[130] h-[clamp(188px,24dvh,208px)] w-[118px] touch-none border-0 bg-transparent p-0 outline-none transition-[filter,transform] duration-300 ease-out focus-visible:ring-2 focus-visible:ring-[#b8893c]/60 ${
              isPhoneEngaged
                ? "drop-shadow-[0_12px_14px_rgba(44,28,14,0.24)]"
                : hasActiveTrayWork
                  ? "drop-shadow-[0_10px_12px_rgba(184,137,60,0.16)]"
                  : "drop-shadow-[0_8px_10px_rgba(44,28,14,0.18)]"
            }`}
            data-held-phone-interactive="true"
            data-held-phone-state={isPhoneEngaged ? "engaged" : "docked"}
            onPointerCancel={finishPhoneLift}
            onPointerDown={startPhoneLift}
            onPointerMove={movePhoneLift}
            onPointerUp={finishPhoneLift}
            style={{
              transform: isPhoneEngaged
                ? `translate(${PHONE_ENGAGED_X}px, ${PHONE_ENGAGED_Y}px) rotate(-4deg)`
                : `translate(0, ${phoneDragY}px) rotate(${phoneDragY < -8 ? -2 : 0}deg)`,
            }}
            type="button"
          >
            {hasActiveTrayWork && !isPhoneEngaged && (
              <motion.span
                animate={{ opacity: [0.1, 0.26, 0.1] }}
                aria-hidden="true"
                className="pointer-events-none absolute left-[20px] top-[16px] h-[78px] w-[58px] rounded-[42%] bg-[radial-gradient(circle_at_28%_18%,rgba(255,244,214,0.62),transparent_70%)]"
                transition={{ duration: 4.4, ease: "easeInOut", repeat: Infinity }}
              />
            )}
            <span
              aria-hidden="true"
              className={`absolute left-[36px] top-[28px] h-16 w-16 rounded-full border border-[#b8893c]/30 transition-opacity duration-200 ${
                isPhoneEngaged && !isComposerFocused ? "opacity-60 shadow-[0_0_22px_rgba(184,137,60,0.22)]" : "opacity-0"
              }`}
            />
            <img
              alt=""
              className="pointer-events-none absolute bottom-0 left-[-22px] h-full w-auto max-w-none select-none"
              draggable={false}
              src={HELD_ASSETS.phoneBody}
            />
          </button>
        </>
      )}
      {/* Token tray anchors at the walnut cradle when settled. During the clay
          beat tokens condense above the drawing, then glide down into the tray. */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 ${
          isSettled
            ? "bottom-[calc(36px+3.8%+env(safe-area-inset-bottom))] z-[115] h-[17%] w-[55%]"
            : "bottom-[35%] z-20 h-[32%] w-[88%]"
        }`}
      >
        {tokens.map((token, index) => {
          const isEmphasized =
            highlightedServiceType === token.type || selectedToken?.type === token.type;
          const isDryCleaningToken = token.type === "dry_cleaning";
          return (
          <button
            aria-label={token.type === "laundry_pickup" ? "Open Laundry Butler service details" : "Open service details"}
            className={`pointer-events-auto absolute touch-manipulation transition-[transform,filter] duration-200 active:scale-[0.94] ${
              isSettled
                ? tokens.length === 1
                  ? "h-[clamp(160px,22dvh,210px)] w-[clamp(160px,22dvh,210px)]"
                  : tokens.length === 2
                    ? "h-[clamp(96px,13dvh,124px)] w-[clamp(96px,13dvh,124px)]"
                    : "h-[clamp(68px,9dvh,88px)] w-[clamp(68px,9dvh,88px)]"
                : isDryCleaningToken
                  ? "h-[140px] w-[140px]"
                  : "h-[96px] w-[96px]"
            } ${isEmphasized ? "z-[2]" : ""}`}
            key={`${token.src}-${index}`}
            onClick={event => {
              if (longPressOpenedRef.current) {
                event.preventDefault();
                longPressOpenedRef.current = false;
                return;
              }

              openToken(token);
            }}
            onContextMenu={event => event.preventDefault()}
            onPointerCancel={clearLongPress}
            onPointerDown={event => startTokenPress(token, event)}
            onPointerLeave={clearLongPress}
            onPointerMove={moveTokenPress}
            onPointerUp={clearLongPress}
            style={{
              left: `${tokenPositions[index]?.left ?? 50}%`,
              top: `${tokenPositions[index]?.top ?? 50}%`,
              transform: `translate(-50%, calc(-50% + ${isSettled ? 0 : -112}px)) scale(${
                isInk || gatherClayHidesTokens ? 0.6 : isEmphasized ? 1.06 : 1
              })`,
              // Ink Gathers: matter before image. Tokens stay hidden while the
              // ink is still beading/flowing (tension+gather) and only take
              // form INSIDE the condensing clay pools.
              opacity: isInk || gatherClayHidesTokens ? 0 : 1,
              transition:
                "transform 560ms cubic-bezier(0.22, 1, 0.36, 1), opacity 420ms ease-out",
              transitionDelay: `${index * 90}ms`,
              willChange: "transform, opacity",
            }}
            type="button"
          >
            <img
              alt=""
              className={`h-full w-full object-contain ${
                isEmphasized
                  ? "drop-shadow-[0_12px_14px_rgba(184,137,60,0.28)]"
                  : isSettled
                    ? "drop-shadow-[0_10px_12px_rgba(42,28,16,0.28)]"
                    : "drop-shadow-[0_6px_8px_rgba(42,28,16,0.16)]"
              }`}
              draggable={false}
              src={token.src}
            />
          </button>
        );
        })}
      </div>
      {showInstructionBook && (
        <HeldInstructionBook
          isGuideOpen={instructionsGuideOpen}
          onToggleGuide={onInstructionsGuideToggle}
        />
      )}
      {isSettled && courierStatus !== "idle" && (
        <HeldCourierGesture
          message={courierMessage}
          onDispatchComplete={() => setCourierStatus("courier_out")}
          onCloseSlip={() => setCourierSlipOpen(false)}
          onOpenSlip={openCourierSlip}
          serviceLabel={courierServiceLabel}
          stateLabel={courierStateLabel}
          slipMode={courierSlipMode}
          slipOpen={courierSlipOpen}
          status={courierStatus}
          trotStripUrl={trotStripUrl}
        />
      )}
      <AnimatePresence>
        {selectedToken?.type === "laundry_pickup" ? (
          <LaundryServiceDetail key="laundry-vitrine" onClose={() => setSelectedToken(null)} />
        ) : selectedToken ? (
          <HeldServiceVitrine
            key="service-vitrine"
            displayRequest={displayRequest}
            onClose={() => setSelectedToken(null)}
            token={selectedToken}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function HeldServiceVitrine({
  displayRequest,
  onClose,
  token,
}: {
  displayRequest: string;
  onClose: () => void;
  token: HeldTokenAsset;
}) {
  const swipeStartYRef = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    swipeStartYRef.current = event.clientY;
  };

  const handlePointerUp = (event: PointerEvent<HTMLElement>) => {
    if (swipeStartYRef.current === null) return;
    const dy = event.clientY - swipeStartYRef.current;
    swipeStartYRef.current = null;
    if (dy > 100) {
      onClose();
    }
  };

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="absolute inset-0 z-[140] overflow-hidden bg-[#f4ecdf] text-[#2d251d]"
      exit={{ opacity: 0, y: 18 }}
      initial={{ opacity: 0, y: 18 }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(255,252,246,0.84), rgba(244,235,222,0.92)), url(/held/held-paper-bg.png)",
          backgroundPosition: "center",
          backgroundSize: "cover, 420px 420px",
        }}
      />
      <div className="absolute inset-x-0 top-2 z-[210] flex justify-center">
        <div className="h-1.5 w-12 rounded-full bg-[#b78a35]/40" />
      </div>
      <button
        aria-label="Close service vitrine"
        className="absolute right-[7%] top-[7%] z-[210] grid h-11 w-11 place-items-center rounded-full border border-[#b78a35]/70 bg-[#fff8ec] font-serif text-[22px] text-[#9b6f23] shadow-[0_8px_18px_rgba(68,45,20,0.18)]"
        onClick={onClose}
        type="button"
      >
        ×
      </button>
      <div className="relative z-10 flex h-full flex-col px-[8%] pb-8 pt-[8%]">
        <img alt="HELD" className="h-10 w-10 object-contain" src={HELD_ASSETS.logoMark} />
        <p className="mt-1 text-[10px] uppercase tracking-[0.32em] text-[#7a6d5f]">
          Vitrine
        </p>
        <h1 className="mt-9 font-serif text-[44px] leading-none">
          {getServiceLabel(token.type)}
        </h1>
        <p className="mt-2 max-w-[210px] font-serif text-[15px] italic leading-5 text-[#5c4c3e]">
          Held in motion.
        </p>

        <div className="mt-8 rounded-[6px] border border-[#d1bea0]/80 bg-[#fff8ec]/58 p-7 shadow-[0_18px_32px_rgba(50,35,20,0.12)]">
          <div className="mx-auto grid h-[170px] w-[220px] place-items-center rounded-[4px] bg-[#eee1cd]/60 shadow-inner">
            <img
              alt=""
              className="h-24 w-24 object-contain drop-shadow-[0_16px_18px_rgba(42,28,16,0.18)]"
              draggable={false}
              src={token.src}
            />
          </div>
          <p className="mt-6 text-center text-[11px] uppercase tracking-[0.28em] text-[#8b7a67]">
            Current state
          </p>
          <p className="mt-3 text-center font-serif text-[18px] italic leading-6 text-[#332b24]">
            {displayRequest || `${getServiceLabel(token.type)} is in motion.`}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-6 font-serif text-[15px] text-[#9a681f]">
          <button
            className="underline decoration-[#b78a38]/35 underline-offset-4"
            type="button"
          >
            Reschedule
          </button>
        </div>

        <img
          alt=""
          className="pointer-events-none mt-auto w-full select-none opacity-95 drop-shadow-[0_18px_24px_rgba(45,29,16,0.18)]"
          draggable={false}
          src={HELD_ASSETS.trayHeldBox}
        />
      </div>
    </motion.section>
  );
}

export function getLaundryButlerCompletedServices(
  residentOrders: Array<{ id: number; createdAt: Date | string }>,
  now = new Date(),
) {
  const baseline = new Date("2026-06-19T07:00:00-07:00");
  let gymPickups = 0;
  const cursor = new Date(baseline);
  cursor.setHours(12, 0, 0, 0);
  while (cursor <= now) {
    if ([1, 3, 5].includes(cursor.getDay())) gymPickups += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  const residentOrderIds = new Set(
    residentOrders
      .filter(order => new Date(order.createdAt) >= baseline)
      .map(order => order.id),
  );
  return 127 + gymPickups + residentOrderIds.size;
}

function LaundryServiceDetail({ onClose }: { onClose: () => void }) {
  const swipeStartYRef = useRef<number | null>(null);
  const { data: profileData } = trpc.chat.getVaultProfile.useQuery();
  const { data: requestsData } = trpc.chat.getRequests.useQuery(undefined, { refetchOnMount: "always" });
  const residence = formatHeldResidenceLabel(profileData?.user);
  const completedServices = getLaundryButlerCompletedServices(
    requestsData?.requests.map(request => ({ id: request.id, createdAt: request.createdAt })) ?? [],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    swipeStartYRef.current = event.clientY;
  };

  const handlePointerUp = (event: PointerEvent<HTMLElement>) => {
    if (swipeStartYRef.current === null) return;
    const dy = event.clientY - swipeStartYRef.current;
    swipeStartYRef.current = null;
    if (dy > 100) {
      onClose();
    }
  };

  return (
    <motion.section
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-[140] overflow-hidden bg-[#f4ede0] text-[#2a2520]"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500;600&family=Playfair+Display:wght@600;700&display=swap');
        .held-hand{font-family:'Caveat','Segoe Script',cursive;}
        .held-press{font-family:'Playfair Display',Georgia,serif;text-shadow:0 1px 0 rgba(255,251,240,0.7),0 -1px 1px rgba(46,32,16,0.32);}
        .held-fine{text-shadow:0 1px 0 rgba(255,251,240,0.55);}
        .held-chip{font-family:'Space Grotesk',sans-serif;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#6e4c14;padding:9px 15px;border-radius:3px;border:1px solid #a87c2e;background:linear-gradient(180deg,#f7ecd2,#ead7ac);box-shadow:inset 0 1px 0 rgba(255,255,255,0.7),inset 0 -1px 0 rgba(110,76,20,0.25),0 2px 4px rgba(77,48,19,0.18);}
        .held-chip:active{transform:translateY(1px);box-shadow:inset 0 1px 2px rgba(110,76,20,0.3);}
      `}</style>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(255,252,246,0.72), rgba(244,237,224,0.94)), url(/held/held-paper-bg.png)",
          backgroundPosition: "center",
          backgroundSize: "cover, 420px 420px",
        }}
      />
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="absolute inset-x-[7.5%] bottom-0 top-[12%] z-20 overflow-y-auto pb-[178px] pr-1"
        exit={{ opacity: 0, y: 28 }}
        initial={{ opacity: 0, y: 18 }}
        transition={{ delay: 0.05, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* The vendor's trade card — thick ivory cotton stock on the cream desk. */}
        <article
          className="relative mt-5 rounded-[4px] border border-[#e2d1b0] px-5 pb-7 pt-6"
          style={{
            background:
              "linear-gradient(178deg, #fbf4e4 0%, #f8efdc 58%, #f3e8d0 100%)",
            boxShadow:
              "0 1px 0 rgba(255,255,255,0.65) inset, 0 -1px 0 rgba(120,90,40,0.12) inset, 0 18px 38px rgba(60,40,18,0.2), 0 3px 8px rgba(60,40,18,0.12)",
          }}
        >
          {/* The clay token you tapped, resting on the card's corner. */}
          <button aria-label="Return to Held home" className="absolute -top-3 right-1 z-30 w-[72px] rotate-[9deg]" onClick={onClose} type="button">
            <span className="absolute left-1/2 top-[60%] h-[16px] w-[54px] -translate-x-1/2 rounded-full bg-[#3a2a16]/28 blur-[5px]" />
            <img
              alt=""
              className="relative w-full select-none drop-shadow-[0_9px_9px_rgba(42,28,16,0.28)]"
              draggable={false}
              src={HELD_ASSETS.tokenLaundry}
            />
          </button>

          <header className="text-center">
            <p className="held-fine text-[8.5px] uppercase tracking-[0.4em] text-[#8a755a]">
              HELD — {residence}
            </p>
            <h1 className="held-press mt-4 text-[27px] font-bold leading-none tracking-[0.14em] text-[#3f3022]">
              LAUNDRY BUTLER
            </h1>
            <div className="mt-3 flex items-center justify-center gap-3 text-[#a87c2e]">
              <span className="h-px w-14 bg-gradient-to-r from-transparent to-[#a87c2e]/70" />
              <span className="text-[13px] leading-none">❦</span>
              <span className="h-px w-14 bg-gradient-to-l from-transparent to-[#a87c2e]/70" />
            </div>
            <p className="held-fine mt-2 text-[9.5px] uppercase tracking-[0.34em] text-[#6b5a44]">
              Pickup &amp; delivery
            </p>
          </header>

          <section className="mt-5 flex items-center gap-4">
            <div className="relative w-[88px] shrink-0 rotate-[-2.5deg]">
              <div className="overflow-hidden rounded-[3px] border border-[#b08a45]/70 bg-[#eadcc4] p-[3px] shadow-[0_10px_18px_rgba(77,48,19,0.22)]">
                <div className="h-[100px] overflow-hidden rounded-[2px]">
                  <img
                    alt="Laundry Butler provider"
                    className="h-full w-full object-cover saturate-[0.72] sepia-[0.24]"
                    draggable={false}
                    src={HELD_ASSETS.laundryProvider}
                    style={{
                      objectPosition: "34% 34%",
                      transform: "scale(1.34)",
                    }}
                  />
                </div>
              </div>
              <span
                className="absolute left-[4px] top-[4px] h-[6px] w-[6px] rounded-full"
                style={{
                  background:
                    "radial-gradient(circle at 35% 30%, #f0dca8, #a87c2e 60%, #6e4c14)",
                }}
              />
              <span
                className="absolute right-[4px] top-[4px] h-[6px] w-[6px] rounded-full"
                style={{
                  background:
                    "radial-gradient(circle at 35% 30%, #f0dca8, #a87c2e 60%, #6e4c14)",
                }}
              />
            </div>
            <div className="min-w-0">
              <p className="held-hand rotate-[-1.5deg] text-[28px] leading-none text-[#5b4632]">
                Adam
              </p>
              <p className="held-fine mt-1.5 text-[8.5px] uppercase tracking-[0.28em] text-[#6b5a44]">
                Your driver
              </p>
              <p className="mt-2 font-serif text-[12px] italic leading-[1.45] text-[#6f6254]">
                Trusted vendor · {completedServices} services completed
              </p>
            </div>
          </section>

          <section className="relative mt-5 border-t border-[#d9c39c]/60 pt-3">
            <p className="held-fine text-[9px] uppercase tracking-[0.3em] text-[#6b5a44]">
              Current status
            </p>
            <h2 className="mt-1.5 max-w-[55%] font-serif text-[18px] italic leading-[1.2] text-[#201b17]">
              Pickup scheduled for tomorrow
            </h2>
            <div
              className="absolute right-0 top-2 rotate-[-6deg]"
              style={{
                color: "#7a2a1f",
                maskImage:
                  "radial-gradient(130% 110% at 34% 38%, black 52%, rgba(0,0,0,0.6) 76%, rgba(0,0,0,0.88) 100%)",
                mixBlendMode: "multiply",
                opacity: 0.9,
                WebkitMaskImage:
                  "radial-gradient(130% 110% at 34% 38%, black 52%, rgba(0,0,0,0.6) 76%, rgba(0,0,0,0.88) 100%)",
              }}
            >
              <div className="rounded-[6px] border-[2.5px] border-current p-[3px]">
                <div className="rounded-[3px] border border-current px-3 py-1.5 text-center">
                  <p
                    className="text-[17px] font-bold leading-none tracking-[0.18em]"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    SCHEDULED
                  </p>
                  <p className="mt-[3px] text-[6.5px] font-semibold uppercase tracking-[0.3em]">
                    Tomorrow · HELD
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-3">
            <StatusDetailRow label="Pickup window" value="Tomorrow · 7:00–9:00 AM" />
            <StatusDetailRow label="Driver status" value="Not dispatched" />
            <StatusDetailRow label="Residence" value={residence} />
            <StatusDetailRow label="Estimated return" value="Tomorrow · 6:00 PM" />
            <StatusDetailRow label="Estimated total" value="$44.00" />
            <StatusDetailRow label="Order number" value="L-30218" />
          </section>

          <section className="mt-4 pt-1 text-center">
            <p className="held-fine text-[9px] uppercase tracking-[0.3em] text-[#6b5a44]">
              Service includes
            </p>
            <p className="mt-1.5 font-serif text-[14px] italic leading-6 text-[#3b3128]">
              Pickup · Wash &amp; fold · Dry clean on request · Return delivery
            </p>
            <div className="mt-3 flex justify-center gap-3">
              <a className="held-chip" href="tel:+13238074661">
                Call driver
              </a>
              <a className="held-chip" href="sms:+13238074661">
                Text driver
              </a>
            </div>
          </section>

          <section className="mt-5">
            <VitrineJourneyList />
          </section>

          <footer className="mt-6 flex flex-col items-center">
            <div className="relative h-[60px] w-[64px] rotate-[-6deg]">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at 34% 28%, #a63a28, #7c2317 56%, #58130c 92%)",
                  borderRadius: "46% 54% 52% 48% / 54% 46% 52% 48%",
                  boxShadow:
                    "inset 0 2px 3px rgba(255,160,120,0.35), inset 0 -3px 5px rgba(30,5,2,0.45), 0 6px 12px rgba(60,18,8,0.32)",
                }}
              />
              <span
                className="absolute -right-[6px] top-[12px] h-[13px] w-[13px]"
                style={{
                  background:
                    "radial-gradient(circle at 35% 30%, #9c3325, #6d1d12)",
                  borderRadius: "55% 45% 50% 50% / 50% 55% 45% 50%",
                }}
              />
              <div
                className="absolute inset-[9px] grid place-items-center"
                style={{
                  borderRadius: "50%",
                  boxShadow:
                    "inset 0 1px 2px rgba(30,5,2,0.55), inset 0 -1px 1px rgba(255,150,110,0.3)",
                }}
              >
                <span
                  className="font-serif text-[25px] leading-none text-[#511008]"
                  style={{
                    textShadow:
                      "0 1px 1px rgba(255,140,100,0.4), 0 -1px 1px rgba(20,2,0,0.6)",
                  }}
                >
                  H
                </span>
              </div>
            </div>
            <p className="mt-3 font-serif text-[15px] italic text-[#3b3128]">
              Everything kept on file.
            </p>
          </footer>
        </article>
      </motion.div>
      {/* Vitrine glass between the viewer and the card. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[40]"
        style={{
          background:
            "linear-gradient(112deg, transparent 30%, rgba(255,255,255,0.15) 38%, rgba(255,255,255,0.04) 45%, transparent 50%, transparent 62%, rgba(255,255,255,0.09) 68%, transparent 74%), linear-gradient(180deg, rgba(255,255,255,0.16), transparent 9%)",
        }}
      />
      <VitrineRecededCradle />
      <div className="pointer-events-none absolute inset-x-0 bottom-[22%] z-[12] h-[36%] bg-gradient-to-b from-[#f4ede0]/16 via-[#f4ede0]/68 to-[#f4ede0]/88" />
    </motion.section>
  );
}

function VitrineRecededCradle() {
  return (
    <div
      className="pointer-events-none absolute bottom-[26%] left-1/2 z-10 w-[108%] -translate-x-1/2"
      data-held-vitrine-cradle="true"
    >
      <motion.div
        animate={{
          filter: "saturate(0.62) blur(4px)",
          opacity: 0.2,
          scale: 0.78,
        }}
        className="relative w-full"
        exit={{
          filter: "saturate(1) blur(0px)",
          opacity: 1,
          scale: 1,
          transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
        }}
        initial={{
          filter: "saturate(1) blur(0px)",
          opacity: 1,
          scale: 1,
        }}
        style={{
          filter: "saturate(0.62) blur(4px)",
          transformOrigin: "50% 94%",
        }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <img
          alt=""
          className="w-full select-none"
          draggable={false}
          src={HELD_ASSETS.trayHeldBox}
        />
        <img
          alt=""
          className="absolute left-1/2 top-[30%] w-[17%] -translate-x-1/2 -translate-y-1/2 select-none drop-shadow-[0_12px_16px_rgba(42,28,16,0.18)]"
          draggable={false}
          src={HELD_ASSETS.tokenLaundry}
        />
      </motion.div>
    </div>
  );
}

function StatusDetailRow({ label, value }: { label: string; value: string }) {
  // Ledger line: letterpress label, dotted leader, fountain-pen value.
  return (
    <div className="flex items-end gap-2 border-b border-[#d9c39c]/55 py-[7px]">
      <p className="held-fine shrink-0 pb-[4px] text-[9px] uppercase tracking-[0.2em] text-[#6b5a44]">
        {label}
      </p>
      <span className="mb-[8px] min-w-[14px] flex-1 border-b border-dotted border-[#b08a45]/55" />
      <p className="held-hand max-w-[58%] rotate-[-0.8deg] pr-1 text-right text-[20px] leading-[1.05] text-[#5b4632]">
        {value}
      </p>
    </div>
  );
}

function VitrineJourneyList() {
  const steps = [
    { label: "Requested", meta: "Mon 9:14 AM ✓", state: "done" },
    { label: "Scheduled", meta: "Mon 9:18 AM ✓", state: "done" },
    { label: "Confirmed", meta: "pickup set", state: "current" },
    { label: "En route", meta: "not dispatched", state: "future" },
    { label: "In progress", meta: "pending", state: "future" },
    { label: "Complete", meta: "pending", state: "future" },
  ] as const;

  // Railway-ticket passage record: punched stops, pencil-circled current leg.
  return (
    <div className="relative rounded-[3px] border border-dashed border-[#b08a45]/55 bg-[#f1e3c6]/70 px-4 pb-3 pt-2.5">
      <span
        className="absolute -left-[8px] top-1/2 h-[15px] w-[15px] -translate-y-1/2 rounded-full border border-dashed border-[#b08a45]/55"
        style={{ background: "#f9f1e0" }}
      />
      <span
        className="absolute -right-[8px] top-1/2 h-[15px] w-[15px] -translate-y-1/2 rounded-full border border-dashed border-[#b08a45]/55"
        style={{ background: "#f9f1e0" }}
      />
      <p className="held-fine text-center text-[8.5px] uppercase tracking-[0.34em] text-[#8a6c3c]">
        Journey — passage record
      </p>
      <ol className="mt-1.5">
        {steps.map((step, index) => (
          <li
            className={`grid grid-cols-[26px_1fr_auto] items-center gap-2 py-[5px] ${
              index > 0 ? "border-t border-dotted border-[#b08a45]/30" : ""
            } ${step.state === "future" ? "opacity-40" : ""}`}
            key={step.label}
          >
            {step.state === "done" ? (
              <span
                className="mx-auto h-[12px] w-[12px] rounded-full"
                style={{
                  background: "#f4ede0",
                  boxShadow:
                    "inset 0 1px 2px rgba(58,40,18,0.5), inset 0 -1px 1px rgba(255,255,255,0.55), 0 1px 0 rgba(255,255,255,0.6)",
                }}
              />
            ) : step.state === "current" ? (
              <span
                className="mx-auto h-[16px] w-[16px] rotate-[-8deg] border-2 border-[#4d453c]"
                style={{ borderRadius: "52% 48% 50% 50% / 48% 52% 46% 54%" }}
              />
            ) : (
              <span className="mx-auto h-[7px] w-[7px] rounded-full border border-[#8f8377]" />
            )}
            <p
              className={`held-fine text-[9.5px] uppercase tracking-[0.18em] ${
                step.state === "current" ? "text-[#2a2520]" : "text-[#5f5145]"
              }`}
            >
              {step.label}
            </p>
            <p
              className={`held-hand text-right text-[17px] leading-none ${
                step.state === "current" ? "text-[#7a2a1f]" : "text-[#5b4632]"
              }`}
            >
              {step.meta}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ServiceGlyph({
  kind,
  label,
}: {
  kind: "pickup" | "fold" | "hanger" | "truck";
  label: string;
}) {
  return (
    <div className="flex min-h-[56px] flex-col items-center justify-start px-1 text-center">
      <svg
        aria-hidden="true"
        className="h-7 w-10 overflow-visible"
        fill="none"
        stroke="#1A1A1A"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
        viewBox="0 0 64 48"
      >
        {kind === "pickup" && (
          <path d="M24 14c3-5 13-5 16 0m-19 2c-3 8-6 18-5 25 8 3 24 3 32 0 1-7-2-17-5-25-6 4-16 4-22 0Z" />
        )}
        {kind === "fold" && (
          <path d="M14 18c7-5 30-5 37 0 3 2 3 5-1 7-8 4-27 4-35 0-4-2-4-5-1-7Zm2 11c8 4 27 4 35 0M17 36c8 4 25 4 33 0" />
        )}
        {kind === "hanger" && (
          <path d="M32 14c0-6 8-5 7 1-.8 4-7 4-7 8m0 0L14 36c11 3 25 3 36 0L32 23Z" />
        )}
        {kind === "truck" && (
          <path d="M10 31h8m0 0V18h25v13m-25 0h25m0 0h5V23h-9m-18 12a4 4 0 1 1-8 0m31 0a4 4 0 1 1-8 0" />
        )}
      </svg>
      <p className="font-serif text-[10px] italic leading-3">{label}</p>
    </div>
  );
}

function PicassoJourneyLine() {
  const stages = [
    { label: "Requested", x: 7, icon: "quill" },
    { label: "Scheduled", x: 25, icon: "calendar" },
    { label: "Confirmed", x: 43, icon: "seal" },
    { label: "En route", x: 61, icon: "truck" },
    { label: "In progress", x: 79, icon: "bag" },
    { label: "Complete", x: 94, icon: "house" },
  ] as const;

  return (
    <div className="relative h-[58px]">
      <svg
        aria-hidden="true"
        className="absolute inset-x-0 top-[-4px] h-[46px] w-full overflow-visible"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        viewBox="0 0 360 72"
      >
        <path
          d="M5 42 C42 25 57 50 87 42 S132 34 158 42 S211 51 224 38 S270 30 293 42 S332 54 356 38"
          stroke="#1A1A1A"
          strokeWidth="1.8"
        />
        <path
          d="M224 38 C251 31 274 32 293 42 S332 54 356 38"
          opacity="0.7"
          stroke="#F4EDE0"
          strokeWidth="5"
        />
        <path
          d="M224 38 C251 31 274 32 293 42 S332 54 356 38"
          opacity="0.3"
          stroke="#1A1A1A"
          strokeWidth="1.8"
        />
        <circle cx="220" cy="38" fill="#b8893c" opacity="0.18" r="22" />
        <circle cx="220" cy="38" fill="#b8893c" opacity="0.08" r="30" />
        <text fill="#a06a2b" fontFamily="serif" fontSize="11" fontStyle="italic" x="210" y="12">
          now
        </text>
        {stages.map(stage => (
          <JourneyGlyph icon={stage.icon} key={stage.label} x={(stage.x / 100) * 360} />
        ))}
      </svg>
      <div className="absolute inset-x-0 bottom-0 grid grid-cols-6 gap-0 text-center">
        {stages.map(stage => (
          <p
            className={`text-[8px] uppercase leading-3 tracking-[0.08em] ${
              stage.label === "En route" ? "text-[#8d6322]" : "text-[#3c342d]"
            }`}
            key={stage.label}
          >
            {stage.label}
          </p>
        ))}
      </div>
    </div>
  );
}

function JourneyGlyph({
  icon,
  x,
}: {
  icon: "quill" | "calendar" | "seal" | "truck" | "bag" | "house";
  x: number;
}) {
  return (
    <g stroke="#1A1A1A" strokeWidth="1.5" transform={`translate(${x - 13} 24)`}>
      {icon === "quill" && <path d="M8 19C12 6 23 2 25 2c0 9-7 17-17 17Zm0 0 15-13" />}
      {icon === "calendar" && <path d="M5 8h22v19H5Zm0 6h22M10 4v7m12-7v7" />}
      {icon === "seal" && <path d="M16 4c8 0 13 5 13 12s-5 12-13 12S3 23 3 16 8 4 16 4Zm-7 12h14" />}
      {icon === "truck" && <path d="M3 20h6V9h16v11h4v-6l-5-5h-5m-7 14a3 3 0 1 1-6 0m22 0a3 3 0 1 1-6 0" />}
      {icon === "bag" && <path d="M10 8c2-4 10-4 12 0m-14 2c-3 6-4 13-3 18 6 2 17 2 23 0 1-5-1-12-4-18-4 3-12 3-16 0Z" />}
      {icon === "house" && <path d="M4 17 16 6l12 11m-20-1v13h16V16" />}
    </g>
  );
}

function getTokenAssets(services: HeldParsedService[], request: string): HeldTokenAsset[] {
  const activeServices = services.filter(service => !isTerminalHeldService(service));
  const serviceTypes = activeServices.map(service => service.type).join(" ");
  // Once persisted services exist, they are authoritative. In particular, do
  // not resurrect a delivered token merely because the original request text
  // still mentions laundry or dry cleaning.
  const haystack = (services.length > 0 ? serviceTypes : request).toLowerCase();
  const assets: HeldTokenAsset[] = [];

  if (/laundry|wash[_\s-]*fold/.test(haystack)) assets.push({ src: HELD_ASSETS.tokenLaundry, type: "laundry_pickup" });
  if (/dry[_\s-]*clean/.test(haystack)) assets.push({ src: HELD_ASSETS.tokenDryCleaning, type: "dry_cleaning" });
  if (/dog|groom/.test(haystack)) assets.push({ src: HELD_ASSETS.tokenDogGroom, type: "dog_grooming" });
  if (/car|detail|wash/.test(haystack)) assets.push({ src: HELD_ASSETS.tokenCarDetail, type: "car_detail" });
  if (/airport|ride|uber|waymo|lax/.test(haystack)) assets.push({ src: HELD_ASSETS.tokenRide, type: "ride_airport" });
  if (/haircut|hair cut|barber|blowout/.test(haystack)) assets.push({ src: HELD_ASSETS.tokenHaircut, type: "haircut" });

  if (assets.length || services.length > 0) return assets;
  return [{ src: HELD_ASSETS.tokenLaundry, type: "laundry_pickup" }];
}

function getServiceLabel(type: string) {
  if (type === "laundry_pickup") return "Laundry pickup";
  if (type === "dry_cleaning") return "Dry cleaning";
  if (type === "dog_grooming") return "Dog grooming";
  if (type === "car_detail") return "Car detail";
  if (type === "ride_airport") return "Airport pickup";
  if (type === "haircut") return "Haircut";
  return "Service";
}

function getCourierServiceLabel(services: HeldParsedService[], request: string) {
  const serviceLabels = getTokenAssets(services, request)
    .map(token => getServiceLabel(token.type))
    .filter(Boolean);
  const unique = Array.from(new Set(serviceLabels));
  if (unique.length === 0) return "Current service thread";
  if (unique.length === 1) return `${unique[0]} thread`;
  return `${unique.slice(0, -1).join(", ")} and ${unique[unique.length - 1]} threads`;
}

function markBookableDemoServices(
  services: HeldParsedService[],
  request: string,
  orderId: number,
): HeldParsedService[] {
  return withDemoVendorBookingState(services, request, orderId) as HeldParsedService[];
}

function buildReactivePhoneFollowup(
  message: string,
  services: HeldParsedService[],
  displayRequest: string,
): {
  courierStateLabel: string;
  nextServices?: HeldParsedService[];
  reply: string;
  threadLabel: string;
  triggersCourier: boolean;
} {
  const normalized = message.toLowerCase().replace(/\s+/g, " ").trim();
  const hasCarDetail = /\b(car detail|auto detail|detail my car|detail the car|car wash|wash my car|car cleaned|clean my car|detail the prius|detail the tesla|detail the suv|detail my suv)\b/.test(
    normalized,
  );
  const hasLaundry = /\b(laundry|wash|dry clean|dry-clean|clothes|hamper)\b/.test(normalized);
  const asksStatus = /\b(what'?s already booked|what is already booked|what'?s booked|what is booked|already booked|status|recap|where (are|is) we|what do i have)\b/.test(
    normalized,
  );
  const asksPrice = /\b(price|cost|how much|total|receipt)\b/.test(normalized);
  const gratitude = /\b(thanks|thank you|appreciate|perfect|great|ok|okay)\b/.test(normalized);

  // A. Known-answer questions (laundry)
  const isWho = /\bwho\b.*\b(doing|handling|laundry|butler)\b/i.test(normalized) || /\bwho is doing my laundry\b/i.test(normalized);
  const isReturn = (/\b(when|how)\b.*\b(get|receive|return|back|deliver)\b.*\blaundry\b/i.test(normalized)) ||
                   (/\b(laundry|it|back)\b.*\b(return|get back|delivered)\b/i.test(normalized)) ||
                   /\bget my laundry back\b/i.test(normalized);
  const isPickup = /\b(what time|when|scheduled)\b.*\b(pickup|pick up)\b/i.test(normalized) ||
                   /\b(laundry pickup time|time is laundry pickup|when is laundry pickup)\b/i.test(normalized);

  if (isReturn) {
    return {
      courierStateLabel: "Known vendor intake.",
      reply: "LAUNDRY BUTLER picks up tomorrow morning between 7–9am and returns same day between 7–9pm.",
      threadLabel: "LAUNDRY BUTLER",
      triggersCourier: false,
    };
  }
  if (isPickup) {
    return {
      courierStateLabel: "Known vendor intake.",
      reply: "LAUNDRY BUTLER is booked for tomorrow morning, 7–9am.",
      threadLabel: "LAUNDRY BUTLER",
      triggersCourier: false,
    };
  }
  if (isWho) {
    return {
      courierStateLabel: "Known vendor intake.",
      reply: "Your laundry is booked with LAUNDRY BUTLER.",
      threadLabel: "LAUNDRY BUTLER",
      triggersCourier: false,
    };
  }

  // B. Status recap
  if (asksStatus) {
    return {
      courierStateLabel: "Local status only.",
      reply: buildPlanStatusReply(services),
      threadLabel: "Current plan",
      triggersCourier: false,
    };
  }

  // C. Add-service request
  const isLaundryScheduleChange =
    (hasLaundry || /\b(laundry|butler|they)\b/.test(normalized)) &&
    (/\b(earlier|sooner|later|move|change|switch|reschedule|adjust)\b/i.test(normalized) ||
     (/\b(5\s*pm|5|8\s*am|8)\b/.test(normalized) && /\b(deliver|return|bring|get|pickup|pick up|need|have)\b/.test(normalized)));

  if (hasCarDetail && !isLaundryScheduleChange) {
    const existing = services.some(service => service.type === "car_detail");
    const nextServices = existing
      ? services.map(service =>
          service.type === "car_detail"
            ? withCarDetailBooking(service, `${displayRequest} ${message}`, "phone")
            : service,
        )
      : [
          ...services,
          withCarDetailBooking({
            type: "car_detail",
          }, `${displayRequest} ${message}`, "phone"),
        ];
    const detailService = nextServices.find(service => service.type === "car_detail");

    return {
      courierStateLabel: "Booked internally / awaiting operator coordination.",
      nextServices,
      reply: detailService
        ? buildCarDetailBookedSentence(detailService, `${displayRequest} ${message}`)
        : `I have car detail booked for ${CAR_DETAIL_KNOWLEDGE.defaultBookingDate}, ${CAR_DETAIL_KNOWLEDGE.defaultBookingWindow}, with ${CAR_DETAIL_KNOWLEDGE.vendorName}.`,
      threadLabel: "Car detail",
      triggersCourier: true,
    };
  }

  // D. Laundry schedule change request — vendor-facing, so the courier rides.
  // The reply must demonstrate intelligence BEFORE the horse appears: state the
  // known vendor policy, name the exception being requested, then say HELD is
  // asking. Never claim the change is confirmed.
  if (isLaundryScheduleChange) {
    let reply =
      "LAUNDRY BUTLER currently returns laundry between 7–9pm. An earlier return would require an exception from the vendor — I’m asking them now.";
    if (/\b(5\s*pm|5)\b/.test(normalized)) {
      reply =
        "LAUNDRY BUTLER currently returns laundry between 7–9pm. A 5pm return would require an exception from the vendor — I’m asking them now.";
    } else if (/\b(8\s*am|8)\b/.test(normalized)) {
      reply =
        "LAUNDRY BUTLER currently picks up between 7–9am. An 8am pickup would require an exception from the vendor — I’m asking them now.";
    } else if (/\b(pickup|pick up)\b/.test(normalized)) {
      reply =
        "LAUNDRY BUTLER currently picks up between 7–9am. Moving that window needs the vendor’s word — I’m asking them now.";
    }

    return {
      courierStateLabel: "Awaiting outside reply.",
      reply,
      threadLabel: "LAUNDRY BUTLER",
      triggersCourier: true,
    };
  }

  // E. Other price, gratitude, and generic fallbacks
  if (asksPrice) {
    return {
      courierStateLabel: "Local status only.",
      reply: "I’ll keep pricing tied to the actual service records and receipts. Nothing is changing from this question.",
      threadLabel: "Current plan",
      triggersCourier: false,
    };
  }

  if (gratitude) {
    return {
      courierStateLabel: "Local acknowledgement.",
      reply: "Of course. I have the plan held and I’ll come back only when something needs your yes.",
      threadLabel: "Current plan",
      triggersCourier: false,
    };
  }

  if (shouldTriggerCourierDispatch(message)) {
    const threadLabel = inferFollowupThreadLabel(message, services, displayRequest);
    return {
      courierStateLabel: "Awaiting outside reply.",
      reply: `Understood. I’m sending that to the ${threadLabel.toLowerCase()} thread now.`,
      threadLabel: threadLabel === "Laundry" ? "LAUNDRY BUTLER" : threadLabel,
      triggersCourier: true,
    };
  }

  return {
    courierStateLabel: "Local note only.",
    reply: "I heard you. I’ll keep that with the current plan without marking anything confirmed.",
    threadLabel: "Current plan",
    triggersCourier: false,
  };
}

function buildPlanStatusReply(services: HeldParsedService[]) {
  const booked = services
    .filter(service => isBookedService(service))
    .map(service => getServiceLabel(service.type).replace(" pickup", ""));
  const pending = services
    .filter(service => !isBookedService(service))
    .map(service => getServiceLabel(service.type).replace(" pickup", ""));

  if (booked.length && pending.length) {
    return `${formatList(booked)} ${booked.length === 1 ? "is" : "are"} booked. ${formatList(pending)} ${
      pending.length === 1 ? "is" : "are"
    } still awaiting confirmation.`;
  }
  if (booked.length) {
    return `${formatList(booked)} ${booked.length === 1 ? "is" : "are"} booked.`;
  }
  if (pending.length) {
    return `I have the plan, but ${formatList(pending)} ${
      pending.length === 1 ? "still needs" : "still need"
    } confirmation before I can call it booked.`;
  }
  return "I have the plan, but nothing is marked booked yet.";
}

function isBookedService(service: HeldParsedService) {
  const status = service.status?.toLowerCase();
  return status === "booked" || status === "confirmed" || status === "booked_internal" || service.orderId != null;
}

function formatList(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function inferFollowupThreadLabel(message: string, services: HeldParsedService[], request: string) {
  const normalized = message.toLowerCase();
  if (/\blaundry|wash|dry clean|dry-clean|clothes|hamper\b/.test(normalized)) return "Laundry";
  if (/\bcar|detail|wash my car|car wash\b/.test(normalized)) return "Car detail";
  if (/\bdog|groom\b/.test(normalized)) return "Grooming";
  return getCourierServiceLabel(services, request).replace(/ thread(s)?$/i, "");
}

function shouldTriggerCourierDispatch(message: string) {
  const normalized = message.toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalized) return false;

  const localOnly =
    /\b(status|already booked|what did i book|what's booked|what is booked|how much|price|cost|receipt|total)\b/.test(
      normalized
    ) ||
    /\b(what time|when is|when's|pickup time|return time)\b/.test(normalized);
  const explicitOutbound =
    /\b(ask|tell|message|send|notify|let)\b.*\b(them|vendor|provider|driver|groomer|detailer|cleaner|laundry|maria|jordan|concierge)\b/.test(
      normalized
    );
  const timingChange =
    /\b(can|could|would|is it possible|please)\b.*\b(come|return|arrive|pickup|pick up|do|move|change|switch|make it)\b/.test(
      normalized
    ) &&
    /\b(earlier|later|before|after|instead|morning|afternoon|evening|today|tomorrow|saturday|sunday|monday|tuesday|wednesday|thursday|friday|3|11)\b/.test(
      normalized
    );
  const handoffNote =
    /\b(leave|left|bag|keys|door|front desk|concierge|instructions?|note)\b/.test(normalized) &&
    /\b(tell|let|driver|them|vendor|provider|laundry|groomer|detailer)\b/.test(normalized);
  const namedProvider = /\b(maria|jordan|groomer|detailer|driver|provider|vendor)\b/.test(normalized);

  if (explicitOutbound || timingChange || handoffNote) return true;
  if (namedProvider && !localOnly) return true;
  return false;
}

function inferServicesFromRequest(request: string): HeldParsedService[] {
  const lower = request.toLowerCase();
  const services: HeldParsedService[] = [];

  if (/dry[\s-]?clean/.test(lower)) services.push({ type: "dry_cleaning" });
  if (/laundry/.test(lower)) services.push({ type: "laundry_pickup" });
  if (/dog|groom/.test(lower)) services.push({ type: "dog_grooming" });
  if (/car|detail|wash/.test(lower)) services.push({ type: "car_detail" });
  if (/airport|ride|uber|waymo|lax/.test(lower)) services.push({ type: "ride_airport" });
  if (/haircut|hair cut|barber|blowout/.test(lower)) services.push({ type: "haircut" });

  return services.length ? services : [{ type: "other" }];
}

function buildTypedCommandFallback(text: string) {
  const lower = text.toLowerCase();
  const service = /\blaundry|clothes|hamper|wash\b/.test(lower)
    ? "Pickup laundry"
    : /\bdry[\s-]?clean|\bsuit|\bdress shirt/.test(lower)
      ? "Pickup dry cleaning"
      : /\bdog|groom/.test(lower)
        ? "Book dog grooming"
        : /\bcar|detail|wash/.test(lower)
          ? "Detail the car"
          : /\blax|airport|ride|uber/.test(lower)
            ? "Arrange airport transportation"
            : /\bclean|housekeep|maid/.test(lower)
              ? "Clean the apartment"
              : "Handle this request";
  const timing =
    lower.match(/\btomorrow morning\b/)?.[0] ??
    lower.match(/\btomorrow afternoon\b/)?.[0] ??
    lower.match(/\btomorrow evening\b|\btomorrow night\b/)?.[0] ??
    lower.match(/\btonight\b/)?.[0] ??
    lower.match(/\btomorrow\b/)?.[0] ??
    "";
  const request = `${service}${timing ? ` ${timing}` : ""}.`;

  return request.charAt(0).toUpperCase() + request.slice(1);
}
