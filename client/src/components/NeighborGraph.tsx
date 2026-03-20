/**
 * NeighborGraph — Building Cross-Section Passport
 *
 * Design Philosophy: Luxury Minimal / Gamified Social
 * - Dark building silhouette with floors that glow gold as you connect
 * - Connected floors: always-expanded, no tap required
 * - Unconnected floors: thin dark bars with intrigue teases
 * - Three tiers: Resident → Regular → Connector
 * - Floor Rep badge: first Connector per floor gets a crown marker
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { X, Crown, Users, Star, Zap, Sparkles } from "lucide-react";

// ─── Design Tokens ───
const T = {
  canvas: "#F5F1EC",
  surface: "#FDFAF6",
  surfaceAlt: "#F0EBE3",
  border: "#E8E0D5",
  gold: "#C9A96E",
  goldLight: "rgba(201,169,110,0.10)",
  goldMid: "rgba(201,169,110,0.25)",
  textPrimary: "#1A1714",
  textSecondary: "#5C5248",
  textTertiary: "#9C9088",
  font: "'Instrument Sans', 'Inter', sans-serif",
  dark: "#12100E",
  darkMid: "#1E1B18",
  darkFloor: "#252220",
};

// ─── Types ───
type ConnectionType = "sold" | "bought" | "favor" | "dm" | "offer";

interface FloorNeighbor {
  name: string;
  unit: string;
  initials: string;
  connectionType: ConnectionType;
  connectionLabel: string;
  isFloorRep?: boolean;
}

interface FloorData {
  floor: number;
  label: string;
  neighbors: FloorNeighbor[];
  isCurrentFloor?: boolean;
}

// ─── Mock Data: 23-floor building (OPUS LA) ───
const TOTAL_FLOORS = 23;
const MY_FLOOR = 14;

const CONNECTED_FLOORS: FloorData[] = [
  {
    floor: 22,
    label: "22nd",
    neighbors: [
      { name: "Alex Chen", unit: "2209", initials: "AC", connectionType: "favor", connectionLabel: "Lent you a screwdriver", isFloorRep: true },
    ],
  },
  {
    floor: 19,
    label: "19th",
    neighbors: [
      { name: "L. Carter", unit: "1914", initials: "LC", connectionType: "dm", connectionLabel: "Neighbor chat" },
    ],
  },
  {
    floor: 14,
    label: "14th",
    neighbors: [
      { name: "You", unit: "1408", initials: "ME", connectionType: "dm", connectionLabel: "Your floor" },
    ],
    isCurrentFloor: true,
  },
  {
    floor: 11,
    label: "11th",
    neighbors: [
      { name: "Riley Park", unit: "1121", initials: "RP", connectionType: "favor", connectionLabel: "Helped with locksmith rec" },
    ],
  },
  {
    floor: 7,
    label: "7th",
    neighbors: [
      { name: "Maya Torres", unit: "703", initials: "MT", connectionType: "bought", connectionLabel: "Bought your Peloton" },
    ],
  },
  {
    floor: 3,
    label: "3rd",
    neighbors: [
      { name: "James Kim", unit: "318", initials: "JK", connectionType: "favor", connectionLabel: "Borrowed your drill" },
    ],
  },
];

// ─── Intrigue teases for unconnected floors ───
const FLOOR_TEASES: Record<number, string> = {
  23: "A resident here just signed a deal with a major streaming platform.",
  21: "Someone on this floor has been to every continent — twice.",
  20: "A neighbor here runs one of LA's most-followed food accounts.",
  18: "This floor has a resident who trained under a Michelin-starred chef.",
  17: "A startup founder on this floor just closed a Series A.",
  16: "Someone here has a dog that's been in three national commercials.",
  15: "A resident on this floor plays in a band you've probably heard on the radio.",
  13: "This floor has a neighbor who consults for three Fortune 500 companies.",
  12: "A resident here just returned from six months in Tokyo.",
  10: "Someone on this floor designed a product you've definitely used.",
  9:  "A neighbor here hosts a weekly rooftop gathering — invite only.",
  8:  "This floor has a resident who used to work at SpaceX.",
  6:  "A neighbor here is writing a book about luxury real estate in LA.",
  5:  "Someone on this floor has a private wine cellar with 400+ bottles.",
  4:  "A resident here coaches an Olympic-level athlete.",
  2:  "This floor has a neighbor who just launched a skincare line at Sephora.",
  1:  "A resident here has lived in OPUS LA since the building opened.",
};

// Build full floor list
function buildFloorList(): Array<{ floor: number; connected: FloorData | null }> {
  const connectedMap = new Map(CONNECTED_FLOORS.map(f => [f.floor, f]));
  const floors: Array<{ floor: number; connected: FloorData | null }> = [];
  for (let i = TOTAL_FLOORS; i >= 1; i--) {
    floors.push({ floor: i, connected: connectedMap.get(i) ?? null });
  }
  return floors;
}

// ─── Tier System ───
type Tier = "resident" | "regular" | "connector";

function getTier(connectedCount: number, floorCount: number): Tier {
  if (connectedCount >= 16 && floorCount >= 8) return "connector";
  if (connectedCount >= 6 && floorCount >= 3) return "regular";
  return "resident";
}

const TIER_CONFIG = {
  resident: {
    label: "Resident",
    color: T.textTertiary,
    bg: T.surfaceAlt,
    border: T.border,
    icon: Users,
    description: "Meet 6 neighbors on 3+ floors to earn 20% off a service",
    nextLabel: "Regular",
    nextAt: "6 neighbors · 3 floors",
  },
  regular: {
    label: "Regular",
    color: T.gold,
    bg: T.goldLight,
    border: `${T.gold}44`,
    icon: Star,
    description: "Earn 20% off a service of your choice",
    nextLabel: "Connector",
    nextAt: "16 neighbors · 8 floors",
  },
  connector: {
    label: "Connector",
    color: "#E8C97A",
    bg: "rgba(232,201,122,0.12)",
    border: "rgba(232,201,122,0.4)",
    icon: Zap,
    description: "Gold dot on your name — neighbors seek you out",
    nextLabel: null,
    nextAt: null,
  },
};

// ─── Connection type icon ───
function connectionIcon(type: ConnectionType): string {
  if (type === "sold" || type === "bought") return "🛍";
  if (type === "favor") return "🤝";
  if (type === "offer") return "🛒";
  return "💬";
}

// ─── Connected Floor Row (always expanded) ───
function ConnectedFloorRow({ floor, connected, myFloor }: {
  floor: number;
  connected: FloorData;
  myFloor: number;
}) {
  const isMe = floor === myFloor;
  const hasFloorRep = connected.neighbors.some(n => n.isFloorRep);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        marginBottom: 6,
        borderRadius: 10,
        overflow: "hidden",
        border: isMe
          ? `1px solid ${T.gold}66`
          : `1px solid ${T.gold}22`,
        background: isMe
          ? `linear-gradient(135deg, rgba(201,169,110,0.12), rgba(201,169,110,0.06))`
          : "rgba(255,255,255,0.03)",
      }}
    >
      {/* Floor label bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 10px 5px",
          borderBottom: `1px solid rgba(255,255,255,0.04)`,
        }}
      >
        {/* Gold bar accent */}
        <div
          style={{
            width: 3,
            height: 16,
            borderRadius: 2,
            background: isMe
              ? `linear-gradient(180deg, ${T.gold}, #E8C97A)`
              : `${T.gold}88`,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: isMe ? T.gold : "rgba(245,241,236,0.7)",
            fontFamily: T.font,
            letterSpacing: "0.04em",
          }}
        >
          {isMe ? `Floor ${floor} · You` : `Floor ${floor}`}
        </span>
        {hasFloorRep && !isMe && (
          <div style={{ display: "flex", alignItems: "center", gap: 3, marginLeft: "auto" }}>
            <Crown size={9} color={T.gold} />
            <span style={{ fontSize: 9, color: T.gold, fontFamily: T.font, letterSpacing: "0.04em" }}>FLOOR REP</span>
          </div>
        )}
      </div>

      {/* Neighbor cards */}
      {!isMe && (
        <div style={{ padding: "6px 10px 8px" }}>
          {connected.neighbors.map((neighbor, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  background: `linear-gradient(135deg, ${T.gold}44, ${T.gold}88)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: T.gold,
                  fontFamily: T.font,
                  flexShrink: 0,
                }}
              >
                {neighbor.initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(245,241,236,0.9)", fontFamily: T.font }}>
                    {neighbor.name}
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(245,241,236,0.3)", fontFamily: T.font }}>
                    {neighbor.unit}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: "rgba(245,241,236,0.45)", fontFamily: T.font }}>
                  {connectionIcon(neighbor.connectionType)} {neighbor.connectionLabel}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Unconnected Floor Row (thin with tease) ───
function UnconnectedFloorRow({ floor }: { floor: number }) {
  const tease = FLOOR_TEASES[floor];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 0",
        marginBottom: 2,
      }}
    >
      {/* Floor number */}
      <span
        style={{
          width: 22,
          fontSize: 9,
          fontFamily: T.font,
          fontWeight: 400,
          color: "rgba(245,241,236,0.18)",
          textAlign: "right",
          flexShrink: 0,
          letterSpacing: "0.02em",
        }}
      >
        {floor}
      </span>

      {/* Dark floor bar */}
      <div
        style={{
          flex: 1,
          height: 8,
          borderRadius: 2,
          background: T.darkFloor,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle shimmer on hover */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.02), transparent)",
          }}
        />
      </div>

      {/* Tease text */}
      {tease && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            maxWidth: 160,
            flexShrink: 0,
          }}
        >
          <Sparkles size={8} color="rgba(201,169,110,0.35)" />
          <span
            style={{
              fontSize: 9,
              color: "rgba(245,241,236,0.25)",
              fontFamily: T.font,
              fontStyle: "italic",
              lineHeight: 1.3,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as const,
            }}
          >
            {tease}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───
export default function NeighborGraph({ onClose }: { onClose: () => void }) {
  const floors = useMemo(() => buildFloorList(), []);
  const connectedCount = CONNECTED_FLOORS.reduce((sum, f) => sum + f.neighbors.filter(n => n.name !== "You").length, 0);
  const floorCount = CONNECTED_FLOORS.filter(f => !f.isCurrentFloor).length;
  const tier = getTier(connectedCount, floorCount);
  const tierConfig = TIER_CONFIG[tier];
  const TierIcon = tierConfig.icon;

  const progressToRegular = Math.min(connectedCount / 6, 1);
  const progressToConnector = tier === "regular" ? Math.min(connectedCount / 16, 1) : tier === "connector" ? 1 : 0;
  const progress = tier === "resident" ? progressToRegular : progressToConnector;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "absolute",
        inset: 0,
        background: T.dark,
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        borderRadius: "inherit",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px 10px",
          borderBottom: `1px solid rgba(255,255,255,0.06)`,
          flexShrink: 0,
        }}
      >
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#F5F1EC", fontFamily: T.font, margin: 0 }}>
            Your Building Passport
          </h2>
          <p style={{ fontSize: 12, color: "rgba(245,241,236,0.45)", fontFamily: T.font, margin: "2px 0 0" }}>
            OPUS LA · 23 floors · 47 residents
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            background: "rgba(255,255,255,0.08)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={16} color="rgba(245,241,236,0.7)" />
        </motion.button>
      </div>

      {/* Tier Badge */}
      <div
        style={{
          margin: "12px 16px 0",
          padding: "12px 14px",
          background: "rgba(255,255,255,0.04)",
          borderRadius: 12,
          border: `1px solid ${tierConfig.border}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                background: tierConfig.bg,
                border: `1px solid ${tierConfig.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TierIcon size={14} color={tierConfig.color} />
            </div>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: tierConfig.color, fontFamily: T.font }}>
                {tierConfig.label}
              </span>
              <span style={{ fontSize: 11, color: "rgba(245,241,236,0.4)", fontFamily: T.font, marginLeft: 6 }}>
                {connectedCount} neighbors · {floorCount} floors
              </span>
            </div>
          </div>
          {tierConfig.nextLabel && (
            <span style={{ fontSize: 10, color: "rgba(245,241,236,0.35)", fontFamily: T.font }}>
              → {tierConfig.nextLabel}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {tierConfig.nextAt && (
          <>
            <div
              style={{
                height: 3,
                background: "rgba(255,255,255,0.08)",
                borderRadius: 2,
                overflow: "hidden",
                marginBottom: 5,
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                style={{
                  height: "100%",
                  background: `linear-gradient(90deg, ${T.gold}, #E8C97A)`,
                  borderRadius: 2,
                }}
              />
            </div>
            <p style={{ fontSize: 10, color: "rgba(245,241,236,0.35)", fontFamily: T.font, margin: 0 }}>
              {tierConfig.description} · Next: {tierConfig.nextAt}
            </p>
          </>
        )}
        {!tierConfig.nextAt && (
          <p style={{ fontSize: 10, color: "rgba(245,241,236,0.35)", fontFamily: T.font, margin: 0 }}>
            {tierConfig.description}
          </p>
        )}
      </div>

      {/* Building cross-section */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Scrollable floor list */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 16px 16px",
            scrollbarWidth: "none",
          }}
        >
          {floors.map(({ floor, connected }) =>
            connected ? (
              <ConnectedFloorRow
                key={floor}
                floor={floor}
                connected={connected}
                myFloor={MY_FLOOR}
              />
            ) : (
              <UnconnectedFloorRow key={floor} floor={floor} />
            )
          )}
        </div>
      </div>

      {/* Bottom legend */}
      <div
        style={{
          padding: "10px 16px 14px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 16, height: 6, borderRadius: 2, background: `linear-gradient(90deg, ${T.gold}, #E8C97A)` }} />
            <span style={{ fontSize: 9, color: "rgba(245,241,236,0.3)", fontFamily: T.font }}>Connected</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 16, height: 6, borderRadius: 2, background: T.darkFloor }} />
            <span style={{ fontSize: 9, color: "rgba(245,241,236,0.3)", fontFamily: T.font }}>Not yet</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Crown size={9} color={T.gold} />
            <span style={{ fontSize: 9, color: "rgba(245,241,236,0.3)", fontFamily: T.font }}>Floor Rep</span>
          </div>
        </div>
        <span style={{ fontSize: 9, color: "rgba(245,241,236,0.2)", fontFamily: T.font }}>
          {floorCount}/{TOTAL_FLOORS} floors lit
        </span>
      </div>
    </motion.div>
  );
}
