/**
 * BuildingFeed — BLDG.chat Activity Stream
 *
 * Design: "Living Interface" — warm cream + gold tokens, same as MarketplacePrototype
 * Card types:
 *   1. MicroFavorCard — quick asks from neighbors ("Anyone have a steamer?")
 *   2. NewListingCard — new marketplace listing cross-pollination
 *   3. ServiceActivityCard — anonymous social proof ("A neighbor booked a car detail")
 *   4. BuildingPulseCard — ambient building stats
 *
 * Micro-favor posting: composer at bottom → adds card to top of feed
 * "I can help" → calls onOpenDM(neighborName) to open messaging system
 */

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HandHeart,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Building2,
  Send,
  CheckCircle2,
  Car,
  Shirt,
  Dog,
  Package,
} from "lucide-react";

// ─── Design Tokens (mirrors MarketplacePrototype T object) ───
const T = {
  canvas: "#F5F1EC",
  surface: "#FFFFFF",
  border: "rgba(26,26,24,0.08)",
  gold: "#C9A961",
  goldLight: "rgba(201,169,97,0.12)",
  textPrimary: "#1A1A18",
  textSecondary: "#6B6860",
  textTertiary: "#9B9890",
  font: "'Space Grotesk', sans-serif",
  radiusSm: 12,
  radiusMd: 16,
};

// ─── Types ───
export type FeedCardType = "favor" | "listing" | "service-activity" | "pulse";

export interface FavorCard {
  id: string;
  type: "favor";
  favorType: "need" | "offer";  // need = asking for help, offer = giving something
  poster: string;
  floor: string;
  text: string;
  time: string;
  helpCount: number;
  resolved: boolean;
  isMine?: boolean;
}

export interface ListingFeedCard {
  id: string;
  type: "listing";
  title: string;
  price: string;
  seller: string;
  image: string;
  time: string;
}

export interface ServiceActivityCard {
  id: string;
  type: "service-activity";
  icon: "car" | "laundry" | "dog" | "package";
  text: string;
  sub: string;
  time: string;
}

export interface PulseCard {
  id: string;
  type: "pulse";
  neighborCount: number;
  soldCount: number;
}

export type FeedItem = FavorCard | ListingFeedCard | ServiceActivityCard | PulseCard;

// ─── Mock Feed Data ───
const INITIAL_FEED: FeedItem[] = [
  {
    id: "f1",
    type: "favor",
    favorType: "need",
    poster: "Maya",
    floor: "14th floor",
    text: "Anyone have a steamer I can borrow? Have a date tonight 😅",
    time: "2m ago",
    helpCount: 3,
    resolved: false,
  },
  {
    id: "l1",
    type: "listing",
    title: "Standing Desk (Adjustable)",
    price: "$120",
    seller: "Sarah",
    image: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=200&q=80",
    time: "8m ago",
  },
  {
    id: "sa1",
    type: "service-activity",
    icon: "car",
    text: "A neighbor just booked a car detail",
    sub: "3 details booked this week",
    time: "15m ago",
  },
  {
    id: "f2",
    type: "favor",
    favorType: "offer",
    poster: "James",
    floor: "8th floor",
    text: "Heading to Whole Foods — anyone need anything? Happy to grab stuff 🛒",
    time: "22m ago",
    helpCount: 1,
    resolved: false,
  },
  {
    id: "p1",
    type: "pulse",
    neighborCount: 47,
    soldCount: 12,
  },
  {
    id: "f3",
    type: "favor",
    favorType: "need",
    poster: "Alex",
    floor: "31st floor",
    text: "Does anyone have a Phillips head screwdriver? Need it for 10 min",
    time: "1h ago",
    helpCount: 2,
    resolved: true,
  },
  {
    id: "sa2",
    type: "service-activity",
    icon: "laundry",
    text: "Fluff & fold pickup is trending",
    sub: "8 residents booked laundry this week",
    time: "2h ago",
  },
  {
    id: "l2",
    type: "listing",
    title: "Vitamix Blender",
    price: "$180",
    seller: "Taylor",
    image: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=200&q=80",
    time: "3h ago",
  },
  {
    id: "f4",
    type: "favor",
    favorType: "need",
    poster: "Riley",
    floor: "19th floor",
    text: "Anyone know a good locksmith? Locked myself out 😬",
    time: "4h ago",
    helpCount: 4,
    resolved: true,
  },
  {
    id: "sa3",
    type: "service-activity",
    icon: "dog",
    text: "Mobile dog grooming is popular",
    sub: "5 pups groomed this month",
    time: "5h ago",
  },
];

