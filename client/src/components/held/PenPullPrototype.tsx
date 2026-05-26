import { useMemo, useRef, useState } from "react";
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
  microphone: "/held/microphone.png",
  paper: "/held/held-paper-bg.png",
  tray: "/held/nursery-heldscreen.png",
};

type PrototypeMode = "rest" | "choice" | "speech" | "typing";
type HeldTextCommandResponse = {
  displayRequest: string;
  rawTranscript: string;
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
  const [debug, setDebug] = useState(defaultDebug);
  const [draft, setDraft] = useState("");
  const [internalComposerOpen, setInternalComposerOpen] = useState(false);
  const [mode, setMode] = useState<PrototypeMode>("rest");
  const [speechTranscript, setSpeechTranscript] = useState("");
  const [typedCommandStatus, setTypedCommandStatus] = useState<
    "idle" | "summarizing" | "ready" | "error"
  >("idle");
  const composerOpen = controlledComposerOpen ?? internalComposerOpen;
  const composerVisible = composerOpen && mode !== "speech";
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
  };
  const submitTypedCommand = async () => {
    const text = draft.trim();
    if (!text || typedCommandStatus === "summarizing") {
      return;
    }

    setTypedCommandStatus("summarizing");

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
      setTypedCommandStatus("ready");
    } catch (error) {
      console.error("[PenPullPrototype] typed command failed", error);
      const displayRequest = buildTypedCommandFallback(text);
      setDraft(displayRequest);
      setSpeechTranscript(displayRequest);
      setTypedCommandStatus("ready");
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
    composerOpen: composerVisible,
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

  const reset = () => {
    if (controlledComposerOpen === undefined) {
      setInternalComposerOpen(false);
    }
    setDraft("");
    setSpeechTranscript("");
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
          data-composer-open={composerVisible ? "true" : "false"}
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

          <img
            alt=""
            className={`pointer-events-none absolute left-1/2 top-[-154px] z-30 w-[118px] -translate-x-1/2 select-none drop-shadow-[0_16px_26px_rgba(43,28,14,0.24)] transition-[opacity,transform] duration-[960ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${microphoneClassName}`}
            data-held-mic-mode={mode}
            draggable={false}
            src={HELD_ASSETS.microphone}
          />
          {(mode === "choice" || mode === "speech") && (
            <button
              aria-label="Use microphone"
              className="absolute left-1/2 top-[118px] z-[60] h-[150px] w-[150px] -translate-x-1/2 rounded-full opacity-0"
              onClick={enterSpeechMode}
              type="button"
            />
          )}

          <header className="pointer-events-none absolute left-[8%] top-[8%] z-20">
            <p className="text-[15px] tracking-[0.08em]">HELD.chat</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.32em] text-[#7a6d5f]">
              Residence 1807 · 12A
            </p>
          </header>

          <img
            alt=""
            className="pointer-events-none absolute right-[7%] top-[7%] z-20 h-10 w-10 opacity-70"
            draggable={false}
            src={HELD_ASSETS.crest}
          />

          <section className="pointer-events-none absolute left-[8%] top-[17%] z-10 max-w-[210px]">
            <h1 className="font-serif text-[42px] leading-none text-[#2d251d]">
              Held.
            </h1>
            <p className="mt-3 max-w-[160px] text-[14px] leading-5 text-[#55493d]">
              Nothing is in motion yet.
            </p>
          </section>

          <img
            alt=""
            className={`pointer-events-none absolute bottom-[-1px] left-1/2 z-10 w-[95%] -translate-x-1/2 select-none drop-shadow-[0_18px_24px_rgba(45,29,16,0.20)] transition-opacity duration-[420ms] ${
              composerVisible || mode === "speech" ? "opacity-0" : "opacity-100"
            }`}
            draggable={false}
            src={HELD_ASSETS.tray}
          />

          <div
            aria-hidden="true"
            className={`pointer-events-none absolute bottom-[72px] left-[9%] right-[9%] z-20 h-px bg-[#b78a38] transition-opacity duration-200 ${
              composerVisible || mode === "speech" ? "opacity-0" : "opacity-25"
            }`}
          />

          <HeldVoiceCaptureTray
            active={mode === "speech"}
            onEditRequest={enterTypingMode}
            onTranscriptChange={setSpeechTranscript}
            transcript={speechTranscript}
          />

          {mode !== "speech" && (
            <>
              <PenChain
                {...physics.chainRefs}
                anchorFill="#9f7528"
                anchorRadius={2.6}
                glintStrokeWidth={2.1}
                highlightStroke="rgba(255, 234, 178, 0.58)"
                highlightStrokeWidth={0.8}
                mainStroke="rgba(154, 107, 31, 0.78)"
                mainStrokeWidth={2}
              />
              <PenCharm
                {...physics.penRefs}
                {...physics.pointerHandlers}
                objectFit="contain"
                penAssetSrc={penAssetSrc}
                transformOrigin="50% 3%"
              />
            </>
          )}

          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 z-30 transition-[opacity,transform] duration-[520ms] ${
              composerVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-[112%] opacity-0"
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

          {composerVisible && (
            <input
              aria-label="Prototype composer input"
              className="absolute bottom-[214px] left-[11%] right-[16%] z-50 h-10 rounded-full border border-[#9f875f]/25 bg-[#fffaf2]/55 px-4 text-[16px] text-[#2c2824] shadow-sm outline-none placeholder:text-[#8f8170]"
              data-testid="held-composer-input"
              onChange={event => {
                setDraft(event.currentTarget.value);
                setTypedCommandStatus("idle");
                if (event.currentTarget.value.length > 0) {
                  enterTypingMode();
                }
              }}
              onFocus={() => {
                if (draft.length > 0) {
                  enterTypingMode();
                }
              }}
              onKeyDown={event => {
                enterTypingMode();
                if (event.key === "Enter") {
                  event.preventDefault();
                  void submitTypedCommand();
                }
              }}
              placeholder="Type your message..."
              type="text"
              value={draft}
            />
          )}

          {composerVisible && (
            <button
              aria-label="Set typed request"
              className="absolute bottom-[214px] right-[8%] z-[60] h-10 w-10 rounded-full opacity-0"
              onClick={() => void submitTypedCommand()}
              type="button"
            />
          )}

          {composerVisible && typedCommandStatus !== "idle" && (
            <p
              aria-live="polite"
              className="pointer-events-none absolute bottom-[266px] left-[11%] right-[11%] z-50 text-[12px] italic text-[#8c6a34]"
            >
              {typedCommandStatus === "summarizing"
                ? "Making sense of it."
                : typedCommandStatus === "ready"
                  ? "Set it in motion →"
                  : "I could not read that request yet."}
            </p>
          )}

          {mode === "choice" && (
            <button
              className="absolute bottom-8 left-1/2 z-[60] -translate-x-1/2 text-[16px] text-[#9a681f] transition-opacity duration-300"
              onClick={enterSpeechMode}
              type="button"
            >
              Tap to speak
            </button>
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
        </div>
      </section>
    </main>
  );
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
