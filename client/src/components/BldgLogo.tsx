/**
 * BldgLogo — Black square with white dot.
 *
 * Two sizes:
 *   - "large" (48px) — centered empty-state hero
 *   - "small" (24px) — message avatar
 *
 * Animation states:
 *   - "idle"    — static
 *   - "bounce"  — 3-beat dot rhythm while AI is processing
 *   - "pulse"   — single scale-up on booking confirmed
 *   - "breathe" — slow ambient breathing (empty state)
 */

interface BldgLogoProps {
  size?: "large" | "small";
  animate?: "idle" | "bounce" | "pulse" | "breathe";
  className?: string;
}

export default function BldgLogo({
  size = "small",
  animate = "idle",
  className = "",
}: BldgLogoProps) {
  const px = size === "large" ? 48 : 24;
  const dotR = size === "large" ? 6 : 3;
  const cornerR = size === "large" ? 8 : 4;

  const dotClass =
    animate === "bounce"
      ? "bldg-dot-bounce"
      : animate === "pulse"
        ? "bldg-dot-pulse"
        : animate === "breathe"
          ? "bldg-dot-breathe"
          : "";

  return (
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
        cx={px / 2}
        cy={px / 2}
        r={dotR}
        fill="#ffffff"
        className={dotClass}
        style={{
          transformOrigin: `${px / 2}px ${px / 2}px`,
        }}
      />
    </svg>
  );
}
