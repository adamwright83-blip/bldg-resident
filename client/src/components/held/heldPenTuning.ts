import type { PenPhysicsTuningOverrides } from "./penPhysics";

export const HELD_LARGE_PEN_TUNING: PenPhysicsTuningOverrides = {
  anchorRightInset: 140,
  anchorY: 0,
  dragSpringX: { stiffness: 245, damping: 27, mass: 0.82 },
  dragSpringY: { stiffness: 420, damping: 30, mass: 0.72 },
  hitHeight: 356,
  hitWidth: 250,
  maxXRightInset: 34,
  maxYBottomInset: 72,
  minXRightInset: 220,
  minYOffset: 128,
  penHeight: 302,
  penWidth: 202,
  restRightInset: 140,
  restYRatio: 0.38,
  ringTopInset: 8,
  scaleMax: 1.06,
  scaleMin: 0.66,
  unlockBottomInset: 76,
};
