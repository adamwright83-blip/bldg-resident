// ============================================
// BLDG SegmentControl — Light theme
// Active: white bg, dark text
// Inactive: transparent bg, warm grey text
// ============================================

import { motion } from "framer-motion";
import { springs } from "@/lib/springs";

interface SegmentControlProps {
  segments: string[];
  active: number;
  onChange: (index: number) => void;
}

export default function SegmentControl({ segments, active, onChange }: SegmentControlProps) {
  return (
    <div
      className="flex relative"
      style={{
        background: "#EDE9E3",
        borderRadius: 10,
        padding: 3,
      }}
    >
      {segments.map((seg, i) => (
        <button
          key={seg}
          onClick={() => onChange(i)}
          className="relative flex-1 z-10 flex items-center justify-center"
          style={{
            height: 38,
            fontSize: 14,
            fontWeight: 500,
            color: active === i ? "#4A4540" : "#9B9590",
            background: "transparent",
            border: "none",
            borderRadius: 8,
            transition: "color 0.15s",
          }}
        >
          {active === i && (
            <motion.div
              layoutId="segment-indicator"
              className="absolute inset-0"
              style={{
                background: "#FFFFFF",
                borderRadius: 8,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
              transition={springs.snap}
            />
          )}
          <span className="relative z-10">{seg}</span>
        </button>
      ))}
    </div>
  );
}
