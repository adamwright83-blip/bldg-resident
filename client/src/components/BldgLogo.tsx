/**
 * BldgLogo — Black square with white dot.
 *
 * Two sizes:
 *   - "large" (48px) — centered empty-state hero
 *   - "small" (24px) — message avatar
 *
 * Animation states:
 *   - "idle"      — static
 *   - "breathe"   — slow ambient breathing (empty state)
 *   - "bounce"    — 3-beat dot rhythm while AI is processing
 *   - "streaming" — steady active pulse while message streams
 *   - "recognize" — single quick swell when user sends ("got it")
 *   - "pulse"     — single scale-up (legacy, booking confirmed)
 *   - "confirm"   — dramatic 3-4x swell + settle on booking lock-in
 */

interface BldgLogoProps {
  size?: "large" | "small";
  animate?: "idle" | "breathe" | "bounce" | "streaming" | "recognize" | "pulse" | "confirm";
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
          : animate === "streaming"
            ? "bldg-dot-streaming"
            : animate === "recognize"
              ? "bldg-dot-recognize"
              : animate === "confirm"
                ? "bldg-dot-confirm"
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
