/**
 * WasherIcon — Radial confirmation mechanism.
 *
 * Two states:
 *   - "rest"      — static: bezel ring + dot parked top-right. No motion.
 *   - "confirmed" — one-shot 900ms sequence, then freezes in sealed state.
 *
 * Sealed state is visually distinct from rest:
 *   - Dot ends bottom-left (not top-right)
 *   - Arc highlight ends in completed position
 *
 * Do not loop. Do not add glow/bounce/blur.
 */

import { useId } from "react";

interface WasherIconProps {
  state: "rest" | "confirmed";
  size?: number;
  className?: string;
}

export default function WasherIcon({
  state,
  size = 56,
  className = "",
}: WasherIconProps) {
  const uid = useId().replace(/:/g, "");
  const confirmed = state === "confirmed";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`washer-icon ${confirmed ? "washer-confirmed" : ""} ${className}`}
      aria-label="Washer confirmation"
    >
      <defs>
        <linearGradient id={`bezelGrad-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e1e1e" />
          <stop offset="18%" stopColor="#6a6a6a" />
          <stop offset="35%" stopColor="#e7e7e7" />
          <stop offset="55%" stopColor="#7f7f7f" />
          <stop offset="78%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#0f0f0f" />
        </linearGradient>

        <radialGradient id={`glassGrad-${uid}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#2b2b2b" />
          <stop offset="55%" stopColor="#161616" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </radialGradient>

        <clipPath id={`glassClip-${uid}`}>
          <circle cx="50" cy="50" r="28" />
        </clipPath>

        <linearGradient id={`highlightGrad-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Bezel (porthole) */}
      <g className="washer-bezel">
        <circle cx="50" cy="50" r="34" fill="none" stroke={`url(#bezelGrad-${uid})`} strokeWidth="6" />
        <circle cx="50" cy="50" r="30.5" fill="none" stroke="#000000" strokeOpacity="0.55" strokeWidth="1.2" />
      </g>

      {/* Bezel highlight arc */}
      <g className="washer-highlight" opacity="0.55">
        <circle
          cx="50" cy="50" r="34"
          fill="none"
          stroke={`url(#highlightGrad-${uid})`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="36 178"
          transform="rotate(-25 50 50)"
        />
      </g>

      {/* Glass */}
      <g className="washer-glass">
        <circle cx="50" cy="50" r="28" fill={`url(#glassGrad-${uid})`} />
        <circle cx="50" cy="50" r="27.5" fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="1" />
      </g>

      {/* Interior (clipped to glass) */}
      <g clipPath={`url(#glassClip-${uid})`}>
        {/* Water + bubbles */}
        <g className="washer-water-group">
          <path
            className="washer-water-fill"
            d="M0,64 C12,60 24,66 36,63 C48,60 60,67 72,64 C84,61 92,66 100,63 L100,100 L0,100 Z"
            fill="#ffffff"
            opacity="0.10"
          />
          <path
            className="washer-wave"
            d="M-10,63 C2,59 14,66 26,62 C38,58 50,67 62,63 C74,59 86,66 98,62 C110,58 122,67 134,63"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.22"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <g className="washer-bubbles" fill="#ffffff" opacity="0.16">
            <circle cx="26" cy="76" r="1.4" />
            <circle cx="34" cy="70" r="0.9" />
            <circle cx="44" cy="78" r="1.1" />
            <circle cx="58" cy="73" r="1.3" />
            <circle cx="66" cy="80" r="0.8" />
            <circle cx="74" cy="71" r="1.0" />
          </g>
        </g>

        {/* Clothes silhouettes */}
        <g className="washer-clothes" opacity="0.22">
          <path
            d="M42,44 C40,40 42,36 46,35 C49,34 51,36 52,39 C54,43 58,44 60,48 C62,53 59,58 54,59 C49,60 45,58 44,54 C43,51 44,48 42,44 Z"
            fill="#ffffff"
          />
          <path
            d="M55,40 C58,38 62,39 64,42 C66,45 65,49 62,51 C60,53 60,56 58,58 C55,61 50,61 47,58 C44,55 45,50 49,48 C51,47 52,43 55,40 Z"
            fill="#ffffff"
          />
          <path
            d="M36,52 C42,47 46,46 51,49 C56,52 61,51 66,45"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.18"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </g>

        {/* Inner ticks — reads "machine" */}
        <g opacity="0.10" stroke="#ffffff" strokeWidth="1" strokeLinecap="round">
          <path d="M50 24 L50 27" />
          <path d="M72 50 L69 50" />
          <path d="M50 76 L50 73" />
          <path d="M28 50 L31 50" />
        </g>
      </g>

      {/* Orbit dot */}
      <g className="washer-dot">
        <circle cx="78" cy="30" r="2.6" fill="#ffffff" opacity="0.92" />
      </g>
    </svg>
  );
}
