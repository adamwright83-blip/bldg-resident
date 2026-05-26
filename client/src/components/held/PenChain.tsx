import { useId, type MutableRefObject } from "react";

type PenChainProps = {
  anchorRef: MutableRefObject<SVGCircleElement | null>;
  anchorFill?: string;
  anchorRadius?: number;
  className?: string;
  glintRef: MutableRefObject<SVGPathElement | null>;
  glintStrokeWidth?: number;
  highlightRef: MutableRefObject<SVGPathElement | null>;
  highlightStroke?: string;
  highlightStrokeWidth?: number;
  mainPathRef: MutableRefObject<SVGPathElement | null>;
  mainStroke?: string;
  mainStrokeWidth?: number;
};

export function PenChain({
  anchorRef,
  anchorFill = "rgba(91, 77, 58, 0.76)",
  anchorRadius = 2.1,
  className = "z-30",
  glintRef,
  glintStrokeWidth = 1.2,
  highlightRef,
  highlightStroke = "rgba(255,246,221,0.42)",
  highlightStrokeWidth = 0.55,
  mainPathRef,
  mainStroke = "rgba(120,111,96,0.55)",
  mainStrokeWidth = 1,
}: PenChainProps) {
  const gradientId = useId().replace(/:/g, "");

  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255, 247, 225, 0)" />
          <stop offset="46%" stopColor="rgba(255, 247, 225, 0.78)" />
          <stop offset="100%" stopColor="rgba(255, 247, 225, 0)" />
        </linearGradient>
      </defs>
      <path
        ref={node => {
          mainPathRef.current = node;
        }}
        d=""
        fill="none"
        stroke={mainStroke}
        strokeLinecap="round"
        strokeWidth={mainStrokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      <path
        ref={node => {
          highlightRef.current = node;
        }}
        d=""
        fill="none"
        stroke={highlightStroke}
        strokeLinecap="round"
        strokeWidth={highlightStrokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      <path
        ref={node => {
          glintRef.current = node;
        }}
        d=""
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeLinecap="round"
        strokeWidth={glintStrokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      <circle
        ref={node => {
          anchorRef.current = node;
        }}
        cx="0"
        cy="0"
        fill={anchorFill}
        r={anchorRadius}
      />
    </svg>
  );
}
