// ============================================
// BLDG FeedPage — Stub for MVP
// Empty state with invitation to start conversation
// Architecture supports future expansion
// ============================================

import { motion } from "framer-motion";
import { springs } from "@/lib/springs";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";

export default function FeedPage() {
  return (
    <div className="flex flex-col" style={{ padding: "16px 20px 32px" }}>
      <h1
        className="font-display"
        style={{ fontSize: 24, color: "var(--text-primary)", marginBottom: 20 }}
      >
        Feed
      </h1>

      <div
        className="flex flex-col items-center justify-center gap-5"
        style={{ paddingTop: 80 }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "var(--surface-raised)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MessageCircle size={28} strokeWidth={1.5} color="var(--text-tertiary)" />
        </div>

        <div className="flex flex-col items-center gap-2 text-center" style={{ maxWidth: 280 }}>
          <span style={{ fontSize: 17, fontWeight: 500, color: "var(--text-primary)" }}>
            No one's shared their space yet. Be the first.
          </span>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          transition={springs.micro}
          onClick={() => toast("Community feed coming soon")}
          className="bldg-btn-secondary"
          style={{ width: "auto", padding: "0 32px" }}
        >
          Start a Conversation
        </motion.button>
      </div>
    </div>
  );
}
