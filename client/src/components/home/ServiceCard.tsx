// ============================================
// BLDG ServiceCard
// Background: #1A1A1A, border: 1px solid #2A2A2A
// Border-radius: 12px, padding: 20px
// Specular highlight via ::after
// Entire card is tap target — NO nested buttons
// whileTap: scale(0.97)
// NO photos. Icons only.
// ============================================

import { motion } from "framer-motion";
import { cardTap, springs } from "@/lib/springs";
import type { LucideIcon } from "lucide-react";

interface ServiceCardProps {
  icon: LucideIcon;
  name: string;
  price: string;
  status?: string;
  statusColor?: string;
  isHero?: boolean;
  onClick: () => void;
}

export default function ServiceCard({
  icon: Icon,
  name,
  price,
  status,
  statusColor,
  isHero,
  onClick,
}: ServiceCardProps) {
  return (
    <motion.button
      whileTap={cardTap}
      transition={springs.micro}
      onClick={onClick}
      className="bldg-card text-left w-full"
      style={{
        cursor: "pointer",
        display: "flex",
        flexDirection: isHero ? "row" : "column",
        alignItems: isHero ? "center" : "flex-start",
        gap: isHero ? 16 : 12,
      }}
    >
      <Icon
        size={isHero ? 28 : 24}
        strokeWidth={1.5}
        color="var(--text-secondary)"
        style={{ flexShrink: 0 }}
      />

      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <span
          style={{
            fontSize: 17,
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          {name}
        </span>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          {price}
        </span>
        {status && (
          <div className="flex items-center gap-1.5" style={{ marginTop: 2 }}>
            <span
              className="status-dot"
              style={{ background: statusColor || "var(--status-active)" }}
            />
            <span
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                letterSpacing: "0.02em",
              }}
            >
              {status}
            </span>
          </div>
        )}
      </div>
    </motion.button>
  );
}
