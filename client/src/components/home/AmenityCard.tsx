// ============================================
// BLDG AmenityCard
// 2-column grid cards for amenities
// Icon + name + availability status
// whileTap: scale(0.97)
// ============================================

import { motion } from "framer-motion";
import { cardTap, springs } from "@/lib/springs";
import type { LucideIcon } from "lucide-react";

interface AmenityCardProps {
  icon: LucideIcon;
  name: string;
  availability: string;
  availabilityColor: string;
  onClick: () => void;
}

export default function AmenityCard({
  icon: Icon,
  name,
  availability,
  availabilityColor,
  onClick,
}: AmenityCardProps) {
  return (
    <motion.button
      whileTap={cardTap}
      transition={springs.micro}
      onClick={onClick}
      className="bldg-card text-left w-full"
      style={{
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <Icon size={24} strokeWidth={1.5} color="var(--text-secondary)" />

      <div className="flex flex-col gap-1">
        <span style={{ fontSize: 17, fontWeight: 500, color: "var(--text-primary)" }}>
          {name}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="status-dot" style={{ background: availabilityColor }} />
          <span style={{ fontSize: 12, color: "var(--text-secondary)", letterSpacing: "0.02em" }}>
            {availability}
          </span>
        </div>
      </div>
    </motion.button>
  );
}
