/**
 * WasherIcon — Gold line-art washing machine.
 *
 * SVG matches the spec exactly. Gold strokes on transparent bg.
 * Water waves, fabric tumble, and bubbles loop forever (CSS-driven, GPU only).
 *
 * Props:
 *   animate — true: all looping animations run. false: static rest state.
 *   size    — rendered pixel size (default 130).
 */

interface WasherIconProps {
  animate?: boolean;
  size?: number;
  className?: string;
}

export default function WasherIcon({
  animate = true,
  size = 130,
  className = "",
}: WasherIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`washer-machine ${animate ? "washer-animate" : ""} ${className}`}
      aria-label="Washing machine"
      overflow="visible"
    >
      {/* Machine body */}
      <rect
        x="16" y="14" width="88" height="96" rx="10"
        fill="none" stroke="rgba(201,169,110,0.55)" strokeWidth="1.4"
        strokeLinecap="round" strokeLinejoin="round"
      />

      {/* Control panel divider */}
      <line
        x1="16" y1="32" x2="104" y2="32"
        stroke="rgba(201,169,110,0.2)" strokeWidth="0.7"
      />

      {/* Control knob */}
      <circle
        cx="28" cy="23" r="4"
        fill="none" stroke="rgba(201,169,110,0.25)" strokeWidth="0.8"
      />
      <line
        x1="28" y1="19" x2="28" y2="21"
        stroke="rgba(201,169,110,0.25)" strokeWidth="0.6"
      />

      {/* Indicator light */}
      <circle className="wm-indicator" cx="94" cy="23" r="2" fill="rgba(201,169,110,0.85)" />

      {/* Small display */}
      <rect
        x="40" y="20" width="16" height="6" rx="1.5"
        fill="none" stroke="rgba(201,169,110,0.25)" strokeWidth="0.8"
      />

      {/* Door outer ring */}
      <circle
        cx="60" cy="68" r="30"
        fill="none" stroke="rgba(201,169,110,0.7)" strokeWidth="1.4"
      />

      {/* Door inner ring */}
      <circle
        cx="60" cy="68" r="26"
        fill="rgba(201,169,110,0.02)" stroke="rgba(201,169,110,0.2)" strokeWidth="0.8"
      />

      {/* Handle */}
      <path
        d="M 90 60 Q 95 60, 95 66 Q 95 72, 90 72"
        fill="none" stroke="rgba(201,169,110,0.4)" strokeWidth="1.2" strokeLinecap="round"
      />

      {/* Interior (clipped to door) */}
      <clipPath id="wm-door-clip">
        <circle cx="60" cy="68" r="25" />
      </clipPath>

      <g clipPath="url(#wm-door-clip)">
        {/* Water fill */}
        <path
          className="wm-water-fill"
          d="M 34 68 Q 44 61, 56 68 Q 68 75, 78 68 L 78 95 L 34 95 Z"
          fill="rgba(201,169,110,0.025)"
        />

        {/* Water waves */}
        <path
          className="wm-water-line"
          d="M 34 68 Q 44 61, 56 68 Q 68 75, 78 68"
          fill="none" stroke="rgba(201,169,110,0.45)" strokeWidth="1.1" strokeLinecap="round"
        />
        <path
          className="wm-water-line-2"
          d="M 34 71 Q 45 67, 56 71 Q 67 75, 78 71"
          fill="none" stroke="rgba(201,169,110,0.2)" strokeWidth="0.8" strokeLinecap="round"
        />

        {/* Fabric */}
        <path className="wm-fabric wm-fabric-1" d="M 42 72 Q 50 64, 60 70 Q 68 76, 74 68" />
        <path className="wm-fabric wm-fabric-2" d="M 38 76 Q 48 82, 58 75 Q 66 68, 76 74" />
        <path className="wm-fabric wm-fabric-3" d="M 46 78 Q 54 70, 64 76 Q 70 80, 78 72" />

        {/* Bubbles */}
        <circle className="wm-bubble wm-b1" cx="50" cy="63" r="2.5" />
        <circle className="wm-bubble wm-b2" cx="66" cy="61" r="1.8" />
        <circle className="wm-bubble wm-b3" cx="56" cy="59" r="1.5" />
        <circle className="wm-bubble wm-b4" cx="44" cy="60" r="2" />
      </g>
    </svg>
  );
}
