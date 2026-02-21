// ============================================
// BLDG ActiveOrderBanner — Light theme
// Subtle warm tint background
// ============================================

import { motion } from "framer-motion";
import { cardTap, springs } from "@/lib/springs";
import { ChevronRight, Shirt } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";

export default function ActiveOrderBanner() {
  const { state } = useApp();

  const activeOrder = state.orders.find(
    (o) => o.status !== "delivered" && o.status !== "charged"
  );

  if (!activeOrder) return null;

  const statusLabels: Record<string, string> = {
    scheduled: "Scheduled",
    collected: "Collected",
    "pending-intake": "Pending Intake",
    charged: "Charged",
  };

  return (
    <motion.button
      whileTap={cardTap}
      transition={springs.micro}
      onClick={() => toast("Order details coming soon")}
      className="w-full text-left"
      style={{
        background: "rgba(181, 164, 139, 0.08)",
        borderRadius: 14,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
        border: "1px solid rgba(181, 164, 139, 0.12)",
      }}
    >
      <Shirt size={20} strokeWidth={1.5} color="var(--accent-warm)" />
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
            Laundry
          </span>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            · {statusLabels[activeOrder.status]}
          </span>
        </div>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          Est. delivery: {activeOrder.deliveryWindow || "Tomorrow 6pm"}
        </span>
      </div>
      <ChevronRight size={16} strokeWidth={1.5} color="var(--text-tertiary)" />
    </motion.button>
  );
}
