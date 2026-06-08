import {
  useEffect,
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
import { AnimatePresence, motion } from "framer-motion";
import { PaymentMethodForm } from "@/components/PaymentMethodForm";
import { isResidentAppTestMode } from "@/lib/residentTestMode";
import { trpc } from "@/lib/trpc";
import Vault from "@/pages/Vault";
import {
  getHeldCompositePath,
  HeldArtistDrawing,
  type HeldParsedService,
} from "./HeldArtistDrawing";
import { HeldVoiceCaptureTray } from "./HeldVoiceCaptureTray";
import { PenChain } from "./PenChain";
import { PenCharm } from "./PenCharm";
import { PenPhysicsDebugPanel } from "./PenPhysicsDebugPanel";
import { HELD_LARGE_PEN_TUNING } from "./heldPenTuning";
import { usePenPhysics, type PenUnlockInfo } from "./usePenPhysics";
import type { PenPhysicsTuningOverrides } from "./penPhysics";
import {
  buildPostOrderChiefOfStaffCopy,
  type PostOrderServiceMeta,
} from "@shared/heldPostOrderCopy";

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
  crest: "/held/crest-h-flat.png",
  galleryBench: "/held/nursery-cradle.png",
  labyrinthBoard: "/held/held_labyrinth_board.png",
  labyrinthKnob: "/held/held_labyrinth_knob.png",
  laundryProvider: "/held/laundry-butler-provider.png",
  microphone: "/held/microphone.png",
  paper: "/held/held-paper-bg.png",
  phoneBody: "/held/phone_3.png",
  phoneCord: "/held/phone_chain_alone.png",
  postTokenField: "/held/textfield-posttoken.png",
  requestCard: "/held/your-request-card.png",
  tokenCarDetail: "/held/token-cardetail.png",
  tokenDogGroom: "/held/token-doggroom.png",
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
    { left: 34, top: 50 },
    { left: 66, top: 50 },
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

export default function PenPullPrototype({
  composerOpen: controlledComposerOpen,
  debug: defaultDebug = false,
  onUnlock,
  penAssetSrc = "/held/fountainpenfull.png",
  reducedMotion,
  showDebugControls = false,
  tuning,
}: PenPullPrototypeProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
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
  const [confirmedRequest, setConfirmedRequest] = useState("");
  const [confirmedServices, setConfirmedServices] = useState<HeldParsedService[]>([]);
  const [debugOpenLaundryVitrine, setDebugOpenLaundryVitrine] = useState(false);
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
  const [typedCommandStatus, setTypedCommandStatus] = useState<
    "idle" | "summarizing" | "ready" | "error"
  >("idle");
  const sendMessageMutation = trpc.chat.sendMessage.useMutation();
  // Timestamp (ms) when the takingCustody ceremony began, i.e. when the user
  // tapped "Set it in motion" and the request card mounted in its stamped
  // state. Used to hand off to the drawing scene right as the card's
  // stamp -> compress -> lift completes, decoupled from network latency so
  // there is never an empty screen nor a premature cut.
  const takingCustodyStartRef = useRef<number | null>(null);
  const drawingHandoffTimerRef = useRef<number | null>(null);
  const saveNameMutation = trpc.chat.saveName.useMutation();
  const { data: profileData } = trpc.chat.getVaultProfile.useQuery(undefined, {
    enabled: mode === "held",
  });
  const residenceLabel = formatHeldResidenceLabel(profileData?.user);
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
  const canReturnToHeld =
    Boolean(confirmedRequest) &&
    Boolean(lastOrderId) &&
    (mode === "choice" ||
      mode === "speech" ||
      mode === "typing" ||
      mode === "requestReady" ||
      mode === "editingRequest" ||
      mode === "collectName" ||
      mode === "collectPayment" ||
      mode === "orderError");
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

    console.debug("[HELD] raw typed text received", { length: text.length });
    setTypedCommandStatus("summarizing");
    setConfirmedRequest(text);
    setMode("requestReady");

    try {
      const result = await parseTextCommand(text);
      console.debug("[HELD] cleaned typed request produced", {
        hasDisplayRequest: Boolean(result.displayRequest?.trim()),
      });
      applyTextCommandResult(text, result);
    } catch (error) {
      console.error("[PenPullPrototype] typed command failed", error);
      applyTextCommandFallback(text);
    }
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

    const orderId = Number(response.booking?.orderId ?? NaN);
    if (response.booking && Number.isFinite(orderId) && orderId > 0) {
      const nextServices = services.length
        ? services
        : inferServicesFromRequest(`${request} ${response.booking.service ?? ""}`);
      setConfirmedRequest(request);
      setConfirmedServices(nextServices);
      setPendingOrderRequest("");
      setPendingOrderServices([]);
      setLastOrderId(orderId);
      setHeldAgentStatus("confirmed");
      setHeldAgentMessage(response.content || "Taking custody.");
      setMode("takingCustody");
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
    setConfirmedServices(nextServices);
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

    try {
      const response = (await sendMessageMutation.mutateAsync({
        content: nextRequest,
        orderMode,
        source: "held",
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
      setHeldAgentMessage(`Good to meet you, ${firstName}. Taking custody.`);
      retryPendingOrder();
    } catch (error) {
      console.error("[HELD] name save failed", error);
      setHeldAgentStatus("error");
      setHeldAgentMessage("I could not save the name yet. Try once more.");
      setMode("orderError");
    }
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
    composerOpen: composerTrayVisible,
    debug,
    onComposerPenSwipe: enterSpeechMode,
    onUnlock: info => {
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
  const returnToHeld = () => {
    if (!confirmedRequest) return;

    if (controlledComposerOpen === undefined) {
      setInternalComposerOpen(false);
    }

    setDraft("");
    setSpeechTranscript("");
    setHeldAgentStatus("idle");
    setHeldAgentMessage("");
    setTypedCommandStatus("idle");
    setMode("held");
    physics.reset();
  };

  useEffect(() => {
    if (mode !== "transforming") return undefined;

    const timer = window.setTimeout(() => {
      setMode("held");
    }, 2200);

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
    setTypedCommandStatus("idle");
    setMode("rest");
    physics.reset();
  };

  useEffect(() => {
    if (!showDebugControls) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("postorder") === "1") {
      // Default post-order QA path: a plain request with NO scripted scenario
      // facts. Proves the screen renders only safe, request-grounded narration.
      setConfirmedRequest("Pick up my laundry tomorrow and book dog grooming this week.");
      setConfirmedServices([{ type: "laundry_pickup" }, { type: "dog_grooming" }]);
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
    setConfirmedServices([{ type: "laundry_pickup" }]);
    setLastOrderId(orderId => orderId ?? 1);
    setMode("held");
    setRootVitrineToken({ src: HELD_ASSETS.tokenLaundry, type: "laundry_pickup" });
  }, [showDebugControls]);

  return (
    <main className="min-h-dvh overflow-hidden bg-[#151311] text-[#2C2824] sm:flex sm:items-center sm:justify-center sm:p-4">
      <section className="relative h-dvh w-full max-w-[430px] sm:h-[min(844px,calc(100dvh-32px))] sm:min-h-[720px] sm:overflow-hidden sm:rounded-[48px] sm:border-[10px] sm:border-[#11100e] sm:shadow-[0_24px_80px_rgba(0,0,0,0.44)]">
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
          <div className="pointer-events-none absolute left-1/2 top-4 z-20 hidden h-9 w-28 -translate-x-1/2 rounded-full bg-black sm:block" />

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

          {showHomeWorld && <header className="pointer-events-none absolute left-[8%] top-[8%] z-20">
            <p className="text-[15px] tracking-[0.08em]">HELD.chat</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.32em] text-[#7a6d5f]">
              Residence 1807 · 12A
            </p>
          </header>}

          {showHomeWorld && (
            canReturnToHeld ? (
              <button
                aria-label="Return to held services"
                className="absolute right-[7%] top-[7%] z-[75] h-10 w-10 rounded-full p-0 opacity-75 transition-opacity active:opacity-100"
                onClick={returnToHeld}
                type="button"
              >
                <img
                  alt=""
                  className="h-full w-full select-none"
                  draggable={false}
                  src={HELD_ASSETS.crest}
                />
              </button>
            ) : (
              <img
                alt=""
                className="pointer-events-none absolute right-[7%] top-[7%] z-20 h-10 w-10 opacity-70"
                draggable={false}
                src={HELD_ASSETS.crest}
              />
            )
          )}

          {showHomeWorld && <section className="pointer-events-none absolute left-[8%] top-[17%] z-10 max-w-[210px]">
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
              className={`pointer-events-none absolute bottom-[-34px] left-1/2 z-10 w-[130%] -translate-x-1/2 select-none drop-shadow-[0_18px_24px_rgba(45,29,16,0.20)] transition-opacity duration-[420ms] ${
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
            className={`pointer-events-none absolute bottom-[72px] left-[9%] right-[9%] z-20 h-px bg-[#b78a38] transition-opacity duration-200 ${
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
                className="z-[80]"
                objectFit="contain"
                penAssetSrc={penAssetSrc}
                transformOrigin="50% 3%"
              />
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

          {mode === "choice" && (
            <p className="pointer-events-none absolute bottom-[292px] left-[13%] right-[22%] z-[42] text-center font-serif text-[15px] italic leading-5 text-[#2f2923]/80">
              Type or speak what's on your mind.
            </p>
          )}

          {mode === "choice" && !physics.isPointerActive && (
            <p className="pointer-events-none absolute bottom-[188px] left-[22%] z-[44] w-[170px] whitespace-nowrap text-center font-serif text-[14px] italic leading-6 text-[#745b45]/88">
              Tap & type your request
            </p>
          )}

          {(mode === "choice" || mode === "typing") && (
            <textarea
              ref={inputRef}
              aria-label="Tap & type your request"
              autoCapitalize="sentences"
              autoComplete="off"
              className={`pointer-events-auto absolute left-[14%] right-[14%] z-[96] resize-none rounded-[6px] border px-4 py-3 text-center font-serif text-[17px] italic leading-6 text-[#2c2824] caret-[#9a681f] outline-none transition-[background,border,bottom,box-shadow,opacity] ${
                mode === "typing" ? "bottom-[146px] min-h-[104px]" : "bottom-[104px] min-h-[84px]"
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
              className={`absolute bottom-[156px] right-[9%] z-[97] grid h-11 w-11 place-items-center rounded-full border border-[#b78a38]/55 bg-[#c5a475]/80 font-serif text-[22px] leading-none text-[#fffaf2] shadow-[0_8px_18px_rgba(70,43,18,0.18)] transition-[opacity,transform] active:scale-95 ${
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
              actionLabel={saveNameMutation.isPending ? "Saving..." : "Continue →"}
              message={heldAgentMessage}
              onRetry={retryPendingOrder}
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
                    onSuccess={retryPendingOrder}
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
              services={confirmedServices}
            />
          )}

          {(mode === "transforming" || mode === "held") && (
            <HeldTransformingState
              debugOpenLaundryVitrine={debugOpenLaundryVitrine}
              displayRequest={confirmedRequest}
              isHeld={mode === "held"}
              onDebugLaundryVitrineOpened={() => setDebugOpenLaundryVitrine(false)}
              penAssetSrc={penAssetSrc}
              residenceLabel={residenceLabel}
              services={confirmedServices}
            />
          )}

          <HeldLabyrinthDrawer
            activePanel={labyrinthPanel}
            isOpen={labyrinthOpen}
            onClose={() => setLabyrinthOpen(false)}
            onOpenChange={setLabyrinthOpen}
            onSelectPanel={(panel) => {
              setLabyrinthOpen(false);
              setLabyrinthPanel(panel);
            }}
            visible={showHomeWorld}
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
        </div>
      </section>
    </main>
  );
}

function HeldLabyrinthDrawer({
  activePanel,
  isOpen,
  onClose,
  onOpenChange,
  onSelectPanel,
  visible,
}: {
  activePanel: LabyrinthPanel;
  isOpen: boolean;
  onClose: () => void;
  onOpenChange: (isOpen: boolean) => void;
  onSelectPanel: (panel: Exclude<LabyrinthPanel, null>) => void;
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

      <motion.div
        animate={
          isOpen
            ? { x: "-50%", y: "-50%", rotateX: 3, scale: 1 }
            : { x: "42%", y: "-50%", rotateX: 0, scale: 0.94 }
        }
        className="absolute left-1/2 top-[46%] z-[122] w-[min(94vw,392px)] max-w-[96%] origin-center touch-none"
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
        </div>
      </motion.div>
    </>
  );
}

function HeldLabyrinthReceiptsLayer({ onClose }: { onClose: () => void }) {
  return (
    <motion.section
      animate={{ opacity: 1, x: 0 }}
      className="absolute inset-0 z-[150] overflow-hidden bg-[#2c2824] text-[#f8efe3]"
      exit={{ opacity: 0, x: 24 }}
      initial={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <Vault initialTab="receipts" onBack={onClose} />
    </motion.section>
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
  actionLabel: string;
  children?: ReactNode;
  message: string;
  onEdit?: () => void;
  onRetry: () => void;
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
        <div className="mt-4 flex min-h-12 items-center justify-between gap-4">
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
          <button
            className="min-h-12 flex-1 text-right font-serif text-[16px] text-[#9a681f] transition-transform active:scale-[0.98]"
            onClick={onRetry}
            type="button"
          >
            {actionLabel}
          </button>
        </div>
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
  label,
  text,
}: {
  delay: number;
  label: string;
  text: string;
}) {
  const [streamed, setStreamed] = useState("");
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let raf: number;
    const timer = setTimeout(() => {
      setVisible(true);
      let startTime = 0;
      const tick = (ts: number) => {
        if (!startTime) startTime = ts;
        const chars = Math.min(Math.floor((ts - startTime) / PLAN_MS_PER_CHAR), text.length);
        setStreamed(text.slice(0, chars));
        if (chars < text.length) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [text, delay]);
  if (!visible) return null;
  return (
    <p className="mt-3 font-serif text-[15.5px] italic leading-[1.32] text-[#2a2520]">
      <span className="not-italic text-[12px] uppercase tracking-[0.18em]">{label}</span>
      {streamed}
    </p>
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

function HeldTransformingState({
  debugOpenLaundryVitrine = false,
  displayRequest,
  isHeld,
  onDebugLaundryVitrineOpened,
  penAssetSrc,
  residenceLabel,
  services,
}: {
  debugOpenLaundryVitrine?: boolean;
  displayRequest: string;
  isHeld: boolean;
  onDebugLaundryVitrineOpened?: () => void;
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
  const [isPhoneEngaged, setIsPhoneEngaged] = useState(false);
  const [phoneDragY, setPhoneDragY] = useState(0);
  const [composerValue, setComposerValue] = useState("");
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [phoneReply, setPhoneReply] = useState("");
  const [phoneReplyStatus, setPhoneReplyStatus] = useState<"idle" | "thinking">("idle");
  const composerInputRef = useRef<HTMLInputElement | null>(null);
  // Ink-to-Clay -> Tokens Settle ceremony (two ceremonial beats):
  //   ink    -> the drawn ink line rests on the paper (mode === transforming)
  //   clay   -> ink thickens then dissolves as clay tokens condense out of it,
  //             materializing at the drawing's position (upper paper)
  //   settle -> the clay tokens travel down and settle into the walnut tray
  const [phase, setPhase] = useState<"ink" | "clay" | "settle">(isHeld ? "settle" : "ink");
  useEffect(() => {
    if (!isHeld) {
      setPhase("ink");
      return;
    }
    // Beat 1: ink becomes clay (next frame so the ink state paints first).
    let raf = window.requestAnimationFrame(() => {
      raf = window.requestAnimationFrame(() => setPhase("clay"));
    });
    // Beat 2: tokens settle into the tray AFTER the clay has fully formed at
    // the drawing (clay scale/fade transition is ~560ms; hold a touch longer
    // so the "it became a thing" beat is legible before it travels down).
    const toSettle = window.setTimeout(() => setPhase("settle"), 780);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(toSettle);
    };
  }, [isHeld]);
  const isInk = phase === "ink";
  const isSettled = phase === "settle";
  const tokens = getTokenAssets(services, displayRequest);
  const drawing = getHeldCompositePath(displayRequest, services);
  // Post-order narration is built entirely from the active request + parsed
  // service metadata — no scripted scenario copy. Every fact comes from real
  // plan state or safe generic fallback language.
  const postOrderCopy = useMemo(
    () =>
      buildPostOrderChiefOfStaffCopy(
        { displayRequest, services: services as PostOrderServiceMeta[] },
        displayRequest,
      ),
    [displayRequest, services],
  );
  const ghostPaths = [drawing.main, ...(drawing.details ?? [])];
  const tokenPositions = TOKEN_POSITIONS[Math.min(tokens.length, 4)] ?? TOKEN_POSITIONS[1];
  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };
  const openToken = (token: HeldTokenAsset) => {
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
    setPhoneReplyStatus("idle");
  };
  const engagePhone = () => {
    window.navigator.vibrate?.(8);
    setIsPhoneEngaged(true);
    setPhoneDragY(0);
  };
  const buildPhoneFallbackReply = (value: string) => {
    const normalized = value.toLowerCase();

    if (/\b(thanks|thank you|appreciate|perfect|great|ok|okay)\b/.test(normalized)) {
      return "Of course. I have it held, and I’ll only come back if something needs your yes.";
    }

    if (/\bnon-?negotiable\b/.test(normalized)) {
      return "Understood. I’ll treat that as your preference and hold to it, even if it means waiting, and keep the rest of the plan moving around it.";
    }

    return "I heard you. I’ll fold that into the current plan and keep the moving pieces held while I work it through.";
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
  const fetchPhoneReply = async (message: string) => {
    const response = await fetch("/api/held/phone-followup", {
      body: JSON.stringify({
        displayRequest,
        message,
        previousMessages: submittedFollowupsRef.current,
        services,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Phone follow-up failed: ${response.status}`);
    }

    const result = (await response.json()) as { reply?: string };
    return result.reply?.trim() || buildPhoneFallbackReply(message);
  };
  const submitFollowup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitFollowupValue(composerInputRef.current?.value);
  };
  const submitFollowupValue = async (valueOverride?: string) => {
    const nextValue = (valueOverride ?? composerValue).trim();
    if (!nextValue || phoneReplyStatus === "thinking") return;

    console.debug("[HELD] local phone follow-up captured", nextValue);
    setComposerValue("");
    setPhoneReply("Held is listening.");
    setPhoneReplyStatus("thinking");

    try {
      const reply = await fetchPhoneReply(nextValue);
      submittedFollowupsRef.current = [...submittedFollowupsRef.current, nextValue];
      setPhoneReply(reply);
    } catch (error) {
      console.error("[HELD] phone follow-up failed", error);
      submittedFollowupsRef.current = [...submittedFollowupsRef.current, nextValue];
      setPhoneReply(buildPhoneFallbackReply(nextValue));
    } finally {
      setPhoneReplyStatus("idle");
    }
  };
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

  return (
    <div
      className={`absolute inset-0 overflow-hidden bg-[#f4ecdf] ${
        selectedToken ? "z-[120]" : "z-[85]"
      }`}
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
      <header className="pointer-events-none absolute left-[8%] right-[8%] top-[5.2%] z-30 flex items-start justify-between text-[#2a2520]">
        <div>
          <p className="text-[14px] uppercase tracking-[0.16em]">HELD.chat</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.28em]">{residenceLabel}</p>
        </div>
        <div
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#b8893c] font-serif text-[17px] leading-none text-[#b8893c]"
        >
          H
        </div>
      </header>

      <section
        className={`absolute left-1/2 top-[18%] z-10 w-[66%] -translate-x-1/2 transition-all duration-700 ${
          isInk ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
        }`}
      >
        <div
          className="relative aspect-[0.78/1] w-full shadow-[0_16px_24px_rgba(50,35,20,0.12)] transition-colors duration-500"
          style={{ backgroundColor: isInk ? "rgba(247,236,217,0.8)" : "rgba(247,236,217,0)" }}
        >
          <svg
            aria-hidden="true"
            className="absolute inset-[7%] h-[86%] w-[86%] overflow-visible"
            preserveAspectRatio="xMidYMid meet"
            viewBox="0 0 430 260"
          >
            {ghostPaths.map((d, index) => (
              <path
                key={index}
                d={d}
                fill="none"
                stroke="#1A1A1A"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  // Ink -> Clay: the line thickens & darkens (gathering into
                  // matter) the instant it is asked to become a token, then
                  // dissolves as the clay condenses out of it.
                  opacity: isInk ? 0.18 : phase === "clay" ? 0.4 : 0,
                  strokeWidth: isInk ? 2 : 4.5,
                  transition:
                    "opacity 420ms ease-out, stroke-width 320ms cubic-bezier(0.34, 1.4, 0.64, 1)",
                }}
              />
            ))}
          </svg>
        </div>
      </section>

      {isSettled && (
        <section
          className={`pointer-events-none absolute left-1/2 top-[12.5%] z-20 flex h-[55%] w-[88%] -translate-x-1/2 flex-col items-center text-center text-[#2a2520] transition-opacity duration-200 ${
            phoneReply ? "opacity-[0.08]" : isPhoneEngaged ? "opacity-[0.76]" : "opacity-100"
          }`}
        >
          <PlanLine
            className="max-w-full font-serif text-[30px] italic leading-[1.22] text-[#2a2520]"
            delay={900}
            text={postOrderCopy.opening}
          />
          <PlanLine
            className="mt-4 max-w-full font-serif text-[16px] italic leading-[1.32] text-[#2a2520]"
            delay={4300}
            text={postOrderCopy.subhead}
          />
          <div className="mt-5 w-full text-left">
            {postOrderCopy.serviceRows.map((row, index) => (
              <PlanServiceRow
                key={`${row.label}-${index}`}
                delay={8500 + index * 4800}
                label={row.label}
                text={` — ${row.body}`}
              />
            ))}
          </div>
          <PlanLine
            className="mt-4 max-w-full font-serif text-[16px] italic leading-[1.32] text-[#a06a2b]"
            delay={8500 + postOrderCopy.serviceRows.length * 4800 + 1200}
            text={postOrderCopy.closing}
          />
        </section>
      )}

      {isSettled && phoneReply && (
        <section className="pointer-events-none absolute left-1/2 top-[31%] z-[65] w-[82%] -translate-x-1/2 text-center">
          <PlanLine
            className="font-serif text-[16.5px] italic leading-[1.32] text-[#2a2520]"
            delay={120}
            msPerChar={20}
            text={phoneReply}
          />
        </section>
      )}

      {isSettled && (
        <form
          className={`absolute bottom-[27.2%] left-1/2 z-[90] w-[84%] -translate-x-1/2 transition-all duration-200 ${
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
              if (phoneReply) setPhoneReply("");
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

      {isSettled && (
        <div
          aria-hidden="true"
          className="absolute bottom-[24.5%] left-1/2 z-20 h-px w-[85%] -translate-x-1/2 bg-[#b8893c]"
        />
      )}

      <img
        alt=""
        className={`pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 select-none transition-all duration-700 ${
          isSettled
            ? "bottom-[0.5%] w-[58%] opacity-100 drop-shadow-[0_16px_16px_rgba(45,29,16,0.32)]"
            : "bottom-[-6%] w-[108%] opacity-80 drop-shadow-[0_22px_30px_rgba(45,29,16,0.26)]"
        }`}
        data-held-home-cradle="true"
        draggable={false}
        src={HELD_ASSETS.trayHeldBox}
      />
      {isSettled && (
        <>
          <div
            aria-hidden="true"
            className="absolute bottom-[6.5%] left-1/2 z-30 -translate-x-1/2 font-serif text-[16px] font-semibold leading-none text-[#b8893c] drop-shadow-[0_1px_0_rgba(255,244,220,0.35)]"
          >
            H
          </div>
          <img
            alt=""
            className="pointer-events-none absolute bottom-[5.7%] left-1/2 z-40 w-[112px] -translate-x-1/2 rotate-90 select-none drop-shadow-[0_5px_7px_rgba(31,21,13,0.28)]"
            draggable={false}
            src={penAssetSrc}
          />
        </>
      )}
      {isSettled && (
        <>
          <img
            alt=""
            aria-hidden="true"
            className={`pointer-events-none absolute bottom-[1.1%] right-[10px] z-[124] h-[clamp(176px,23dvh,202px)] w-auto max-w-none select-none drop-shadow-[0_9px_10px_rgba(38,24,13,0.20)] transition-all duration-300 ease-out ${
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
            className={`absolute bottom-[0.8%] right-[14px] z-[130] h-[clamp(188px,24dvh,208px)] w-[118px] touch-none border-0 bg-transparent p-0 outline-none transition-[filter,transform] duration-300 ease-out focus-visible:ring-2 focus-visible:ring-[#b8893c]/60 ${
              isPhoneEngaged ? "drop-shadow-[0_12px_14px_rgba(44,28,14,0.24)]" : "drop-shadow-[0_8px_10px_rgba(44,28,14,0.18)]"
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
      {/* Token tray is anchored at its settled (walnut-tray) position. The
          clay condenses ~330px higher (at the drawing) during the clay beat,
          then each token glides DOWN into the tray during the settle beat.
          Using transform translateY (not top/bottom:auto) keeps it gliding
          — no teleport. */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 ${
          isSettled ? "bottom-[3.8%] z-[115] h-[13%] w-[43%]" : "bottom-[35%] z-20 h-[32%] w-[88%]"
        }`}
      >
        {tokens.map((token, index) => (
          <button
            aria-label={token.type === "laundry_pickup" ? "Open Laundry Butler service details" : "Open service details"}
            className={`absolute object-contain drop-shadow-[0_12px_16px_rgba(42,28,16,0.2)] ${
              isSettled ? "h-[44px] w-[44px]" : "h-[80px] w-[80px]"
            }`}
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
              // Clay beat: token condenses out of the ink right where it was
              //   drawn (lifted ~112px to the drawing center, small -> full,
              //   fades in, no spin — it is forming, not flying).
              // Settle beat: token glides DOWN into the walnut tray (offset->0).
              transform: `translate(-50%, calc(-50% + ${
                isSettled ? 0 : -112
              }px)) scale(${isInk ? 0.6 : 1})`,
              opacity: isInk ? 0 : 1,
              transition:
                "transform 560ms cubic-bezier(0.22, 1, 0.36, 1), opacity 420ms ease-out",
              transitionDelay: `${index * 90}ms`,
              willChange: "transform, opacity",
            }}
            type="button"
          >
            <img
              alt=""
              className="h-full w-full object-contain"
              draggable={false}
              src={token.src}
            />
          </button>
        ))}
      </div>
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
  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="absolute inset-0 z-[140] overflow-hidden bg-[#f4ecdf] text-[#2d251d]"
      exit={{ opacity: 0, y: 18 }}
      initial={{ opacity: 0, y: 18 }}
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
      <button
        aria-label="Close service vitrine"
        className="absolute right-[7%] top-[7%] z-20 grid h-10 w-10 place-items-center rounded-full border border-[#b78a35]/70 bg-[#fff8ec]/74 font-serif text-[22px] text-[#9b6f23] shadow-[0_8px_18px_rgba(68,45,20,0.12)]"
        onClick={onClose}
        type="button"
      >
        H
      </button>
      <div className="relative z-10 flex h-full flex-col px-[8%] pb-8 pt-[8%]">
        <p className="text-[15px] tracking-[0.08em]">HELD.chat</p>
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

function LaundryServiceDetail({ onClose }: { onClose: () => void }) {
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
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-[140] overflow-hidden bg-[#f4ede0] text-[#2a2520]"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(255,252,246,0.72), rgba(244,237,224,0.94)), url(/held/held-paper-bg.png)",
          backgroundPosition: "center",
          backgroundSize: "cover, 420px 420px",
        }}
      />
      <button
        aria-label="Return to held home"
        className="absolute right-[7%] top-[6.4%] z-20 grid h-10 w-10 place-items-center rounded-full border border-[#b8893c]/80 bg-[#fff8ec]/62 font-serif text-[22px] text-[#9b6f23] shadow-[0_8px_18px_rgba(68,45,20,0.12)]"
        onClick={onClose}
        type="button"
      >
        H
      </button>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="absolute inset-x-[7.5%] bottom-0 top-[3.5%] z-20 overflow-y-auto pb-[178px] pr-1"
        exit={{ opacity: 0, y: 28 }}
        initial={{ opacity: 0, y: 18 }}
        transition={{ delay: 0.05, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <header>
          <p className="text-[14px] tracking-[0.08em]">HELD.chat</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-[#6f6254]">
            Residence 1807 · 12A
          </p>
        </header>

        <section className="mt-3 grid grid-cols-[34%_1fr] items-center gap-5">
          <div className="relative mx-auto h-[126px] w-[104px] overflow-hidden rounded-[52%] border border-[#b8893c]/85 bg-[#eadcc4] p-[3px] shadow-[0_12px_24px_rgba(77,48,19,0.15)]">
            <img
              alt="Laundry Butler provider"
              className="h-full w-full rounded-[52%] object-cover object-center saturate-[0.9] sepia-[0.08]"
              draggable={false}
              src={HELD_ASSETS.laundryProvider}
              style={{
                objectPosition: "34% 34%",
                transform: "scale(1.34)",
              }}
            />
            <span className="pointer-events-none absolute inset-[7px] rounded-[52%] border border-[#fff7e9]/65" />
          </div>
          <div className="pb-2">
            <h1 className="font-serif text-[33px] italic leading-[0.95] text-[#2a2520]">
              Laundry Butler
            </h1>
            <p className="mt-2 font-serif text-[18px] italic leading-5 text-[#3b3128]">
              Pickup &amp; delivery
            </p>
            <p className="mt-1 font-serif text-[18px] italic leading-5 text-[#a06a2b]">
              In motion
            </p>
            <p className="mt-1 font-serif text-[15px] leading-5">
              Adam · Your driver
            </p>
          </div>
        </section>

        <p className="border-b border-[#b8893c]/32 pb-2 text-center font-serif text-[12px] leading-5">
          Trusted vendor · 4 services completed at your residence
        </p>

        <section className="mt-4 border-b border-[#b8893c]/28 pb-3">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#5f5145]">
            Current status
          </p>
          <h2 className="mt-1 font-serif text-[33px] italic leading-[1.04] text-[#201b17]">
            Driver is en route to pickup
          </h2>
        </section>

        <section className="mt-2 border-b border-[#b8893c]/28">
          <StatusDetailRow label="Pickup window" value="Today · 4:00–5:00 PM" />
          <StatusDetailRow label="Driver ETA" value="18 minutes" />
          <StatusDetailRow label="Residence" value="1807 · 12A" />
          <StatusDetailRow label="Estimated return" value="Tomorrow · 6:00 PM" />
          <StatusDetailRow label="Estimated total" value="$44.00" />
          <StatusDetailRow label="Order number" value="L-30218" />
        </section>

        <section className="mt-2">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#5f5145]">
            Service includes
          </p>
          <p className="mt-1 font-serif text-[17px] italic leading-6">
            Pickup · Wash &amp; fold · Dry clean on request · Return delivery
          </p>
          <div className="mt-1 flex justify-center gap-4 font-serif text-[17px] italic text-[#a06a2b]">
            <button type="button">Call driver</button>
            <span>·</span>
            <button type="button">Text driver</button>
          </div>
        </section>

        <section className="mt-3 border-t border-[#b8893c]/28 pt-2">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#5f5145]">
            Journey
          </p>
          <VitrineJourneyList />
        </section>

        <footer className="mt-4 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[#8d6322] bg-[#b8893c]/25 font-serif text-[28px] text-[#8d6322] shadow-[inset_0_2px_3px_rgba(255,255,255,0.45),0_8px_14px_rgba(76,45,16,0.18)]">
            H
          </div>
          <p className="mt-2 font-serif text-[18px] italic">
            Everything kept on file.
          </p>
        </footer>
      </motion.div>
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
  return (
    <div className="grid grid-cols-[42%_1fr] items-baseline border-t border-[#b8893c]/22 py-1.5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#5f5145]">
        {label}:
      </p>
      <p className="font-serif text-[18px] italic leading-5 text-[#2a2520]">
        {value}
      </p>
    </div>
  );
}

function VitrineJourneyList() {
  const steps = [
    { label: "Requested", meta: "Mon 9:14 AM ✓", state: "done" },
    { label: "Scheduled", meta: "Mon 9:18 AM ✓", state: "done" },
    { label: "Confirmed", meta: "Mon 9:22 AM ✓", state: "done" },
    { label: "En route", meta: "now", state: "current" },
    { label: "In progress", meta: "pending", state: "future" },
    { label: "Complete", meta: "pending", state: "future" },
  ] as const;

  return (
    <ol className="mt-2 space-y-1.5">
      {steps.map((step, index) => (
        <li
          className={`grid grid-cols-[28px_1fr] items-baseline gap-3 ${
            step.state === "future" ? "opacity-45" : ""
          }`}
          key={step.label}
        >
          <span className="relative flex justify-center">
            {index < steps.length - 1 && (
              <span className="absolute left-1/2 top-[15px] h-[20px] w-px -translate-x-1/2 bg-[#b8893c]/45" />
            )}
            <span
              className={`relative z-10 mt-1 h-3.5 w-3.5 rounded-full border ${
                step.state === "current"
                  ? "border-[#b8893c] bg-[#f4ede0]"
                  : step.state === "done"
                    ? "border-[#b8893c] bg-[#b8893c]"
                    : "border-[#8f8377] bg-[#f4ede0]"
              }`}
            />
          </span>
          <p className="font-serif text-[15px] leading-5">
            <span
              className={`uppercase tracking-[0.14em] ${
                step.state === "current" ? "text-[#2a2520]" : "text-[#3b3128]"
              }`}
            >
              {step.label}
            </span>
            <span className="mx-2 text-[#8c7a69]">—</span>
            <span
              className={`italic ${
                step.state === "current" ? "text-[#a06a2b]" : "text-[#3b3128]"
              }`}
            >
              {step.meta}
            </span>
          </p>
        </li>
      ))}
    </ol>
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
  const serviceTypes = services.map(service => service.type).join(" ");
  const haystack = `${serviceTypes} ${request}`.toLowerCase();
  const assets: HeldTokenAsset[] = [];

  if (/laundry/.test(haystack)) assets.push({ src: HELD_ASSETS.tokenLaundry, type: "laundry_pickup" });
  if (/dog|groom/.test(haystack)) assets.push({ src: HELD_ASSETS.tokenDogGroom, type: "dog_grooming" });
  if (/car|detail|wash/.test(haystack)) assets.push({ src: HELD_ASSETS.tokenCarDetail, type: "car_detail" });
  if (/airport|ride|uber|waymo|lax/.test(haystack)) assets.push({ src: HELD_ASSETS.tokenRide, type: "ride_airport" });
  if (/haircut|hair cut|barber|blowout/.test(haystack)) assets.push({ src: HELD_ASSETS.tokenHaircut, type: "haircut" });

  return assets.length ? assets : [{ src: HELD_ASSETS.tokenLaundry, type: "laundry_pickup" }];
}

function getServiceLabel(type: string) {
  if (type === "laundry_pickup") return "Laundry pickup";
  if (type === "dog_grooming") return "Dog grooming";
  if (type === "car_detail") return "Car detail";
  if (type === "ride_airport") return "Airport pickup";
  if (type === "haircut") return "Haircut";
  return "Service";
}

function inferServicesFromRequest(request: string): HeldParsedService[] {
  const lower = request.toLowerCase();
  const services: HeldParsedService[] = [];

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
