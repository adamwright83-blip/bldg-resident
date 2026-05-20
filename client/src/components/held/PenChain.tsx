import type { MutableRefObject } from "react";

type PenChainProps = {
  anchorRef: MutableRefObject<SVGCircleElement | null>;
  glintRef: MutableRefObject<SVGPathElement | null>;
  highlightRef: MutableRefObject<SVGPathElement | null>;
  mainPathRef: MutableRefObject<SVGPathElement | null>;
};

export function PenChain({
  anchorRef,
  glintRef,
  highlightRef,
  mainPathRef,
}: PenChainProps) {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-30 h-full w-full"
      focusable="false"
    >
      <defs>
        <linearGradient id="held-chain-glint" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255, 247, 225, 0)" />
          <stop offset="46%" stopColor="rgba(255, 247, 225, 0.78)" />
          <stop offset="100%" stopColor="rgba(255, 247, 225, 0)" />
        </linearGradient>
      </defs>
      <path
        ref={(node) => {
          mainPathRef.current = node;
        }}
        d=""
        fill="none"
        stroke="rgba(120,111,96,0.55)"
        strokeLinecap="round"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <path
        ref={(node) => {
          highlightRef.current = node;
        }}
        d=""
        fill="none"
        stroke="rgba(255,246,221,0.42)"
        strokeLinecap="round"
        strokeWidth="0.55"
        vectorEffect="non-scaling-stroke"
      />
      <path
        ref={(node) => {
          glintRef.current = node;
        }}
        d=""
        fill="none"
        stroke="url(#held-chain-glint)"
        strokeLinecap="round"
        strokeWidth="1.2"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        ref={(node) => {
          anchorRef.current = node;
        }}
        cx="0"
        cy="0"
        fill="rgba(91, 77, 58, 0.76)"
        r="2.1"
      />
    </svg>
  );
}
