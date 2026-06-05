import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { PaymentMethodForm } from "@/components/PaymentMethodForm";
import { isResidentAppTestMode } from "@/lib/residentTestMode";
import { trpc } from "@/lib/trpc";
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
  composer: "/held/nursery-composer.png",
  crest: "/held/crest-h-flat.png",
  galleryBench: "/held/nursery-cradle.png",
  laundryProvider: "/held/laundry-butler-provider.png",
  microphone: "/held/microphone.png",
  paper: "/held/held-paper-bg.png",
  postTokenField: "/held/textfield-posttoken.png",
  requestCard: "/held/your-request-card.png",
  tokenCarDetail: "/held/token-cardetail.png",
  tokenDogGroom: "/held/token-doggroom.png",
  tokenLaundry: "/held/token-laundry.png",
  tokenRide: "/held/token-uber_waymo.png",
  trayEmptyHeld: "/held/nursery-heldscreen.png",
  trayHeldBox: "/held/nursery-heldbox.png",
  trayHeldFlat: "/held/nursery-heldtray.png",
  trayAudio: "/held/nursery-audiotray.png",
  trayClayTokens: "/held/nursery-tray-claytokens.png",
  tray: "/held/nursery-heldscreen.png",
};

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
  const [internalComposerOpen, setInternalComposerOpen] = useState(false);
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
  const showPenGesture = (showHomeWorld && mode !== "speech") || mode === "held";
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
      ? // Voice-capture: the tray sits high (top-[27%]), so the mic hangs in open
        // air ABOVE it (matches the vision board) instead of dropping into it.
        "translate-y-[150px] opacity-100 scale-100"
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
    setHeldAgentMessage("");
    setHeldAgentStatus("idle");
    setLastOrderId(null);
    setPendingOrderRequest("");
    setPendingOrderServices([]);
    setTypedCommandStatus("idle");
    setMode("rest");
    physics.reset();
  };

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
                className={mode === "held" ? "z-[88]" : "z-30"}
                glintStrokeWidth={2.1}
                highlightStroke="rgba(255, 234, 178, 0.58)"
                highlightStrokeWidth={0.8}
                mainStroke="rgba(154, 107, 31, 0.78)"
                mainStrokeWidth={2}
              />
              <PenCharm
                {...physics.penRefs}
                {...physics.pointerHandlers}
                className={mode === "held" ? "z-[92]" : "z-[80]"}
                objectFit="contain"
                penAssetSrc={penAssetSrc}
                transformOrigin="50% 3%"
              />
            </>
          )}

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
              src={HELD_ASSETS.composer}
            />
          </div>

          {mode === "choice" && (
            <p className="pointer-events-none absolute bottom-[292px] left-[13%] right-[22%] z-[42] text-center font-serif text-[15px] italic leading-5 text-[#2f2923]/80">
              Type or speak what's on your mind.
            </p>
          )}

          {(mode === "choice" || mode === "typing") && (
            <textarea
              ref={inputRef}
              aria-label="Type your request"
              autoCapitalize="sentences"
              autoComplete="off"
              className={`pointer-events-auto absolute bottom-[146px] left-[14%] right-[14%] z-[96] min-h-[104px] resize-none rounded-[6px] border px-4 py-3 text-center font-serif text-[17px] italic leading-6 text-[#2c2824] caret-[#9a681f] outline-none transition-[background,border,box-shadow,opacity] ${
                mode === "typing"
                  ? "border-[#cdb792]/55 bg-[#fbf4e6]/55 opacity-100 shadow-[0_4px_14px_rgba(50,35,20,0.08)] placeholder:text-[#8a7a68]/50 focus:border-[#b78a38]/55 focus:bg-[#fdf8ee]/70"
                  : "border-[#cdb792]/35 bg-[#fbf4e6]/35 opacity-100 shadow-none placeholder:text-[#7b6c5d]/55 focus:border-[#b78a38]/55 focus:bg-[#fdf8ee]/55"
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
              placeholder="Type your request..."
              enterKeyHint="send"
              rows={4}
              value={draft}
            />
          )}

          {(mode === "choice" || mode === "typing") && (
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
              displayRequest={confirmedRequest}
              isHeld={mode === "held"}
              services={confirmedServices}
            />
          )}
        </div>
      </section>
    </main>
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

function HeldTransformingState({
  displayRequest,
  isHeld,
  services,
}: {
  displayRequest: string;
  isHeld: boolean;
  services: HeldParsedService[];
}) {
  const longPressTimerRef = useRef<number | null>(null);
  const longPressOpenedRef = useRef(false);
  const [selectedToken, setSelectedToken] = useState<HeldTokenAsset | null>(null);
  const [showProvider, setShowProvider] = useState(false);
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
  const ghostPaths = [drawing.main, ...(drawing.details ?? [])];
  const tokenPositions = TOKEN_POSITIONS[Math.min(tokens.length, 4)] ?? TOKEN_POSITIONS[1];
  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };
  const startTokenPress = (token: HeldTokenAsset) => {
    clearLongPress();
    longPressOpenedRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      longPressOpenedRef.current = true;
      setSelectedToken(token);
      setShowProvider(token.type === "laundry_pickup");
      longPressTimerRef.current = null;
    }, 420);
  };

  useEffect(() => clearLongPress, []);

  return (
    <div className="absolute inset-0 z-[85] overflow-hidden bg-[#f4ecdf]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(255,252,246,0.78), rgba(244,235,222,0.9)), url(/held/held-paper-bg.png)",
          backgroundPosition: "center",
          backgroundSize: "cover, 420px 420px",
        }}
      />
      <header className="pointer-events-none absolute left-[8%] top-[8%] z-10">
        <p className="text-[15px] tracking-[0.08em] text-[#2d251d]">HELD.chat</p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.32em] text-[#7a6d5f]">
          {isHeld ? "Held." : "Taking custody."}
        </p>
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

      <section
        className={`pointer-events-none absolute left-[9%] top-[13%] z-20 transition-all duration-700 ${
          isHeld ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <h1 className="font-serif text-[42px] leading-none text-[#2d251d]">
          Held.
        </h1>
        <p className="mt-2 max-w-[170px] text-[13px] italic leading-5 text-[#55493d]">
          {tokens.length === 1 ? "One thing is in motion." : `${tokens.length} things are in motion.`}
        </p>
      </section>

      <img
        alt=""
        className={`pointer-events-none absolute left-1/2 z-10 w-[108%] -translate-x-1/2 select-none drop-shadow-[0_22px_30px_rgba(45,29,16,0.26)] transition-all duration-700 ${
          isSettled ? "bottom-[26%] opacity-100" : "bottom-[-6%] opacity-80"
        }`}
        draggable={false}
        src={HELD_ASSETS.trayHeldBox}
      />
      {/* Token tray is anchored at its settled (walnut-tray) position. The
          clay condenses ~330px higher (at the drawing) during the clay beat,
          then each token glides DOWN into the tray during the settle beat.
          Using transform translateY (not top/bottom:auto) keeps it gliding
          — no teleport. */}
      <div className="absolute bottom-[35%] left-1/2 z-20 h-[32%] w-[88%] -translate-x-1/2">
        {tokens.map((token, index) => (
          <button
            aria-label={token.type === "laundry_pickup" ? "Open Laundry Butler service details" : "Open service details"}
            className="absolute h-[80px] w-[80px] object-contain drop-shadow-[0_12px_16px_rgba(42,28,16,0.2)]"
            key={`${token.src}-${index}`}
            onClick={event => {
              if (longPressOpenedRef.current) {
                event.preventDefault();
                longPressOpenedRef.current = false;
                return;
              }

              setSelectedToken(token);
              setShowProvider(false);
            }}
            onPointerCancel={clearLongPress}
            onPointerDown={() => startTokenPress(token)}
            onPointerLeave={clearLongPress}
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
      <div
        className={`absolute bottom-[3%] left-1/2 z-30 w-[84%] -translate-x-1/2 transition-all duration-700 ${
          isHeld ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <img
          alt=""
          className="pointer-events-none w-full select-none drop-shadow-[0_10px_18px_rgba(54,38,23,0.10)]"
          draggable={false}
          src={HELD_ASSETS.postTokenField}
        />
        <div className="pointer-events-none absolute inset-x-[18%] top-[32%] text-center">
          <p className="font-serif text-[13px] italic leading-4 text-[#4f4439]">
            {tokens.length === 1
              ? `${getServiceLabel(tokens[0].type)} is in motion.`
              : `${tokens.length} things are in motion.`}
          </p>
          <p className="mt-1 font-serif text-[11px] italic leading-4 text-[#7a6d5f]">
            Pull the pen for what&apos;s next.
          </p>
        </div>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-[8.5%] top-[23%] h-[52%] w-[15%] rounded-r-[18px] bg-[#f8eddd]"
        />
      </div>
      {selectedToken && !showProvider && (
        <HeldServiceVitrine
          displayRequest={displayRequest}
          onClose={() => setSelectedToken(null)}
          onViewProvider={() => setShowProvider(true)}
          token={selectedToken}
        />
      )}
      {selectedToken?.type === "laundry_pickup" && showProvider && (
        <LaundryServiceDetail onClose={() => setShowProvider(false)} />
      )}
    </div>
  );
}

function HeldServiceVitrine({
  displayRequest,
  onClose,
  onViewProvider,
  token,
}: {
  displayRequest: string;
  onClose: () => void;
  onViewProvider: () => void;
  token: HeldTokenAsset;
}) {
  const isLaundry = token.type === "laundry_pickup";

  return (
    <section className="absolute inset-0 z-[90] overflow-hidden bg-[#f4ecdf] text-[#2d251d]">
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
          {isLaundry && (
            <button
              className="underline decoration-[#b78a38]/35 underline-offset-4"
              onClick={onViewProvider}
              type="button"
            >
              View provider
            </button>
          )}
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
    </section>
  );
}

function LaundryServiceDetail({ onClose }: { onClose: () => void }) {
  return (
    <section className="absolute inset-0 z-[90] overflow-hidden bg-[#f4ecdf] text-[#2d251d]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(255,252,246,0.82), rgba(244,235,222,0.92)), url(/held/held-paper-bg.png)",
          backgroundPosition: "center",
          backgroundSize: "cover, 420px 420px",
        }}
      />
      <button
        aria-label="Close service details"
        className="absolute right-[7%] top-[7%] z-20 grid h-10 w-10 place-items-center rounded-full border border-[#b78a35]/70 bg-[#fff8ec]/70 font-serif text-[22px] text-[#9b6f23] shadow-[0_8px_18px_rgba(68,45,20,0.12)]"
        onClick={onClose}
        type="button"
      >
        H
      </button>
      <div className="relative z-10 flex h-full flex-col px-[8%] pb-8 pt-[8%]">
        <p className="text-center font-serif text-[28px] tracking-[0.04em]">
          HELD.chat
        </p>
        <h1 className="mt-5 text-center font-serif text-[48px] italic leading-none">
          Laundry Butler
        </h1>
        <div className="mt-7 flex items-center gap-5">
          <img
            alt="Laundry Butler provider holding review certificates"
            className="h-[132px] w-[132px] rounded-full border border-[#b78a35] object-cover shadow-[0_16px_28px_rgba(45,29,16,0.18)]"
            draggable={false}
            src={HELD_ASSETS.laundryProvider}
          />
          <div className="min-w-0 flex-1">
            <p className="font-serif text-[23px] leading-7">
              Alex from Laundry Butler
            </p>
            <p className="mt-2 text-[28px] tracking-[0.08em] text-[#b1802b]">
              ★★★★★ <span className="font-serif text-[22px] tracking-normal text-[#2d251d]">5.0</span>
            </p>
            <p className="mt-1 font-serif text-[16px] text-[#6a5b4c]">
              214 resident reviews
            </p>
          </div>
        </div>
        <div className="mt-7 rounded-[4px] border border-[#d3c3a9] bg-[#fff8ec]/62 px-5 py-4 shadow-[0_14px_26px_rgba(50,35,20,0.10)]">
          <p className="text-center font-serif text-[18px] italic leading-6">
            Pickup, wash, fold, and return handled by a resident-vouched provider.
          </p>
        </div>
        <div className="mt-6">
          <p className="text-center text-[11px] uppercase tracking-[0.32em] text-[#8b7a67]">
            Service includes
          </p>
          <p className="mt-3 text-center font-serif text-[19px] leading-7">
            Laundry pickup · Wash & fold · Return scheduling
          </p>
        </div>
        <div className="mt-auto">
          <img
            alt=""
            className="mx-auto w-[92%] drop-shadow-[0_18px_28px_rgba(45,29,16,0.20)]"
            draggable={false}
            src={HELD_ASSETS.trayClayTokens}
          />
        </div>
      </div>
    </section>
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

  return assets.length ? assets : [{ src: HELD_ASSETS.tokenLaundry, type: "laundry_pickup" }];
}

function getServiceLabel(type: string) {
  if (type === "laundry_pickup") return "Laundry pickup";
  if (type === "dog_grooming") return "Theo's grooming";
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
