// ============================================
// BLDG AppShell — Container + bottom action bar
// No tab navigation — single-page concierge
// Bottom bar: "Message BLDG..." + "Post to Community..."
// ============================================

import { Plus, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import type { ReactNode } from "react";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-container" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }}>
        {children}
      </div>

      {/* Bottom Action Bar */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50"
        style={{
          background: "rgba(245, 242, 237, 0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: "1px solid #E8E3DC",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div
          className="flex items-center gap-2"
          style={{ height: 56, padding: "0 16px" }}
        >
          {/* Plus button */}
          <button
            onClick={() => toast("Attach a photo or file")}
            style={{
              width: 36,
              height: 36,
              borderRadius: 9999,
              background: "#DDD8D0",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Plus size={18} strokeWidth={2} color="#7A756E" />
          </button>

          {/* Message BLDG pill */}
          <button
            onClick={() => toast("Messaging coming soon")}
            className="flex-1"
            style={{
              height: 38,
              borderRadius: 9999,
              background: "#E8E3DC",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 16px",
              fontSize: 14,
              fontWeight: 500,
              color: "#7A756E",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Message BLDG...
          </button>

          {/* Post to Community pill */}
          <button
            onClick={() => toast("Community posts coming soon")}
            style={{
              height: 38,
              borderRadius: 9999,
              background: "#FFFFFF",
              border: "1px solid #E8E3DC",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: "0 14px",
              fontSize: 14,
              fontWeight: 500,
              color: "#4A4540",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Post to Community...
            <ChevronRight size={14} strokeWidth={2} color="#9B9590" />
          </button>
        </div>
      </div>
    </div>
  );
}
