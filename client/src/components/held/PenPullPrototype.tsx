import { useEffect, useMemo, useRef, useState } from "react";
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
  trayClayTokens: "/held/nursery-tray-claytokens.png",
  tray: "/held/nursery-heldscreen.png",
};

type PrototypeMode =
  | "rest"
  | "choice"
  | "speech"
  | "typing"
  | "requestReady"
  | "takingCustody"
  | "drawing"
  | "transforming"
  | "held";
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

const TOKEN_POSITIONS: Record<number, Array<{ left: number; top: number }>> = {
  1: [{ left: 50, top: 50 }],
  2: [
    { left: 42, top: 52 },
    { left: 60, top: 50 },
  ],
  3: [
    { left: 36, top: 54 },
    { left: 50, top: 48 },
    { left: 64, top: 54 },
  ],
  4: [
    { left: 32, top: 55 },
    { left: 45, top: 49 },
    { left: 58, top: 50 },
    { left: 70, top: 56 },
  ],
};

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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [debug, setDebug] = useState(defaultDebug);
  const [draft, setDraft] = useState("");
  const [internalComposerOpen, setInternalComposerOpen] = useState(false);
  const [mode, setMode] = useState<PrototypeMode>("rest");
  const [confirmedRequest, setConfirmedRequest] = useState("");
  const [confirmedServices, setConfirmedServices] = useState<HeldParsedService[]>([]);
  const [speechTranscript, setSpeechTranscript] = useState("");
  const [typedCommandStatus, setTypedCommandStatus] = useState<
    "idle" | "summarizing" | "ready" | "error"
  >("idle");
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
    mode === "takingCustody";
  const showPenGesture = (showHomeWorld && mode !== "speech") || mode === "held";
  const canReturnToHeld =
    Boolean(confirmedRequest) &&
    (mode === "choice" || mode === "speech" || mode === "typing" || mode === "requestReady");
  const microphoneClassName =
    mode === "choice" || mode === "speech"
      ? "translate-y-[300px] opacity-100 scale-100"
      : mode === "typing"
        ? "-translate-y-[120px] opacity-0 scale-90"
        : "-translate-y-[120px] opacity-0 scale-90";
  const enterSpeechMode = () => {
    setMode("speech");

    if (controlledComposerOpen === undefined) {
      setInternalComposerOpen(false);
    }
  };
  const enterTypingMode = () => {
    if (!draft && speechTranscript) {
      setDraft(speechTranscript);
    }

    setMode("typing");

    if (controlledComposerOpen === undefined) {
      setInternalComposerOpen(true);
    }

    inputRef.current?.focus({ preventScroll: true });
    window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
  };
  const submitTypedCommand = async () => {
    const text = draft.trim();
    if (!text || typedCommandStatus === "summarizing") {
      return;
    }

    setTypedCommandStatus("summarizing");
    setConfirmedRequest(text);
    setMode("requestReady");

    try {
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

      const result = (await response.json()) as HeldTextCommandResponse;
      const displayRequest = result.displayRequest?.trim() || result.rawTranscript || text;
      setDraft(displayRequest);
      setSpeechTranscript(displayRequest);
      setConfirmedRequest(displayRequest);
      setConfirmedServices(result.parsedIntent?.services ?? []);
      setTypedCommandStatus("ready");
      setMode("requestReady");
    } catch (error) {
      console.error("[PenPullPrototype] typed command failed", error);
      const displayRequest = buildTypedCommandFallback(text);
      setDraft(displayRequest);
      setSpeechTranscript(displayRequest);
      setConfirmedRequest(displayRequest);
      setConfirmedServices(inferServicesFromRequest(displayRequest));
      setTypedCommandStatus("ready");
      setMode("requestReady");
    }
  };
  const beginSetInMotion = (request = confirmedRequest, services = confirmedServices) => {
    const nextRequest = request.trim() || draft.trim() || speechTranscript.trim();
    if (!nextRequest) return;

    console.debug("[HELD] Set it in motion confirmed");
    setConfirmedRequest(nextRequest);
    setConfirmedServices(services.length ? services : inferServicesFromRequest(nextRequest));
    setTypedCommandStatus("idle");
    if (controlledComposerOpen === undefined) {
      setInternalComposerOpen(false);
    }
    setMode("takingCustody");
    window.setTimeout(() => {
      setMode("drawing");
    }, 500);
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

  const reset = () => {
    if (controlledComposerOpen === undefined) {
      setInternalComposerOpen(false);
    }
    setDraft("");
    setSpeechTranscript("");
    setConfirmedRequest("");
    setConfirmedServices([]);
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
              {mode === "takingCustody" ? "Taking custody." : "Nothing is in motion yet."}
            </p>
          </section>}

          {showHomeWorld && (
            <img
              alt=""
              className={`pointer-events-none absolute bottom-[-1px] left-1/2 z-10 w-[95%] -translate-x-1/2 select-none drop-shadow-[0_18px_24px_rgba(45,29,16,0.20)] transition-opacity duration-[420ms] ${
                composerTrayVisible || mode === "speech" || mode === "takingCustody" ? "opacity-0" : "opacity-100"
              }`}
              draggable={false}
              src={HELD_ASSETS.tray}
            />
          )}

          <div
            aria-hidden="true"
            className={`pointer-events-none absolute bottom-[72px] left-[9%] right-[9%] z-20 h-px bg-[#b78a38] transition-opacity duration-200 ${
              composerTrayVisible || mode === "speech" || mode === "takingCustody" ? "opacity-0" : "opacity-25"
            }`}
          />

          <HeldVoiceCaptureTray
            active={mode === "speech"}
            onConfirmRequest={(request, services) => beginSetInMotion(request, services)}
            onEditRequest={enterTypingMode}
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
            className={`pointer-events-none absolute bottom-[-6px] left-1/2 z-30 w-[108%] transition-[opacity,transform] duration-[520ms] ${
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

          {mode === "typing" && (
            <input
              ref={inputRef}
              aria-label="Type your request"
              className="absolute bottom-[214px] left-[11%] right-[31%] z-50 h-12 rounded-[6px] border border-[#d5c2a4]/70 bg-[#fff8ec]/78 px-4 font-serif text-[16px] italic text-[#2c2824] shadow-[0_8px_18px_rgba(50,35,20,0.10)] outline-none placeholder:text-transparent"
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
                if (event.key === "Enter") {
                  event.preventDefault();
                  void submitTypedCommand();
                }
              }}
              placeholder=""
              type="text"
              value={draft}
            />
          )}

          {mode === "typing" && (
            <button
              aria-label="Set it in motion"
              className="absolute bottom-[214px] right-[8%] z-[60] h-10 w-10 rounded-full opacity-0"
              onClick={() => void submitTypedCommand()}
              type="button"
            />
          )}

          {mode === "choice" && (
            <button
              aria-label="Start typing"
              className="absolute bottom-[108px] left-[10%] right-[38%] z-[45] h-[190px] rounded-[18px] opacity-0"
              onClick={enterTypingMode}
              type="button"
            />
          )}

          {showRequestReady && (
            <HeldRequestReadyCard
              displayRequest={confirmedRequest || draft}
              isWorking={typedCommandStatus === "summarizing"}
              onConfirm={() => beginSetInMotion()}
              onEdit={enterTypingMode}
            />
          )}

          {mode === "takingCustody" && (
            <HeldRequestReadyCard
              displayRequest={confirmedRequest || draft}
              isStamped
              onConfirm={() => undefined}
              onEdit={enterTypingMode}
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

function HeldRequestReadyCard({
  displayRequest,
  isStamped = false,
  isWorking = false,
  onConfirm,
  onEdit,
}: {
  displayRequest: string;
  isStamped?: boolean;
  isWorking?: boolean;
  onConfirm: () => void;
  onEdit: () => void;
}) {
  return (
    <section className="absolute left-1/2 top-[56%] z-[70] w-[84%] -translate-x-1/2">
      <div className="relative overflow-hidden rounded-[4px] border border-[#d4c2a5]/80 bg-[#fff8ec]/86 px-5 py-5 shadow-[0_16px_26px_rgba(50,35,20,0.14)] backdrop-blur-[2px]">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#7a6d5f]">
          Your request
        </p>
        <p className="mt-3 min-h-[54px] font-serif text-[17px] italic leading-6 text-[#2f2923]">
          {isWorking ? "Making sense of it." : displayRequest || "Making sense of it."}
        </p>
        {isStamped && (
          <span className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full border border-[#a77724] bg-[#b78632]/10 font-serif text-[19px] text-[#9a681f]">
            H
          </span>
        )}
        <div className="mt-4 flex items-center justify-between gap-4">
          <button
            className="text-left font-serif text-[13px] italic text-[#7a6d5f] underline decoration-[#b78a38]/30 underline-offset-4"
            disabled={isStamped}
            onClick={onEdit}
            type="button"
          >
            Edit request
          </button>
          <button
            aria-label="Set it in motion"
            className="min-h-11 flex-1 touch-manipulation text-right font-serif text-[16px] text-[#9a681f] transition-transform duration-150 active:scale-[0.98] disabled:opacity-60"
            disabled={isWorking || isStamped}
            onClick={onConfirm}
            type="button"
          >
            {isStamped ? "Taking custody." : "Set it in motion →"}
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
  const tokens = getTokenAssets(services, displayRequest);
  const path = getHeldCompositePath(displayRequest, services);
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
          isHeld ? "-translate-y-6 opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        <div className="relative aspect-[0.78/1] w-full bg-[#f7ecd9]/80 shadow-[0_16px_24px_rgba(50,35,20,0.12)]">
          <svg
            aria-hidden="true"
            className={`absolute inset-[7%] h-[86%] w-[86%] overflow-visible transition-all duration-[1000ms] ${
              isHeld ? "-translate-y-10 opacity-0" : "translate-y-0 opacity-100"
            }`}
            preserveAspectRatio="xMidYMid meet"
            viewBox="0 0 430 260"
          >
            <path
              d={path}
              fill="none"
              opacity="0.18"
              stroke="#1A1A1A"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
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
        className={`pointer-events-none absolute left-1/2 z-10 w-[96%] -translate-x-1/2 select-none drop-shadow-[0_18px_24px_rgba(45,29,16,0.22)] transition-all duration-700 ${
          isHeld ? "bottom-[34%] opacity-100" : "bottom-[-2%] opacity-80"
        }`}
        draggable={false}
        src={HELD_ASSETS.trayEmptyHeld}
      />
      <div
        className={`absolute left-1/2 z-20 h-[30%] w-[82%] -translate-x-1/2 transition-all duration-700 ${
          isHeld ? "bottom-[39%]" : "bottom-[15%]"
        }`}
      >
        {tokens.map((token, index) => (
          <button
            aria-label={token.type === "laundry_pickup" ? "Open Laundry Butler service details" : "Open service details"}
            className={`absolute h-[62px] w-[62px] -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_12px_16px_rgba(42,28,16,0.2)] transition-all duration-[900ms] ${
              isHeld ? "scale-100 rotate-0 opacity-100" : "translate-y-[-150px] scale-75 rotate-[-12deg] opacity-0"
            }`}
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
              transitionDelay: `${index * 90}ms`,
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
          className="pointer-events-none mt-auto w-full select-none opacity-95 mix-blend-multiply drop-shadow-[0_18px_24px_rgba(45,29,16,0.18)]"
          draggable={false}
          src={HELD_ASSETS.galleryBench}
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
