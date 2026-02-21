// ============================================
// BLDG BookingConfirmation — Light theme
// Animated checkmark (scale spring 0→1)
// "Pickup Confirmed" — DM Serif Display, 20px
// DONE button only (single-page layout)
// ============================================

import { motion } from "framer-motion";
import { springs } from "@/lib/springs";
import { Check } from "lucide-react";

interface BookingConfirmationProps {
  pickupWindow: string;
  location: string;
  onDone: () => void;
}

export default function BookingConfirmation({
  pickupWindow,
  location,
  onDone,
}: BookingConfirmationProps) {
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Animated Checkmark */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={springs.sheet}
        style={{
          width: 64,
          height: 64,
          borderRadius: 9999,
          background: "var(--accent-warm)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Check size={32} strokeWidth={2} color="#FFFFFF" />
      </motion.div>

      {/* Text */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="font-display" style={{ fontSize: 20, color: "var(--text-primary)" }}>
          Pickup Confirmed
        </h2>
        <p style={{ fontSize: 15, color: "var(--text-primary)" }}>
          {pickupWindow} · {location}
        </p>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          We'll text you when we collect your items.
        </p>
      </div>

      {/* Done Button */}
      <div className="flex flex-col gap-3 w-full">
        <motion.button
          whileTap={{ scale: 0.97 }}
          transition={springs.micro}
          onClick={onDone}
          className="bldg-btn-primary"
        >
          Done
        </motion.button>
      </div>
    </div>
  );
}
