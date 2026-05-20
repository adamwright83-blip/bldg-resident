import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from "react";
import {
  buildChainPath,
  clamp,
  getPenMetrics,
  getPenRingPoint,
  getPenTipY,
  getPullRatio,
  lerp,
  resolvePenTuning,
  springStep,
  type PenMetrics,
  type PenPhysicsTuning,
  type PenState,
  type TiltPermissionStatus,
} from "./penPhysics";
import { useDeviceTilt } from "./useDeviceTilt";

export type PenPhysicsDebugSnapshot = {
  gamma: number;
  penTipY: number;
  penX: number;
  penY: number;
  pullRatio: number;
  state: PenState;
  targetAngle: number;
  unlockY: number;
};

export type PenUnlockInfo = {
  penTipY: number;
  penX: number;
  penY: number;
  unlockY: number;
};

export type UsePenPhysicsOptions = {
  composerOpen?: boolean;
  debug?: boolean;
  onUnlock?: (info: PenUnlockInfo) => void;
  reducedMotion?: boolean;
  stageRef: RefObject<HTMLElement | null>;
  tuning?: Partial<PenPhysicsTuning>;
};

type PhysicsState = {
  grabOffsetX: number;
  grabOffsetY: number;
  lastDebugAt: number;
  lastPointerAt: number;
  lastPointerX: number;
  lastPointerY: number;
  pointerId: number | null;
  pointerStartX: number;
  pointerStartY: number;
  pointerVX: number;
  pointerVY: number;
  rotation: number;
  targetX: number;
  targetY: number;
  unlockedAt: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

const INITIAL_METRICS = getPenMetrics(390, 844);

function getIdleState(permissionStatus: TiltPermissionStatus): PenState {
  return permissionStatus === "prompt" || permissionStatus === "requesting"
    ? "permissionNeeded"
    : "idle";
}

function getLocalPoint(
  event: PointerEvent<HTMLElement>,
  stage: HTMLElement | null,
) {
  const rect = stage?.getBoundingClientRect();

  if (!rect) {
    return { x: event.clientX, y: event.clientY };
  }

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

export function usePenPhysics({
  composerOpen = false,
  debug = false,
  onUnlock,
  reducedMotion,
  stageRef,
  tuning,
}: UsePenPhysicsOptions) {
  const hitboxRef = useRef<HTMLButtonElement | null>(null);
  const visualRef = useRef<HTMLElement | null>(null);
  const shadowRef = useRef<HTMLSpanElement | null>(null);
  const chainPathRef = useRef<SVGPathElement | null>(null);
  const chainHighlightRef = useRef<SVGPathElement | null>(null);
  const chainGlintRef = useRef<SVGPathElement | null>(null);
  const chainAnchorRef = useRef<SVGCircleElement | null>(null);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [metrics, setMetrics] = useState(INITIAL_METRICS);
  const [penState, setPenState] = useState<PenState>("idle");
  const [debugSnapshot, setDebugSnapshot] =
    useState<PenPhysicsDebugSnapshot>({
      gamma: 0,
      penTipY: INITIAL_METRICS.restY + INITIAL_METRICS.penHeight / 2,
      penX: INITIAL_METRICS.restX,
      penY: INITIAL_METRICS.restY,
      pullRatio: 0,
      state: "idle",
      targetAngle: 0,
      unlockY: INITIAL_METRICS.unlockY,
    });

  const effectiveReducedMotion = reducedMotion ?? prefersReducedMotion;
  const tilt = useDeviceTilt(effectiveReducedMotion);

  const metricsRef = useRef<PenMetrics>(INITIAL_METRICS);
  const penStateRef = useRef<PenState>("idle");
  const composerOpenRef = useRef(composerOpen);
  const debugRef = useRef(debug);
  const onUnlockRef = useRef(onUnlock);
  const reducedMotionRef = useRef(effectiveReducedMotion);
  const tiltAngleRef = useRef(0);
  const tiltStatusRef = useRef<TiltPermissionStatus>("unsupported");
  const rawGammaRef = useRef(0);
  const targetAngleRef = useRef(0);
  const tuningRef = useRef(resolvePenTuning(tuning));
  const physicsRef = useRef<PhysicsState>({
    grabOffsetX: 0,
    grabOffsetY: 0,
    lastDebugAt: 0,
    lastPointerAt: 0,
    lastPointerX: 0,
    lastPointerY: 0,
    pointerId: null,
    pointerStartX: 0,
    pointerStartY: 0,
    pointerVX: 0,
    pointerVY: 0,
    rotation: 0,
    targetX: INITIAL_METRICS.restX,
    targetY: INITIAL_METRICS.restY,
    unlockedAt: 0,
    vx: 0,
    vy: 0,
    x: INITIAL_METRICS.restX,
    y: INITIAL_METRICS.restY,
  });

  const setMachineState = useCallback((nextState: PenState) => {
    penStateRef.current = nextState;
    setPenState(nextState);
  }, []);

  const reset = useCallback(() => {
    const nextMetrics = metricsRef.current;
    const physics = physicsRef.current;

    physics.pointerId = null;
    physics.x = nextMetrics.restX;
    physics.y = nextMetrics.restY;
    physics.targetX = nextMetrics.restX;
    physics.targetY = nextMetrics.restY;
    physics.vx = 0;
    physics.vy = 0;
    physics.rotation = 0;
    physics.pointerVX = 0;
    physics.pointerVY = 0;
    physics.unlockedAt = 0;
    setMachineState(getIdleState(tiltStatusRef.current));
  }, [setMachineState]);

  const beginUnlock = useCallback(() => {
    const physics = physicsRef.current;
    const nextMetrics = metricsRef.current;
    const penTipY = getPenTipY(physics.y, nextMetrics.penHeight);

    if (
      penStateRef.current === "unlocked" ||
      penStateRef.current === "composerOpen"
    ) {
      return;
    }

    if (physics.pointerId !== null && hitboxRef.current) {
      try {
        hitboxRef.current.releasePointerCapture(physics.pointerId);
      } catch {
        // Pointer capture may already be gone after a browser gesture cancel.
      }
    }

    physics.pointerId = null;
    physics.unlockedAt = performance.now();
    physics.targetX = nextMetrics.width - tuningRef.current.restRightInset;
    physics.targetY = Math.max(
      nextMetrics.height - 150,
      nextMetrics.unlockY - nextMetrics.penHeight / 2,
    );
    setMachineState("unlocked");
    navigator.vibrate?.(8);
    onUnlockRef.current?.({
      penTipY,
      penX: physics.x,
      penY: physics.y,
      unlockY: nextMetrics.unlockY,
    });

    window.setTimeout(() => {
      if (penStateRef.current === "unlocked" && composerOpenRef.current) {
        setMachineState("composerOpen");
      }
    }, 430);
  }, [setMachineState]);

  const finishPull = useCallback(() => {
    const physics = physicsRef.current;
    const nextMetrics = metricsRef.current;

    if (
      penStateRef.current !== "grabbed" &&
      penStateRef.current !== "pulling"
    ) {
      return;
    }

    if (
      penStateRef.current === "pulling" &&
      getPenTipY(physics.y, nextMetrics.penHeight) >= nextMetrics.unlockY
    ) {
      beginUnlock();
      return;
    }

    physics.pointerId = null;
    physics.pointerVX = 0;
    physics.pointerVY = 0;
    physics.targetX = nextMetrics.restX;
    physics.targetY = nextMetrics.restY;
    setMachineState("returning");
  }, [beginUnlock, setMachineState]);

  const simulateUnlock = useCallback(() => {
    const nextMetrics = metricsRef.current;
    const physics = physicsRef.current;

    physics.pointerId = null;
    physics.targetX = nextMetrics.width - 38;
    physics.targetY = nextMetrics.unlockY - nextMetrics.penHeight / 2 + 4;
    physics.pointerVX = -18;
    physics.pointerVY = 220;
    setMachineState("pulling");
  }, [setMachineState]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReducedMotion = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    syncReducedMotion();
    mediaQuery.addEventListener("change", syncReducedMotion);

    return () => {
      mediaQuery.removeEventListener("change", syncReducedMotion);
    };
  }, []);

  useEffect(() => {
    tuningRef.current = resolvePenTuning(tuning);
  }, [tuning]);

  useEffect(() => {
    onUnlockRef.current = onUnlock;
  }, [onUnlock]);

  useEffect(() => {
    debugRef.current = debug;
  }, [debug]);

  useEffect(() => {
    reducedMotionRef.current = effectiveReducedMotion;
  }, [effectiveReducedMotion]);

  useEffect(() => {
    composerOpenRef.current = composerOpen;

    if (
      composerOpen &&
      penStateRef.current !== "unlocked" &&
      penStateRef.current !== "composerOpen"
    ) {
      setMachineState("composerOpen");
      return;
    }

    if (
      !composerOpen &&
      (penStateRef.current === "unlocked" ||
        penStateRef.current === "composerOpen")
    ) {
      reset();
    }
  }, [composerOpen, reset, setMachineState]);

  useEffect(() => {
    tiltAngleRef.current = tilt.angle;
    tiltStatusRef.current = tilt.permissionStatus;
    rawGammaRef.current = tilt.rawGamma;
    targetAngleRef.current = tilt.targetAngle;

    if (
      !composerOpenRef.current &&
      (penStateRef.current === "idle" ||
        penStateRef.current === "permissionNeeded")
    ) {
      setMachineState(getIdleState(tilt.permissionStatus));
    }
  }, [
    setMachineState,
    tilt.angle,
    tilt.permissionStatus,
    tilt.rawGamma,
    tilt.targetAngle,
  ]);

  useEffect(() => {
    const finishFromWindow = () => finishPull();

    window.addEventListener("pointerup", finishFromWindow);
    window.addEventListener("pointercancel", finishFromWindow);
    window.addEventListener("mouseup", finishFromWindow);
    window.addEventListener("touchend", finishFromWindow);
    window.addEventListener("blur", finishFromWindow);

    return () => {
      window.removeEventListener("pointerup", finishFromWindow);
      window.removeEventListener("pointercancel", finishFromWindow);
      window.removeEventListener("mouseup", finishFromWindow);
      window.removeEventListener("touchend", finishFromWindow);
      window.removeEventListener("blur", finishFromWindow);
    };
  }, [finishPull]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return undefined;
    }

    const measure = () => {
      const rect = stage.getBoundingClientRect();

      if (!rect.width || !rect.height) {
        return;
      }

      const previousMetrics = metricsRef.current;
      const nextMetrics = getPenMetrics(
        rect.width,
        rect.height,
        tuningRef.current,
      );
      const sizeChanged =
        Math.abs(previousMetrics.width - nextMetrics.width) > 1 ||
        Math.abs(previousMetrics.height - nextMetrics.height) > 1;
      const physics = physicsRef.current;

      metricsRef.current = nextMetrics;
      setMetrics(nextMetrics);

      if (!sizeChanged) {
        return;
      }

      if (
        penStateRef.current === "grabbed" ||
        penStateRef.current === "pulling"
      ) {
        physics.pointerId = null;
        setMachineState(getIdleState(tiltStatusRef.current));
      }

      if (!composerOpenRef.current) {
        physics.x = nextMetrics.restX;
        physics.y = nextMetrics.restY;
        physics.targetX = nextMetrics.restX;
        physics.targetY = nextMetrics.restY;
        physics.vx = 0;
        physics.vy = 0;
      } else {
        physics.targetX = nextMetrics.width - tuningRef.current.restRightInset;
        physics.targetY = nextMetrics.height - 150;
      }
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(stage);
    window.addEventListener("orientationchange", measure);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("orientationchange", measure);
    };
  }, [setMachineState, stageRef]);

  useEffect(() => {
    let raf = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const deltaSeconds = clamp((now - lastTime) / 1000, 1 / 120, 1 / 30);
      lastTime = now;

      const nextMetrics = metricsRef.current;
      const physics = physicsRef.current;
      const currentState = penStateRef.current;
      const reduced = reducedMotionRef.current;
      const swayAngle = reduced ? 0 : tiltAngleRef.current;
      let targetX = physics.targetX;
      let targetY = physics.targetY;
      let springX = { stiffness: 180, damping: 24, mass: 0.8 };
      let springY = { stiffness: 190, damping: 22, mass: 0.75 };
      let scale = 1;
      let visualOpacity = 1;
      let chainOpacity = 0.52;
      let rotationTarget = physics.rotation;

      if (currentState === "idle" || currentState === "permissionNeeded") {
        const idleSwayX = clamp(swayAngle * 0.58, -7, 7);
        const idleBob = reduced
          ? 0
          : Math.sin(now / 1260) * 0.7 + Math.abs(swayAngle) * 0.08;

        targetX = nextMetrics.restX + idleSwayX;
        targetY = nextMetrics.restY + idleBob;
        springX = { stiffness: 55, damping: 18, mass: 0.65 };
        springY = { stiffness: 48, damping: 17, mass: 0.72 };
        rotationTarget = reduced
          ? 0
          : clamp(swayAngle * 1.12 + Math.sin(now / 1480) * 0.9, -12, 12);
      } else if (currentState === "returning") {
        targetX = nextMetrics.restX;
        targetY = nextMetrics.restY;
        springX = { stiffness: 120, damping: reduced ? 24 : 16, mass: 0.7 };
        springY = { stiffness: 120, damping: reduced ? 24 : 16, mass: 0.7 };
        rotationTarget = clamp(swayAngle * 0.65, -7, 7);
      } else if (currentState === "unlocked") {
        const elapsed = clamp((now - physics.unlockedAt) / 420, 0, 1);

        targetX = nextMetrics.width - tuningRef.current.restRightInset;
        targetY = nextMetrics.height - 148;
        springX = { stiffness: 155, damping: 24, mass: 0.78 };
        springY = { stiffness: 160, damping: 24, mass: 0.78 };
        scale = lerp(1, 0.92, elapsed);
        visualOpacity = lerp(1, 0.65, elapsed);
        chainOpacity = lerp(0.82, 0.25, elapsed);
        rotationTarget = clamp(physics.rotation * 0.72, -12, 12);
      } else if (currentState === "composerOpen") {
        targetX = nextMetrics.width - tuningRef.current.restRightInset;
        targetY = nextMetrics.height - 148;
        springX = { stiffness: 160, damping: 30, mass: 0.8 };
        springY = { stiffness: 160, damping: 30, mass: 0.8 };
        scale = 0.92;
        visualOpacity = 0.65;
        chainOpacity = 0.25;
        rotationTarget = -4;
      } else {
        targetX = physics.targetX;
        targetY = physics.targetY;
        rotationTarget =
          clamp(
            (Math.atan2(
              physics.x - nextMetrics.anchorX,
              physics.y - nextMetrics.anchorY,
            ) *
              180 *
              0.45) /
              Math.PI,
            -18,
            18,
          ) +
          clamp(physics.pointerVX / 260, -3, 3) +
          clamp(physics.pointerVY / 900, -2, 2);
      }

      const nextX = springStep(
        physics.x,
        targetX,
        physics.vx,
        springX,
        deltaSeconds,
      );
      const nextY = springStep(
        physics.y,
        targetY,
        physics.vy,
        springY,
        deltaSeconds,
      );

      physics.x = nextX.value;
      physics.y = nextY.value;
      physics.vx = nextX.velocity;
      physics.vy = nextY.velocity;
      physics.rotation +=
        (rotationTarget - physics.rotation) * clamp(deltaSeconds * 14, 0, 1);

      if (currentState === "pulling") {
        const tipY = getPenTipY(physics.y, nextMetrics.penHeight);

        if (tipY >= nextMetrics.unlockY) {
          beginUnlock();
        }
      }

      if (currentState === "returning") {
        const isSettled =
          Math.abs(physics.x - nextMetrics.restX) < 0.65 &&
          Math.abs(physics.y - nextMetrics.restY) < 0.65 &&
          Math.abs(physics.vx) < 7 &&
          Math.abs(physics.vy) < 7;

        if (isSettled) {
          physics.x = nextMetrics.restX;
          physics.y = nextMetrics.restY;
          physics.vx = 0;
          physics.vy = 0;
          setMachineState(getIdleState(tiltStatusRef.current));
        }
      }

      const penRing = getPenRingPoint(
        physics.x,
        physics.y,
        nextMetrics.penHeight,
        tuningRef.current.ringTopInset,
      );
      const pullRatio = getPullRatio(nextMetrics, penRing);
      const penTipY = getPenTipY(physics.y, nextMetrics.penHeight);

      if (hitboxRef.current) {
        hitboxRef.current.style.width = `${nextMetrics.hitWidth}px`;
        hitboxRef.current.style.height = `${nextMetrics.hitHeight}px`;
        hitboxRef.current.style.transform = `translate3d(${(
          physics.x -
          nextMetrics.hitWidth / 2
        ).toFixed(2)}px, ${(
          physics.y -
          nextMetrics.hitHeight / 2
        ).toFixed(2)}px, 0)`;
      }

      if (visualRef.current) {
        visualRef.current.style.width = `${nextMetrics.penWidth}px`;
        visualRef.current.style.height = `${nextMetrics.penHeight}px`;
        visualRef.current.style.opacity = String(visualOpacity);
        visualRef.current.style.filter = `drop-shadow(${clamp(
          (physics.x - nextMetrics.restX) * 0.03,
          -1.5,
          1.5,
        ).toFixed(2)}px ${lerp(5, 8, pullRatio).toFixed(
          2,
        )}px ${lerp(5, 9, pullRatio).toFixed(2)}px rgba(28, 22, 16, ${lerp(
          0.24,
          0.34,
          pullRatio,
        ).toFixed(2)}))`;
        visualRef.current.style.transform = `translate(-50%, -50%) rotate(${physics.rotation.toFixed(
          2,
        )}deg) scale(${scale.toFixed(3)})`;
      }

      if (shadowRef.current) {
        shadowRef.current.style.width = `${nextMetrics.penWidth * 1.42}px`;
        shadowRef.current.style.height = `${Math.max(
          5,
          nextMetrics.penHeight * 0.12,
        )}px`;
        shadowRef.current.style.opacity = String(lerp(0.1, 0.22, pullRatio));
        shadowRef.current.style.transform = `translate(${(
          -50 +
          clamp((physics.x - nextMetrics.restX) * 0.06, -5, 5)
        ).toFixed(2)}%, ${(
          nextMetrics.penHeight * 0.46 +
          lerp(4, 7, pullRatio)
        ).toFixed(2)}px) rotate(${(physics.rotation * 0.22).toFixed(2)}deg)`;
      }

      const chainPath = buildChainPath(nextMetrics, penRing, pullRatio, swayAngle);
      const tensionOpacity =
        currentState === "unlocked" || currentState === "composerOpen"
          ? chainOpacity
          : lerp(0.48, 0.84, pullRatio);

      if (chainPathRef.current) {
        chainPathRef.current.setAttribute("d", chainPath);
        chainPathRef.current.style.opacity = String(tensionOpacity);
      }

      if (chainHighlightRef.current) {
        chainHighlightRef.current.setAttribute("d", chainPath);
        chainHighlightRef.current.style.opacity = String(
          lerp(0.18, 0.46, pullRatio) * chainOpacity,
        );
      }

      if (chainGlintRef.current) {
        chainGlintRef.current.setAttribute("d", chainPath);
        chainGlintRef.current.style.opacity = String(
          currentState === "pulling" ? lerp(0.06, 0.42, pullRatio) : 0.04,
        );
        chainGlintRef.current.style.strokeDasharray = `${lerp(
          8,
          18,
          pullRatio,
        ).toFixed(1)} ${lerp(94, 58, pullRatio).toFixed(1)}`;
        chainGlintRef.current.style.strokeDashoffset = `${-(now / 80).toFixed(
          1,
        )}`;
      }

      if (chainAnchorRef.current) {
        chainAnchorRef.current.setAttribute("cx", String(nextMetrics.anchorX));
        chainAnchorRef.current.setAttribute("cy", String(nextMetrics.anchorY));
        chainAnchorRef.current.style.opacity = String(
          currentState === "composerOpen" ? 0.35 : 0.82,
        );
      }

      if (debugRef.current && now - physics.lastDebugAt > 120) {
        physics.lastDebugAt = now;
        setDebugSnapshot({
          gamma: rawGammaRef.current,
          penTipY,
          penX: physics.x,
          penY: physics.y,
          pullRatio,
          state: penStateRef.current,
          targetAngle: targetAngleRef.current,
          unlockY: nextMetrics.unlockY,
        });
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [beginUnlock, setMachineState]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (composerOpenRef.current) {
        return;
      }

      const physics = physicsRef.current;
      const point = getLocalPoint(event, stageRef.current);

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      physics.pointerId = event.pointerId;
      physics.pointerStartX = point.x;
      physics.pointerStartY = point.y;
      physics.lastPointerX = point.x;
      physics.lastPointerY = point.y;
      physics.lastPointerAt = performance.now();
      physics.grabOffsetX = point.x - physics.x;
      physics.grabOffsetY = point.y - physics.y;
      physics.targetX = physics.x;
      physics.targetY = physics.y;
      physics.pointerVX = 0;
      physics.pointerVY = 0;
      setMachineState("grabbed");
    },
    [setMachineState, stageRef],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      const physics = physicsRef.current;
      if (physics.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();

      const nextMetrics = metricsRef.current;
      const point = getLocalPoint(event, stageRef.current);
      const now = performance.now();
      const deltaSeconds = clamp(
        (now - physics.lastPointerAt) / 1000,
        1 / 120,
        1 / 18,
      );
      const rawTargetX = point.x - physics.grabOffsetX;
      const rawTargetY = point.y - physics.grabOffsetY;
      const rightEdgeCorridor =
        nextMetrics.width - tuningRef.current.restRightInset;
      const resistedTargetX =
        rightEdgeCorridor + (rawTargetX - rightEdgeCorridor) * 0.56;

      physics.pointerVX = (point.x - physics.lastPointerX) / deltaSeconds;
      physics.pointerVY = (point.y - physics.lastPointerY) / deltaSeconds;
      physics.lastPointerX = point.x;
      physics.lastPointerY = point.y;
      physics.lastPointerAt = now;
      physics.targetX = clamp(
        resistedTargetX,
        nextMetrics.minX,
        nextMetrics.maxX,
      );
      physics.targetY = clamp(rawTargetY, nextMetrics.minY, nextMetrics.maxY);

      if (
        penStateRef.current === "grabbed" &&
        Math.hypot(point.x - physics.pointerStartX, point.y - physics.pointerStartY) >
          2
      ) {
        setMachineState("pulling");
      }
    },
    [setMachineState, stageRef],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      const physics = physicsRef.current;
      if (physics.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Some browsers release automatically when the pointer ends.
      }
      finishPull();
    },
    [finishPull],
  );

  const requestMotionPermission = useCallback(async () => {
    setMachineState("permissionNeeded");
    await tilt.requestPermission();

    if (
      !composerOpenRef.current &&
      (penStateRef.current === "permissionNeeded" ||
        penStateRef.current === "idle")
    ) {
      setMachineState(getIdleState(tiltStatusRef.current));
    }
  }, [setMachineState, tilt]);

  return {
    chainRefs: {
      anchorRef: chainAnchorRef,
      glintRef: chainGlintRef,
      highlightRef: chainHighlightRef,
      mainPathRef: chainPathRef,
    },
    debugSnapshot,
    metrics,
    penRefs: {
      hitboxRef,
      shadowRef,
      visualRef,
    },
    pointerHandlers: {
      onPointerCancel: handlePointerUp,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
    },
    reducedMotion: effectiveReducedMotion,
    requestMotionPermission,
    reset,
    setFallbackTilt: tilt.setFallbackAngle,
    simulateUnlock,
    state: penState,
    tilt,
  };
}
