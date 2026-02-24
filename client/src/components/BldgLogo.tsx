/**
 * BldgLogo — The app's character, not a decoration.
 *
 * Two elements: the black square (anchor) and white dot (soul).
 * All animation lives in the dot. The square never moves.
 *
 * Sizes:
 *   - "hero"  (56px) — centered empty-state, waiting
 *   - "small" (24px) — message avatar, working
 *
 * Moods:
 *   - "idle"      — dot at rest
 *   - "breathe"   — slow ambient pulse (empty state)
 *   - "orbit"     — dot circles inside the square (thinking)
 *   - "settle"    — dot decelerates from orbit back to center (done)
 *   - "recognize" — single swell when user sends ("got it")
 *   - "confirm"   — dramatic 3-4x expansion on booking lock-in
 *   - "laundry"   — dot expands into washing machine door, clothes tumble inside
 *
 * Pass `layoutId` to participate in the Framer Motion hero→avatar leap.
 */

import { motion } from "framer-motion";
import { useId } from "react";

interface BldgLogoProps {
  size?: "hero" | "medium" | "small";
  mood?: "idle" | "breathe" | "orbit" | "settle" | "recognize" | "confirm" | "laundry";
  layoutId?: string;
  className?: string;
}

// Clothing silhouettes — normalized to roughly -1…1 coordinate space.
// Designed to be legible at small scale as stroke-only outlines.
const TSHIRT = "M-0.5,-0.8 C-0.5,-0.25 0.5,-0.25 0.5,-0.8 L1,-0.5 L1,0 L0.55,-0.15 L0.55,0.8 L-0.55,0.8 L-0.55,-0.15 L-1,0 L-1,-0.5 Z";
const SOCK   = "M-0.3,-0.9 L0.3,-0.9 L0.3,0.2 C0.3,0.45 0.8,0.5 0.8,0.75 C0.8,1.1 -0.3,1.1 -0.3,0.75 Z";
const SHORTS = "M-0.65,-0.4 L0.65,-0.4 L0.5,0.8 L0.15,0.8 L0,0.1 L-0.15,0.8 L-0.5,0.8 Z";

export default function BldgLogo({
  size = "small",
  mood = "idle",
  layoutId,
  className = "",
}: BldgLogoProps) {
  const uid = useId().replace(/:/g, "");
  const px = size === "hero" ? 56 : size === "medium" ? 32 : 24;
  const dotR = size === "hero" ? 7 : size === "medium" ? 4 : 3;
  const cornerR = size === "hero" ? 10 : size === "medium" ? 6 : 4;
  const cx = px / 2;
  const cy = px / 2;

  // Washing machine door radius — fills most of the square
  const doorR = size === "hero" ? 22 : size === "medium" ? 12 : 9;
  // Scale for clothing items: items are in -1…1 space, multiply to get px
  const clothScale = doorR * 0.32;

  const dotClass =
    mood === "breathe"   ? "bldg-dot-breathe"
    : mood === "orbit"   ? (size === "hero" ? "bldg-dot-orbit-hero" : "bldg-dot-orbit-sm")
    : mood === "settle"  ? (size === "hero" ? "bldg-dot-settle-hero" : "bldg-dot-settle-sm")
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

      {mood === "laundry" ? (
        <>
          {/* Washing machine door — expands from dot size */}
          <circle
            cx={cx}
            cy={cy}
            r={doorR}
            fill="white"
            className={size === "hero" ? "bldg-laundry-door-hero" : "bldg-laundry-door-small"}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />

          {/* Clothes tumbling inside (fade in after door expands) */}
          <g
            className="bldg-laundry-tumble"
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          >
            {/* T-shirt: upper-left quadrant */}
            <g transform={`translate(${cx - doorR * 0.32} ${cy - doorR * 0.22}) rotate(15) scale(${clothScale})`}>
              <path d={TSHIRT} fill="none" stroke="#1a1a1a" strokeWidth={0.28} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </g>
            {/* Sock: right */}
            <g transform={`translate(${cx + doorR * 0.22} ${cy + doorR * 0.2}) rotate(-35) scale(${clothScale})`}>
              <path d={SOCK} fill="none" stroke="#1a1a1a" strokeWidth={0.28} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </g>
            {/* Shorts: lower-left */}
            <g transform={`translate(${cx - doorR * 0.12} ${cy + doorR * 0.32}) rotate(12) scale(${clothScale})`}>
              <path d={SHORTS} fill="none" stroke="#1a1a1a" strokeWidth={0.28} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </g>
          </g>

          {/* Door rim — subtle glass ring */}
          <circle
            cx={cx}
            cy={cy}
            r={doorR - (size === "hero" ? 1.5 : 0.6)}
            fill="none"
            stroke="rgba(26,26,26,0.14)"
            strokeWidth={size === "hero" ? 1.8 : 0.7}
            className={size === "hero" ? "bldg-laundry-door-hero" : "bldg-laundry-door-small"}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
        </>
      ) : (
        <circle
          cx={cx}
          cy={cy}
          r={dotR}
          fill="#ffffff"
          className={dotClass}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />
      )}
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
