export type PenState =
  | "idle"
  | "permissionNeeded"
  | "grabbed"
  | "pulling"
  | "returning"
  | "unlocked"
  | "composerOpen";

export type TiltPermissionStatus =
  | "unsupported"
  | "prompt"
  | "requesting"
  | "granted"
  | "denied"
  | "listening"
  | "reducedMotion";

export type Point = {
  x: number;
  y: number;
};

export type PenMetrics = {
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
  restX: number;
  restY: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  unlockY: number;
  penWidth: number;
  penHeight: number;
  hitWidth: number;
  hitHeight: number;
};

export type PenPhysicsTuning = {
  anchorRightInset: number;
  anchorY: number;
  restRightInset: number;
  restYRatio: number;
  minXRightInset: number;
  maxXRightInset: number;
  minYOffset: number;
  maxYBottomInset: number;
  unlockBottomInset: number;
  penWidth: number;
  penHeight: number;
  hitWidth: number;
  hitHeight: number;
  scaleMin: number;
  scaleMax: number;
  ringTopInset: number;
};

export type SpringConfig = {
  stiffness: number;
  damping: number;
  mass: number;
};

export const DEFAULT_PEN_TUNING: PenPhysicsTuning = {
  anchorRightInset: 26,
  anchorY: 28,
  restRightInset: 34,
  restYRatio: 0.36,
  minXRightInset: 120,
  maxXRightInset: 8,
  minYOffset: 80,
  maxYBottomInset: 48,
  unlockBottomInset: 44,
  penWidth: 16,
  penHeight: 52,
  hitWidth: 48,
  hitHeight: 84,
  scaleMin: 0.92,
  scaleMax: 1.08,
  ringTopInset: 5,
};

export function resolvePenTuning(
  tuning: Partial<PenPhysicsTuning> = {},
): PenPhysicsTuning {
  return {
    ...DEFAULT_PEN_TUNING,
    ...tuning,
  };
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

export function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function getPenMetrics(
  width: number,
  height: number,
  rawTuning?: Partial<PenPhysicsTuning>,
): PenMetrics {
  const tuning = resolvePenTuning(rawTuning);
  const scale = clamp(width / 390, tuning.scaleMin, tuning.scaleMax);
  const anchorX = width - tuning.anchorRightInset;
  const anchorY = tuning.anchorY;
  const penHeight = Math.round(tuning.penHeight * scale);

  return {
    width,
    height,
    anchorX,
    anchorY,
    restX: width - tuning.restRightInset,
    restY: height * tuning.restYRatio,
    minX: width - tuning.minXRightInset,
    maxX: width - tuning.maxXRightInset,
    minY: anchorY + tuning.minYOffset,
    maxY: height - tuning.maxYBottomInset,
    unlockY: height - tuning.unlockBottomInset,
    penWidth: Math.round(tuning.penWidth * scale),
    penHeight,
    hitWidth: Math.round(tuning.hitWidth * scale),
    hitHeight: Math.round(tuning.hitHeight * scale),
  };
}

export function getPenRingPoint(
  x: number,
  y: number,
  penHeight: number,
  ringTopInset = DEFAULT_PEN_TUNING.ringTopInset,
): Point {
  return {
    x,
    y: y - penHeight / 2 + ringTopInset,
  };
}

export function getPenTipY(y: number, penHeight: number) {
  return y + penHeight / 2;
}

export function getPullRatio(metrics: PenMetrics, penRing: Point) {
  const anchor = { x: metrics.anchorX, y: metrics.anchorY };
  const maxDistance = Math.max(1, metrics.unlockY - metrics.anchorY);

  return clamp(distance(anchor, penRing) / maxDistance, 0, 1);
}

export function buildChainPath(
  metrics: PenMetrics,
  penRing: Point,
  pullRatio: number,
  swayInfluence: number,
) {
  const midX = (metrics.anchorX + penRing.x) / 2;
  const midY = (metrics.anchorY + penRing.y) / 2;
  const horizontalSlack =
    lerp(6, 1, pullRatio) * Math.sign(metrics.anchorX - penRing.x || 1);
  const slack = lerp(14, 2, pullRatio);
  const idleSway = lerp(clamp(swayInfluence * 0.38, -4, 4), 0, pullRatio);
  const controlX = midX + horizontalSlack + idleSway;
  const controlY = midY + slack;

  return `M ${metrics.anchorX.toFixed(2)} ${metrics.anchorY.toFixed(
    2,
  )} Q ${controlX.toFixed(2)} ${controlY.toFixed(2)} ${penRing.x.toFixed(
    2,
  )} ${penRing.y.toFixed(2)}`;
}

export function springStep(
  current: number,
  target: number,
  velocity: number,
  config: SpringConfig,
  deltaSeconds: number,
) {
  const force = -config.stiffness * (current - target);
  const damper = -config.damping * velocity;
  const acceleration = (force + damper) / config.mass;
  const nextVelocity = velocity + acceleration * deltaSeconds;

  return {
    value: current + nextVelocity * deltaSeconds,
    velocity: nextVelocity,
  };
}
