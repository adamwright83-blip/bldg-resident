/**
 * BldgLogo — The app's character, not a decoration.
 *
 * Two elements: the black square (anchor) and white dot (soul).
 * All animation lives in the dot. The square never moves.
 *
 * Sizes:
 *   - "hero"   (56px) — centered empty-state, waiting
 *   - "medium" (32px) — typing indicator in laundry mode
 *   - "small"  (24px) — message avatar, working
 *
 * Moods:
 *   - "idle"          — dot at rest
 *   - "breathe"       — slow ambient pulse (empty state)
 *   - "orbit"         — dot circles inside the square (thinking)
 *   - "settle"        — dot decelerates from orbit back to center (done)
 *   - "recognize"     — single swell when user sends ("got it")
 *   - "confirm"       — dramatic 3-4x expansion on booking lock-in
 *   - "laundry"       — projector: dot moves to upper-right, ring projects outward, clothes tumble
 *   - "laundry-seal"  — tumble decelerates, water stills, holds as static mark
 *
 * Pass `layoutId` to participate in the Framer Motion hero→avatar leap.
 */

import { motion } from "framer-motion";
import { useId } from "react";

interface BldgLogoProps {
  size?: "hero" | "medium" | "small";
  mood?:
    | "idle" | "breathe" | "orbit" | "settle"
    | "recognize" | "confirm"
    | "laundry" | "laundry-seal";
  layoutId?: string;
  className?: string;
}

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

  const isLaundry = mood === "laundry" || mood === "laundry-seal";

  // --- Projector geometry ---
  // Dot destination: upper-right quadrant (~72% right, ~28% up)
  const dotDestX = px * 0.72;
  const dotDestY = px * 0.28;
  // Ring: fills most of the square, centered
  const ringR = px * 0.38;
  const ringStroke = size === "hero" ? 2.2 : size === "medium" ? 1.4 : 1;
  // Arc dasharray: ~310deg sweep out of 360, with rounded gap
  const circumference = 2 * Math.PI * ringR;
  const arcLen = circumference * (310 / 360);
  const gapLen = circumference - arcLen;
  // Clothing scale inside ring
  const clothScale = ringR * 0.28;
  // Water line Y position: bottom third of ring
  const waterY = cy + ringR * 0.55;
  const waterLeft = cx - ringR * 0.7;
  const waterRight = cx + ringR * 0.7;
  const waterMid = cx;
  const waveAmp = ringR * 0.12;

  const sizeKey = size === "hero" ? "hero" : size === "medium" ? "med" : "sm";

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

      {isLaundry ? (
        <>
          <defs>
            <linearGradient id={`ring-grad-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>
            <clipPath id={`ring-clip-${uid}`}>
              <circle cx={cx} cy={cy} r={ringR - ringStroke / 2} />
            </clipPath>
          </defs>

          {/* Dot: slides from center to upper-right */}
          <circle
            cx={dotDestX}
            cy={dotDestY}
            r={dotR}
            fill="#ffffff"
            className={
              mood === "laundry-seal"
                ? `bldg-dot-projected-${sizeKey}`
                : `bldg-dot-project-${sizeKey}`
            }
            style={{
              transformOrigin: `${dotDestX}px ${dotDestY}px`,
            }}
          />

          {/* Gradient arc ring: scales from 0→1, origin at dot destination */}
          <circle
            cx={cx}
            cy={cy}
            r={ringR}
            fill="none"
            stroke={`url(#ring-grad-${uid})`}
            strokeWidth={ringStroke}
            strokeDasharray={`${arcLen} ${gapLen}`}
            strokeLinecap="round"
            className={
              mood === "laundry-seal"
                ? `bldg-ring-hold`
                : `bldg-ring-expand-${sizeKey}`
            }
            style={{
              transformOrigin: `${dotDestX}px ${dotDestY}px`,
            }}
          />

          {/* Clothes tumble inside ring (clipped to ring interior) */}
          <g
            clipPath={`url(#ring-clip-${uid})`}
            className={
              mood === "laundry-seal"
                ? "bldg-wash-settle"
                : "bldg-wash-tumble"
            }
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          >
            <g transform={`translate(${cx - ringR * 0.3} ${cy - ringR * 0.2}) rotate(15) scale(${clothScale})`}>
              <path d={TSHIRT} fill="none" stroke="#ffffff" strokeWidth={0.22} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </g>
            <g transform={`translate(${cx + ringR * 0.2} ${cy + ringR * 0.15}) rotate(-35) scale(${clothScale})`}>
              <path d={SOCK} fill="none" stroke="#ffffff" strokeWidth={0.22} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </g>
            <g transform={`translate(${cx - ringR * 0.1} ${cy + ringR * 0.3}) rotate(12) scale(${clothScale})`}>
              <path d={SHORTS} fill="none" stroke="#ffffff" strokeWidth={0.22} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </g>
          </g>

          {/* Water line at bottom of ring */}
          <path
            d={
              mood === "laundry-seal"
                ? `M${waterLeft} ${waterY} L${waterRight} ${waterY}`
                : `M${waterLeft} ${waterY} Q${waterMid - ringR * 0.25} ${waterY - waveAmp} ${waterMid} ${waterY} Q${waterMid + ringR * 0.25} ${waterY + waveAmp} ${waterRight} ${waterY}`
            }
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={ringStroke * 0.6}
            strokeLinecap="round"
            clipPath={`url(#ring-clip-${uid})`}
            className={
              mood === "laundry-seal"
                ? "bldg-water-settle"
                : "bldg-water-wave"
            }
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
