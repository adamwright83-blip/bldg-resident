// ============================================
// BLDG BottomNav — 4-tab navigation
// Height: 56px + safe-area-inset-bottom
// Background: #0F0F0F with 1px top border #2A2A2A
// Icons: 24px, stroke-only, 1.5px
// Active: #C9A96E | Inactive: #6B6B66
// Labels: 10px, uppercase, letter-spacing 0.1em
// NO glass/blur — permanent surface
// ============================================

import { Home, ShoppingBag, MessageCircle, User } from "lucide-react";
import { useLocation } from "wouter";

const tabs = [
  { path: "/", label: "HOME", icon: Home },
  { path: "/orders", label: "ORDERS", icon: ShoppingBag },
  { path: "/feed", label: "FEED", icon: MessageCircle },
  { path: "/profile", label: "PROFILE", icon: User },
];

export default function BottomNav() {
  const [location, setLocation] = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50"
      style={{
        background: "#0F0F0F",
        borderTop: "1px solid #2A2A2A",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex items-center justify-around" style={{ height: 56 }}>
        {tabs.map((tab) => {
          const isActive = location === tab.path || (tab.path !== "/" && location.startsWith(tab.path));
          const isHome = tab.path === "/" && location === "/";
          const active = isActive || isHome;

          return (
            <button
              key={tab.path}
              onClick={() => setLocation(tab.path)}
              className="flex flex-col items-center justify-center gap-1 flex-1 h-full"
              style={{ background: "transparent", border: "none" }}
            >
              <tab.icon
                size={24}
                strokeWidth={1.5}
                color={active ? "#C9A96E" : "#6B6B66"}
              />
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  color: active ? "#C9A96E" : "#6B6B66",
                  fontWeight: 500,
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
