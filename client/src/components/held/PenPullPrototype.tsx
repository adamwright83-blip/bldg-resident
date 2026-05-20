import { useRef, useState } from "react";
import { PenChain } from "./PenChain";
import { PenCharm } from "./PenCharm";
import { PenPhysicsDebugPanel } from "./PenPhysicsDebugPanel";
import { usePenPhysics } from "./usePenPhysics";

type PenPullPrototypeProps = {
  debug?: boolean;
  penAssetSrc?: string;
  reducedMotion?: boolean;
};

export default function PenPullPrototype({
  debug: defaultDebug = true,
  penAssetSrc = "/held/pen-mini.png",
  reducedMotion,
}: PenPullPrototypeProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [debug, setDebug] = useState(defaultDebug);
  const [composerOpen, setComposerOpen] = useState(false);

  const physics = usePenPhysics({
    composerOpen,
    debug,
    onUnlock: () => setComposerOpen(true),
    reducedMotion,
    stageRef,
  });

  const reset = () => {
    setComposerOpen(false);
    physics.reset();
  };

  return (
    <main className="min-h-dvh bg-neutral-950 p-4 text-neutral-900 sm:flex sm:items-center sm:justify-center">
      <section className="w-full max-w-[430px]">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-neutral-200">
          <span>pen physics test harness</span>
          <button
            className="rounded border border-neutral-600 px-2 py-1"
            onClick={() => setDebug((isOpen) => !isOpen)}
            type="button"
          >
            debug {debug ? "on" : "off"}
          </button>
          {physics.tilt.permissionStatus === "prompt" && (
            <button
              className="rounded border border-neutral-600 px-2 py-1"
              onClick={physics.requestMotionPermission}
              type="button"
            >
              enable motion
            </button>
          )}
        </div>

        <div
          ref={stageRef}
          className="relative h-[min(844px,calc(100dvh-72px))] min-h-[620px] overflow-hidden rounded border border-neutral-300 bg-[#FAF7F2] sm:h-[844px]"
          style={{
            touchAction: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
        >
          <PenChain {...physics.chainRefs} />
          <PenCharm
            {...physics.penRefs}
            {...physics.pointerHandlers}
            penAssetSrc={penAssetSrc}
          />

          <div className="pointer-events-none absolute bottom-11 left-0 right-0 z-10 border-t border-amber-500/30" />

          {composerOpen && (
            <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-neutral-300 bg-white/90 p-4 text-sm">
              composerOpen: true
            </div>
          )}

          {debug && (
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
