/**
 * BldgLogo — The app's character, not a decoration.
 *
 * Two elements: #square (the anchor) and #dot (the soul).
 * All animation lives in the dot. The square never moves.
 *
 * Sizes:
 *   - "hero"  (56px) — centered empty-state, waiting
 *   - "small" (24px) — message avatar, working
 *
 * Animation states (passed as `mood`):
 *   - "idle"      — dot at rest, no animation
 *   - "breathe"   — slow ambient pulse, square is still (empty state)
 *   - "orbit"     — dot circles inside the square (thinking / streaming)
 *   - "settle"    — dot decelerates from orbit back to center (response done)
 *   - "recognize" — single quick swell when user sends ("got it")
 *   - "confirm"   — dramatic 3-4x expansion when booking locks in
 *
 * Layout transition:
 *   Pass `layoutId` to participate in Framer Motion hero → avatar leap.
 *   The logo physically travels from its hero position to the first
 *   message avatar position when the first response arrives.
 */

import { motion } from "framer-motion";

interface BldgLogoProps {
  size?: "hero" | "small";
  mood?: "idle" | "breathe" | "orbit" | "settle" | "recognize" | "confirm";
  layoutId?: string;
  className?: string;
}

export default function BldgLogo({
  size = "small",
  mood = "idle",
  layoutId,
  className = "",
}: BldgLogoProps) {
  const px = size === "hero" ? 56 : 24;
  const dotR = size === "hero" ? 7 : 3;
  const cornerR = size === "hero" ? 10 : 4;
  const cx = px / 2;
  const cy = px / 2;

  // Orbit radius scales with logo size
  const orbitClass =
    mood === "orbit"
      ? size === "hero"
        ? "bldg-dot-orbit-hero"
        : "bldg-dot-orbit-sm"
      : mood === "settle"
        ? size === "hero"
          ? "bldg-dot-settle-hero"
          : "bldg-dot-settle-sm"
        : mood === "breathe"
          ? "bldg-dot-breathe"
          : mood === "recognize"
            ? "bldg-dot-recognize"
            : mood === "confirm"
              ? "bldg-dot-confirm"
              : "";

  const svgContent = (
    <svg
      width={px}
      height={px}
      viewBox={`0 0 ${px} ${px}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`bldg-logo ${className}`}
      aria-label="BLDG logo"
    >
      <rect width={px} height={px} rx={cornerR} fill="#1a1a1a" />
      <circle
        cx={cx}
        cy={cy}
        r={dotR}
        fill="#ffffff"
        className={orbitClass}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />
    </svg>
  );

  if (layoutId) {
    return (
      <motion.div layoutId={layoutId} style={{ display: "inline-flex" }}>
        {svgContent}
      </motion.div>
    );
  }

  return svgContent;
}
