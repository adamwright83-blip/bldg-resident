import type { PenPhysicsDebugSnapshot } from "./usePenPhysics";
import type { TiltPermissionStatus } from "./penPhysics";

type PenPhysicsDebugPanelProps = {
  fallbackTilt: number;
  motionStatus: TiltPermissionStatus;
  onReset: () => void;
  onSetFallbackTilt: (angle: number) => void;
  onSimulateUnlock: () => void;
  snapshot: PenPhysicsDebugSnapshot;
};

export function PenPhysicsDebugPanel({
  fallbackTilt,
  motionStatus,
  onReset,
  onSetFallbackTilt,
  onSimulateUnlock,
  snapshot,
}: PenPhysicsDebugPanelProps) {
  return (
    <div className="absolute bottom-3 left-3 z-50 w-[240px] rounded border border-neutral-300 bg-white/95 p-3 text-[11px] leading-4 text-neutral-800 shadow-sm">
      <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
        <span>state</span>
        <strong>{snapshot.state}</strong>
        <span>gamma / angle</span>
        <strong>
          {snapshot.gamma.toFixed(1)} / {snapshot.targetAngle.toFixed(1)}
        </strong>
        <span>pen x / y</span>
        <strong>
          {snapshot.penX.toFixed(0)} / {snapshot.penY.toFixed(0)}
        </strong>
        <span>tip / unlock</span>
        <strong>
          {snapshot.penTipY.toFixed(0)} / {snapshot.unlockY.toFixed(0)}
        </strong>
        <span>pull</span>
        <strong>{snapshot.pullRatio.toFixed(2)}</strong>
        <span>motion</span>
        <strong>{motionStatus}</strong>
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block">fallback tilt</span>
        <input
          className="w-full"
          max="14"
          min="-14"
          onChange={(event) =>
            onSetFallbackTilt(Number(event.currentTarget.value))
          }
          step="0.5"
          type="range"
          value={fallbackTilt}
        />
      </label>

      <div className="mt-3 flex gap-2">
        <button
          className="h-8 flex-1 rounded border border-neutral-300 bg-white"
          onClick={onReset}
          type="button"
        >
          reset
        </button>
        <button
          className="h-8 flex-1 rounded border border-neutral-300 bg-white"
          onClick={onSimulateUnlock}
          type="button"
        >
          unlock
        </button>
      </div>
    </div>
  );
}
