/**
 * Building pulse prototype — Manus BuildingFeed + NeighborGraph (mock data only).
 * No backend; does not touch receipt or payment flows.
 */
import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Building2, Users } from "lucide-react";
import BuildingFeed from "@/components/BuildingFeed";
import NeighborGraph from "@/components/NeighborGraph";
import { toast } from "sonner";

export default function CommunityPulse() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<"feed" | "passport">("feed");

  const onOpenDM = useCallback((neighborName: string) => {
    toast.message(`Message ${neighborName}`, {
      description: "Prototype only — neighbor DMs need building-scoped backend data.",
    });
  }, []);

  return (
    <div
      className="min-h-[100dvh] flex flex-col bg-[#F5F1EC]"
      style={{ fontFamily: "var(--font-display, system-ui, sans-serif)" }}
    >
      <header className="flex items-center gap-3 px-4 py-3 border-b border-black/10 bg-white/85 backdrop-blur-md shrink-0 z-10">
        <button
          type="button"
          onClick={() => setLocation("/")}
          className="p-2 rounded-full hover:bg-black/5 transition-colors"
          aria-label="Back to chat"
        >
          <ArrowLeft size={20} className="text-[#1A1A18]" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-[#1A1A18] tracking-tight">
            Building pulse
          </h1>
          <p className="text-[11px] text-[#6B6860]">
            Prototype · not saved to your building yet
          </p>
        </div>
      </header>

      <div className="flex gap-1 px-3 py-2 bg-white/70 border-b border-black/[0.06] shrink-0">
        <button
          type="button"
          onClick={() => setTab("feed")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === "feed"
              ? "bg-[#1A1A18] text-[#FAF8F5]"
              : "text-[#5C5248] hover:bg-black/5"
          }`}
        >
          <Building2 size={16} strokeWidth={1.8} />
          Feed
        </button>
        <button
          type="button"
          onClick={() => setTab("passport")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === "passport"
              ? "bg-[#1A1A18] text-[#FAF8F5]"
              : "text-[#5C5248] hover:bg-black/5"
          }`}
        >
          <Users size={16} strokeWidth={1.8} />
          Passport
        </button>
      </div>

      <div className="flex-1 min-h-0 relative">
        {tab === "feed" ? (
          <BuildingFeed onOpenDM={onOpenDM} />
        ) : (
          <div className="absolute inset-0 z-0">
            <NeighborGraph onClose={() => setTab("feed")} />
          </div>
        )}
      </div>
    </div>
  );
}
