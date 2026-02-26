/**
 * RadialConfirm — Radial orbital confirmation icon.
 *
 * NOT a washing machine. NOT an illustration. A controlled radial mechanism:
 *   - A single gold arc ring
 *   - A single orbit dot
 *   - Subtle seal behavior via arc sweep + micro scale
 *
 * States:
 *   "rest"      — static ~220° arc, dot at upper-right. No motion.
 *   "confirmed" — one-shot ~570ms sequence, then holds FINAL state (static).
 *   "final"     — static ~300° arc, dot at bottom-left. Distinct from rest.
 *
 * SVG IDs: bezel, bezelHighlight, orbitDot, ringGroup
 */

import { useEffect, useRef, useState } from "react";

interface WasherIconProps {
  state: "rest" | "confirmed";
  size?: number;
  className?: string;
}

const GOLD = "#C9A227";
const R = 34;
const CX = 60;
const CY = 60;
const STROKE_W = 6;
const CIRC = 2 * Math.PI * R; // ~213.63

// Arc lengths
const ARC_REST = CIRC * (220 / 360);   // ~130.55 (220° visible)
const GAP_REST = CIRC - ARC_REST;       // ~83.08
const ARC_FINAL = CIRC * (300 / 360);  // ~178.02 (300° visible)
const GAP_FINAL = CIRC - ARC_FINAL;     // ~35.61

// Highlight segment: ~60° arc
const HL_ARC = CIRC * (60 / 360);      // ~35.6
const HL_GAP = CIRC - HL_ARC;           // ~178.0

// Dot positions (on circle at radius 34 from center 60,60)
// REST: upper-right, ~35° from top clockwise → 55° from right CCW
const DOT_REST_X = CX + R * Math.cos((-55 * Math.PI) / 180);  // ~79.5
const DOT_REST_Y = CY + R * Math.sin((-55 * Math.PI) / 180);  // ~32.2
// FINAL: bottom-left, ~220° from top clockwise → 230° from right CCW
const DOT_FINAL_X = CX + R * Math.cos((230 * Math.PI) / 180); // ~38.1
const DOT_FINAL_Y = CY + R * Math.sin((230 * Math.PI) / 180); // ~86.0

// Translation delta for dot move
const DOT_DX = DOT_FINAL_X - DOT_REST_X; // ~-41.4
const DOT_DY = DOT_FINAL_Y - DOT_REST_Y; // ~53.8

export default function WasherIcon({
  state,
  size = 80,
  className = "",
}: WasherIconProps) {
  const [playOnce, setPlayOnce] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (state === "confirmed" && !hasPlayed) {
      setPlayOnce(true);
      timerRef.current = setTimeout(() => {
        setPlayOnce(false);
        setHasPlayed(true);
      }, 920);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state, hasPlayed]);

  const isAnimating = playOnce;
  const isSealed = hasPlayed || (state === "confirmed" && !playOnce);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`radial-confirm ${isAnimating ? "radial-playing" : ""} ${isSealed ? "radial-sealed" : ""} ${className}`}
      aria-label="Confirmation indicator"
    >
      <g id="ringGroup" className="radial-ring-group">
        {/* Main arc ring */}
        <circle
          id="bezel"
          className="radial-bezel"
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke={GOLD}
          strokeWidth={STROKE_W}
          strokeLinecap="round"
          strokeDasharray={
            isSealed
              ? `${ARC_FINAL} ${GAP_FINAL}`
              : `${ARC_REST} ${GAP_REST}`
          }
          transform={`rotate(-130 ${CX} ${CY})`}
        />

        {/* Highlight sweep arc (same ring, separate for animation) */}
        <circle
          id="bezelHighlight"
          className="radial-highlight"
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke={GOLD}
          strokeWidth={STROKE_W}
          strokeLinecap="round"
          strokeDasharray={`${HL_ARC} ${HL_GAP}`}
          strokeDashoffset={HL_ARC + HL_GAP}
          opacity="0"
          transform={`rotate(-130 ${CX} ${CY})`}
        />
      </g>

      {/* Orbit dot */}
      <circle
        id="orbitDot"
        className="radial-dot"
        cx={isSealed ? DOT_FINAL_X : DOT_REST_X}
        cy={isSealed ? DOT_FINAL_Y : DOT_REST_Y}
        r="3.5"
        fill={GOLD}
      />
    </svg>
  );
}
