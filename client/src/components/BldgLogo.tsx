/**
 * BldgLogo — The app's character, not a decoration.
 *
 * Two elements: the black square (anchor) and white dot (soul).
 * All animation lives in the dot. The square never moves.
 *
 * Sizes:
 *   - "hero"   (56px) — centered empty-state, waiting
 *   - "medium" (32px) — mid-size contexts
 *   - "small"  (24px) — message avatar, working
 *
 * Moods:
 *   - "idle"      — dot at rest
 *   - "breathe"   — slow ambient pulse (empty state)
 *   - "orbit"     — dot circles inside the square (thinking)
 *   - "settle"    — dot decelerates from orbit back to center (done)
 *   - "recognize" — single swell when user sends ("got it")
 *   - "confirm"   — dramatic 3-4x expansion on booking lock-in
 *
 * Pass `layoutId` to participate in the Framer Motion hero→avatar leap.
 */

import { motion } from "framer-motion";

interface BldgLogoProps {
  size?: "hero" | "medium" | "small";
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
  const px = size === "hero" ? 56 : size === "medium" ? 32 : 24;
  const dotR = size === "hero" ? 7 : size === "medium" ? 4 : 3;
  const cornerR = size === "hero" ? 10 : size === "medium" ? 6 : 4;
  const cx = px / 2;
  const cy = px / 2;

  const dotClass =
    mood === "breathe"     ? "bldg-dot-breathe"
    : mood === "orbit"     ? (size === "hero" ? "bldg-dot-orbit-hero" : "bldg-dot-orbit-sm")
    : mood === "settle"    ? (size === "hero" ? "bldg-dot-settle-hero" : "bldg-dot-settle-sm")
    : mood === "recognize" ? "bldg-dot-recognize"
    : mood === "confirm"   ? "bldg-dot-confirm"
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
      overflow="visible"
    >
      <rect width={px} height={px} rx={cornerR} fill="#1a1a1a" />
      <circle
        cx={cx}
        cy={cy}
        r={dotR}
        fill="#ffffff"
        className={dotClass}
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