// ─── Service Activity Icon Map ───
function ServiceIcon({ icon }: { icon: ServiceActivityCard["icon"] }) {
  const props = { size: 16, color: T.gold };
  if (icon === "car") return <Car {...props} />;
  if (icon === "laundry") return <Shirt {...props} />;
  if (icon === "dog") return <Dog {...props} />;
  return <Package {...props} />;
}

// ─── Micro-Favor Card ───
function FavorCardItem({
  card,
  onHelp,
}: {
  card: FavorCard;
  onHelp: (card: FavorCard) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      style={{
        background: T.surface,
        borderRadius: T.radiusMd,
        border: `1px solid ${T.border}`,
        padding: "14px 16px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Avatar */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${T.gold}33, ${T.gold}66)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              color: T.gold,
              fontFamily: T.font,
              flexShrink: 0,
            }}
          >
            {card.poster[0]}
          </div>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, fontFamily: T.font }}>
              {card.poster}
            </span>
            <span style={{ fontSize: 12, color: T.textTertiary, fontFamily: T.font }}> · {card.floor}</span>
          </div>
        </div>
        <span style={{ fontSize: 11, color: T.textTertiary, fontFamily: T.font }}>{card.time}</span>
      </div>

      {/* Message text */}
      <p style={{ fontSize: 14, color: T.textPrimary, fontFamily: T.font, lineHeight: 1.5, margin: "0 0 12px" }}>
        {card.text}
      </p>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {card.resolved ? (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <CheckCircle2 size={14} color="#4CAF50" />
            <span style={{ fontSize: 12, color: "#4CAF50", fontFamily: T.font, fontWeight: 500 }}>
              Sorted ✓
            </span>
          </div>
        ) : card.favorType === "offer" ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onHelp(card)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 20,
              border: "1.5px solid #4A9B8E",
              background: "rgba(74,155,142,0.10)",
              color: "#3A8A7D",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: T.font,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <ShoppingCart size={13} />
            Count me in
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onHelp(card)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 20,
              border: `1.5px solid ${T.gold}`,
              background: T.goldLight,
              color: T.gold,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: T.font,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <HandHeart size={13} />
            I can help
          </motion.button>
        )}

        {card.helpCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {/* Mini avatar stack */}
            <div style={{ display: "flex" }}>
              {Array.from({ length: Math.min(card.helpCount, 3) }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    background: `hsl(${30 + i * 40}, 60%, 70%)`,
                    border: `2px solid ${T.canvas}`,
                    marginLeft: i > 0 ? -6 : 0,
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: 12, color: T.textTertiary, fontFamily: T.font }}>
              {card.helpCount} {card.helpCount === 1 ? "neighbor" : "neighbors"} {card.favorType === "offer" ? "interested" : "offered"}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── New Listing Card ───
function ListingFeedCardItem({ card }: { card: ListingFeedCard }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: T.surface,
        borderRadius: T.radiusMd,
        border: `1px solid ${T.border}`,
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <img
        src={card.image}
        alt={card.title}
        style={{
          width: 52,
          height: 52,
          borderRadius: 10,
          objectFit: "cover",
          flexShrink: 0,
          background: T.border,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <ShoppingBag size={12} color={T.gold} />
          <span style={{ fontSize: 11, color: T.gold, fontWeight: 600, fontFamily: T.font, letterSpacing: "0.04em" }}>
            NEW LISTING
          </span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary, fontFamily: T.font, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {card.title}
        </div>
        <div style={{ fontSize: 13, color: T.textSecondary, fontFamily: T.font }}>
          {card.price} · {card.seller} · {card.time}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Service Activity Card ───
function ServiceActivityCardItem({ card }: { card: ServiceActivityCard }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: T.goldLight,
        borderRadius: T.radiusMd,
        border: `1px solid ${T.gold}33`,
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          background: T.surface,
          border: `1px solid ${T.gold}44`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          overflow: "visible",
        }}
      >
        <ServiceIcon icon={card.icon} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: T.textPrimary, fontFamily: T.font }}>
          {card.text}
        </div>
        <div style={{ fontSize: 12, color: T.textTertiary, fontFamily: T.font, marginTop: 2 }}>
          {card.sub}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Building Pulse Card ───
function BuildingPulseCardItem({ card }: { card: PulseCard }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: T.surface,
        borderRadius: T.radiusMd,
        border: `1px solid ${T.border}`,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          background: `linear-gradient(135deg, ${T.gold}22, ${T.gold}44)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Building2 size={18} color={T.gold} />
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary, fontFamily: T.font }}>
          {card.neighborCount} neighbors on BLDG.chat
        </div>
        <div style={{ fontSize: 12, color: T.textTertiary, fontFamily: T.font, marginTop: 2 }}>
          {card.soldCount} items sold this month · OPUS LA
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main BuildingFeed Component ───
export default function BuildingFeed({
  onOpenDM,
}: {
  onOpenDM: (neighborName: string) => void;
}) {
  const [feed, setFeed] = useState<FeedItem[]>(INITIAL_FEED);
  const [favorText, setFavorText] = useState("");
  const [helpedIds, setHelpedIds] = useState<Set<string>>(new Set());

  const handleHelp = useCallback(
    (card: FavorCard) => {
      if (helpedIds.has(card.id)) return;
      setHelpedIds((prev) => { const next = new Set(prev); next.add(card.id); return next; });
      // Update help count in feed
      setFeed((prev) =>
        prev.map((item) =>
          item.id === card.id && item.type === "favor"
            ? { ...item, helpCount: item.helpCount + 1 }
            : item
        )
      );
      // Open DM with the neighbor
      onOpenDM(card.poster);
    },
    [helpedIds, onOpenDM]
  );

  const handlePostFavor = useCallback((text: string) => {
    if (!text.trim()) return;
    const newFavor: FavorCard = {
      id: `f-${Date.now()}`,
      type: "favor",
      favorType: "need",
      poster: "You",
      floor: "Your floor",
      text: text.trim(),
      time: "Just now",
      helpCount: 0,
      resolved: false,
      isMine: true,
    };
    setFeed((prev) => [newFavor, ...prev]);
    setFavorText("");
  }, []);

  // Listen for post-favor events from the bottom bar composer
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (text) handlePostFavor(text);
    };
    window.addEventListener("post-favor", handler);
    return () => window.removeEventListener("post-favor", handler);
  }, [handlePostFavor]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Feed scroll area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 16px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* Section label */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: T.textTertiary,
            letterSpacing: "0.06em",
            textTransform: "uppercase" as const,
            paddingLeft: 2,
            marginBottom: 2,
          }}
        >
          What's happening in your building
        </div>

        <AnimatePresence initial={false}>
          {feed.map((item) => {
            if (item.type === "favor") {
              return (
                <FavorCardItem
                  key={item.id}
                  card={item}
                  onHelp={handleHelp}
                />
              );
            }
            if (item.type === "listing") {
              return <ListingFeedCardItem key={item.id} card={item} />;
            }
            if (item.type === "service-activity") {
              return <ServiceActivityCardItem key={item.id} card={item} />;
            }
            if (item.type === "pulse") {
              return <BuildingPulseCardItem key={item.id} card={item} />;
            }
            return null;
          })}
        </AnimatePresence>

        {/* Bottom spacer so last card isn't hidden behind bottom bar */}
        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}
