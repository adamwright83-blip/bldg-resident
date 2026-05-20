import { useCallback, useEffect, useRef, useState } from "react";
import { clamp, type TiltPermissionStatus } from "./penPhysics";

type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

export function useDeviceTilt(reducedMotion: boolean) {
  const [permissionStatus, setPermissionStatus] =
    useState<TiltPermissionStatus>("unsupported");
  const [rawGamma, setRawGamma] = useState(0);
  const [targetAngle, setTargetAngle] = useState(0);
  const [angle, setAngle] = useState(0);
  const [fallbackAngle, setFallbackAngleState] = useState(0);

  const cleanupRef = useRef<(() => void) | null>(null);
  const latestGammaRef = useRef(0);
  const neutralGammaRef = useRef<number | null>(null);
  const rawTargetRef = useRef(0);
  const smoothAngleRef = useRef(0);
  const smoothVelocityRef = useRef(0);
  const fallbackAngleRef = useRef(0);

  const detach = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    const gamma = event.gamma ?? 0;

    latestGammaRef.current = gamma;
    if (neutralGammaRef.current === null) {
      neutralGammaRef.current = gamma;
    }

    const calibratedGamma = gamma - neutralGammaRef.current;
    const nextTarget = clamp(calibratedGamma * 0.28, -10, 10);

    rawTargetRef.current = nextTarget;
    setRawGamma(gamma);
    setTargetAngle(nextTarget);
  }, []);

  const attachListener = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    detach();
    window.addEventListener("deviceorientation", handleOrientation, true);
    cleanupRef.current = () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, [detach, handleOrientation]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    detach();
    neutralGammaRef.current = null;
    rawTargetRef.current = 0;

    if (reducedMotion) {
      setPermissionStatus("reducedMotion");
      return undefined;
    }

    if (!("DeviceOrientationEvent" in window)) {
      setPermissionStatus("unsupported");
      return undefined;
    }

    const orientationEvent = window.DeviceOrientationEvent as
      | DeviceOrientationEventWithPermission
      | undefined;

    if (typeof orientationEvent?.requestPermission === "function") {
      setPermissionStatus("prompt");
      return undefined;
    }

    attachListener();
    setPermissionStatus("listening");

    return detach;
  }, [attachListener, detach, reducedMotion]);

  useEffect(() => {
    let raf = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const deltaSeconds = clamp((now - lastTime) / 1000, 1 / 120, 1 / 30);
      lastTime = now;

      const shouldUseFallback =
        reducedMotion ||
        permissionStatus === "unsupported" ||
        permissionStatus === "prompt" ||
        permissionStatus === "denied";
      const target = reducedMotion
        ? 0
        : shouldUseFallback
          ? fallbackAngleRef.current
          : rawTargetRef.current;
      const stiffness = 55;
      const damping = 18;
      const mass = 0.65;
      const force = -stiffness * (smoothAngleRef.current - target);
      const damper = -damping * smoothVelocityRef.current;
      const acceleration = (force + damper) / mass;

      smoothVelocityRef.current += acceleration * deltaSeconds;
      smoothAngleRef.current += smoothVelocityRef.current * deltaSeconds;

      setAngle(smoothAngleRef.current);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [permissionStatus, reducedMotion]);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || reducedMotion) {
      return false;
    }

    const orientationEvent = window.DeviceOrientationEvent as
      | DeviceOrientationEventWithPermission
      | undefined;

    if (typeof orientationEvent?.requestPermission !== "function") {
      neutralGammaRef.current = null;
      attachListener();
      setPermissionStatus("listening");
      return true;
    }

    setPermissionStatus("requesting");

    try {
      const result = await orientationEvent.requestPermission();

      if (result === "granted") {
        neutralGammaRef.current = null;
        rawTargetRef.current = 0;
        attachListener();
        setPermissionStatus("granted");
        return true;
      }

      setPermissionStatus("denied");
      return false;
    } catch {
      setPermissionStatus("denied");
      return false;
    }
  }, [attachListener, reducedMotion]);

  const calibrate = useCallback(() => {
    neutralGammaRef.current = latestGammaRef.current;
    rawTargetRef.current = 0;
    setTargetAngle(0);
  }, []);

  const setFallbackAngle = useCallback((nextAngle: number) => {
    const clamped = clamp(nextAngle, -14, 14);

    fallbackAngleRef.current = clamped;
    setFallbackAngleState(clamped);
    setTargetAngle(clamped);
  }, []);

  return {
    angle,
    rawGamma,
    targetAngle,
    fallbackAngle,
    permissionStatus,
    requestPermission,
    calibrate,
    setFallbackAngle,
  };
}
