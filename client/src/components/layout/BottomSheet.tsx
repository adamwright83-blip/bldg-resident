// ============================================
// BLDG BottomSheet — Frosted white glass sheet
// Light theme version
// ============================================

import { motion, AnimatePresence } from "framer-motion";
import { springs } from "@/lib/springs";
import type { ReactNode } from "react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function BottomSheet({ isOpen, onClose, children }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[60]"
            style={{ background: "rgba(0,0,0,0.2)" }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={springs.sheet}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-[70] glass-surface"
            style={{
              maxHeight: "85vh",
              background: "rgba(255, 255, 255, 0.92)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              borderTop: "1px solid #E8E3DC",
              boxShadow: "0 -8px 32px rgba(0,0,0,0.08)",
              overflowY: "auto",
              paddingBottom: "env(safe-area-inset-bottom, 24px)",
            }}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div
                style={{
                  width: 36,
                  height: 4,
                  background: "#DDD8D0",
                  borderRadius: 9999,
                }}
              />
            </div>

            <div className="px-6 pb-6">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
