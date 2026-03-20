/**
 * InboxList — Unified inbox for BLDG.chat resident app
 *
 * Architecture:
 * - Customer Support always pinned at top (gold accent)
 * - Marketplace DMs show listing thumbnail + context
 * - Neighbor conversations for general building chat
 * - Unread badge counts per conversation
 *
 * Design: Warm cream (#FAF8F5) + gold (#C9A961) palette
 * Mobile-first, iOS Messages-inspired layout
 */

import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Headphones,
  ShoppingBag,
  Users,
  Pin,
  Check,
  CheckCheck,
} from "lucide-react";

// ─── Design Tokens (shared with MarketplacePrototype) ───
const T = {
  canvas: "#FAF8F5",
  surface: "#FFFFFF",
  surfaceRaised: "#F5F1EC",
  gold: "#C9A961",
  goldMuted: "rgba(201, 169, 97, 0.08)",
  goldBorder: "rgba(201, 169, 97, 0.20)",
  goldDim: "#B89A55",
  textPrimary: "#1A1A18",
  textSecondary: "rgba(26, 26, 24, 0.55)",
  textTertiary: "rgba(26, 26, 24, 0.35)",
  border: "rgba(26, 26, 24, 0.08)",
  borderMedium: "rgba(26, 26, 24, 0.12)",
  shadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
  radius: 16,
  radiusSm: 10,
  radiusXs: 8,
  font: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif',
  unreadBg: "#C9A961",
  onlineDot: "#4CAF50",
};

const springs = {
  snap: { type: "spring" as const, stiffness: 420, damping: 22, mass: 0.8 },
  micro: { type: "spring" as const, stiffness: 500, damping: 25, mass: 0.5 },
};

// ─── Types ───
export interface Conversation {
  id: string;
  type: "support" | "marketplace" | "neighbor";
  name: string;
  avatar?: string; // URL or single character for initials
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline?: boolean;
  isPinned?: boolean;
  // Marketplace-specific
  listingTitle?: string;
  listingImage?: string;
  listingPrice?: number;
  // Message status
  lastMessageSent?: boolean; // true if last message was from current user
  lastMessageRead?: boolean;
}

// ─── Mock Conversations ───
export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "support",
    type: "support",
    name: "BLDG Support",
    avatar: "B",
    lastMessage: "Hey! I'm here if you need anything. Call or text anytime.",
    lastMessageTime: "2m",
    unreadCount: 1,
    isOnline: true,
    isPinned: true,
  },
  {
    id: "conv-sarah-chair",
    type: "marketplace",
    name: "Sarah",
    avatar: "S",
    lastMessage: "Hi! Is the lounge chair still available?",
    lastMessageTime: "15m",
    unreadCount: 0,
    isOnline: true,
    listingTitle: "Mid-Century Lounge Chair",
    listingImage: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029845795/6mwyUrDqukxWVNyNuZKvJ6/mp-mcm-chair-8AtJu3xcaRmde4UxoGzNHc.webp",
    listingPrice: 275,
    lastMessageSent: true,
    lastMessageRead: false,
  },
  {
    id: "conv-james-peloton",
    type: "marketplace",
    name: "James",
    avatar: "J",
    lastMessage: "Yes, it's in great condition. Want to come see it this evening?",
    lastMessageTime: "1h",
    unreadCount: 2,
    isOnline: false,
    listingTitle: "Peloton Bike+",
    listingImage: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029845795/6mwyUrDqukxWVNyNuZKvJ6/mp-bike-dtSMqyRi5NDcz438ZNJ6rh.webp",
    listingPrice: 650,
    lastMessageSent: false,
  },
  {
    id: "conv-maya-espresso",
    type: "marketplace",
    name: "Maya",
    avatar: "M",
    lastMessage: "I can do $170 if you pick it up today",
    lastMessageTime: "3h",
    unreadCount: 1,
    isOnline: true,
    listingTitle: "Breville Espresso Machine",
    listingImage: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029845795/6mwyUrDqukxWVNyNuZKvJ6/mp-espresso-PKMC6owSHDR3EnZmPkNFtg.webp",
    listingPrice: 195,
    lastMessageSent: false,
  },
  {
    id: "conv-neighbor-alex",
    type: "neighbor",
    name: "Alex · 612",
    avatar: "A",
    lastMessage: "Thanks for the package heads up! 🙏",
    lastMessageTime: "1d",
    unreadCount: 0,
    isOnline: false,
    lastMessageSent: false,
    lastMessageRead: true,
  },
  {
    id: "conv-neighbor-priya",
    type: "neighbor",
    name: "Priya · 1001",
    avatar: "P",
    lastMessage: "The rooftop BBQ was amazing last weekend",
    lastMessageTime: "2d",
    unreadCount: 0,
    isOnline: false,
    lastMessageSent: true,
    lastMessageRead: true,
  },
];

// ─── Avatar Component ───
function ConversationAvatar({
  conversation,
  size = 48,
}: {
  conversation: Conversation;
  size?: number;
}) {
  const isSupport = conversation.type === "support";
  const bgColor = isSupport ? T.gold : T.surfaceRaised;
  const textColor = isSupport ? "#FFFFFF" : T.textPrimary;
  const borderColor = isSupport ? T.gold : T.borderMedium;

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: isSupport ? 14 : "50%",
          background: bgColor,
          border: `1.5px solid ${borderColor}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.38,
          fontWeight: 600,
          color: textColor,
          overflow: "hidden",
        }}
      >
        {isSupport ? (
          <Headphones size={size * 0.42} strokeWidth={1.8} />
        ) : conversation.listingImage ? (
          <img
            src={conversation.listingImage}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          conversation.avatar || conversation.name.charAt(0)
        )}
      </div>
      {/* Online dot */}
      {conversation.isOnline && !isSupport && (
        <div
          style={{
            position: "absolute",
            bottom: 1,
            right: 1,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: T.onlineDot,
            border: `2px solid ${T.canvas}`,
          }}
        />
      )}
      {/* Pinned indicator */}
      {conversation.isPinned && (
        <div
          style={{
            position: "absolute",
            top: -3,
            right: -3,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: T.gold,
            border: `2px solid ${T.canvas}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Pin size={9} color="#FFFFFF" strokeWidth={2.5} fill="#FFFFFF" />
        </div>
      )}
    </div>
  );
}

// ─── Conversation Row ───
function ConversationRow({
  conversation,
  onTap,
}: {
  conversation: Conversation;
  onTap: () => void;
}) {
  const hasUnread = conversation.unreadCount > 0;
  const isSupport = conversation.type === "support";

  return (
    <motion.button
      whileTap={{ scale: 0.98, backgroundColor: T.surfaceRaised }}
      transition={springs.micro}
      onClick={onTap}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        width: "100%",
        padding: "14px 20px",
        background: isSupport ? "rgba(201, 169, 97, 0.03)" : "transparent",
        border: "none",
        borderBottom: `1px solid ${T.border}`,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: T.font,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <ConversationAvatar conversation={conversation} size={50} />

      <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
        {/* Name + time row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontSize: 15,
                fontWeight: hasUnread ? 600 : 500,
                color: T.textPrimary,
                letterSpacing: "-0.01em",
              }}
            >
              {conversation.name}
            </span>
            {isSupport && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: T.gold,
                  background: T.goldMuted,
                  border: `1px solid ${T.goldBorder}`,
                  padding: "1px 6px",
                  borderRadius: 4,
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                }}
              >
                HUMAN
              </span>
            )}
          </div>
          <span
            style={{
              fontSize: 12,
              color: hasUnread ? T.gold : T.textTertiary,
              fontWeight: hasUnread ? 500 : 400,
              flexShrink: 0,
            }}
          >
            {conversation.lastMessageTime}
          </span>
        </div>

        {/* Listing context (marketplace only) */}
        {conversation.type === "marketplace" && conversation.listingTitle && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px 2px 2px",
              borderRadius: 6,
              background: T.surfaceRaised,
              marginBottom: 4,
              maxWidth: "100%",
            }}
          >
            <ShoppingBag size={11} color={T.gold} strokeWidth={2} />
            <span
              style={{
                fontSize: 11,
                color: T.textSecondary,
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {conversation.listingTitle}
              {conversation.listingPrice && ` · $${conversation.listingPrice}`}
            </span>
          </div>
        )}

        {/* Last message */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {/* Read receipt */}
          {conversation.lastMessageSent && (
            <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
              {conversation.lastMessageRead ? (
                <CheckCheck size={14} color={T.gold} strokeWidth={2} />
              ) : (
                <Check size={14} color={T.textTertiary} strokeWidth={2} />
              )}
            </span>
          )}
          <span
            style={{
              fontSize: 14,
              lineHeight: 1.4,
              color: hasUnread ? T.textPrimary : T.textSecondary,
              fontWeight: hasUnread ? 500 : 400,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {conversation.lastMessage}
          </span>
        </div>
      </div>

      {/* Unread badge */}
      {hasUnread && (
        <div
          style={{
            flexShrink: 0,
            minWidth: 22,
            height: 22,
            borderRadius: 11,
            background: T.gold,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 6px",
            marginTop: 16,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: "#FFFFFF" }}>
            {conversation.unreadCount}
          </span>
        </div>
      )}
    </motion.button>
  );
}

// ─── Section Header ───
function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "16px 20px 6px",
      }}
    >
      {icon}
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: T.textTertiary,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </span>
    </div>
  );
}

// ─── Main InboxList Component ───
export default function InboxList({
  conversations,
  onSelectConversation,
  onBack,
}: {
  conversations: Conversation[];
  onSelectConversation: (conv: Conversation) => void;
  onBack: () => void;
}) {
  const pinned = conversations.filter((c) => c.isPinned);
  const marketplace = conversations.filter((c) => c.type === "marketplace" && !c.isPinned);
  const neighbors = conversations.filter((c) => c.type === "neighbor" && !c.isPinned);
  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        position: "fixed",
        inset: 0,
        maxWidth: 430,
        margin: "0 auto",
        background: T.canvas,
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        fontFamily: T.font,
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: `1px solid ${T.border}`,
          background: T.canvas,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: T.surfaceRaised,
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={18} strokeWidth={1.8} color={T.textPrimary} />
          </motion.button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: T.textPrimary, margin: 0, letterSpacing: "-0.02em" }}>
              Messages
            </h1>
            {totalUnread > 0 && (
              <span style={{ fontSize: 12, color: T.gold, fontWeight: 500 }}>
                {totalUnread} unread
              </span>
            )}
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: T.surfaceRaised,
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Search size={18} strokeWidth={1.8} color={T.textSecondary} />
        </motion.button>
      </header>

      {/* Conversation List */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Pinned (Support) */}
        {pinned.length > 0 && (
          <>
            {pinned.map((conv) => (
              <ConversationRow
                key={conv.id}
                conversation={conv}
                onTap={() => onSelectConversation(conv)}
              />
            ))}
          </>
        )}

        {/* Marketplace DMs */}
        {marketplace.length > 0 && (
          <>
            <SectionHeader
              title="Marketplace"
              icon={<ShoppingBag size={12} color={T.textTertiary} strokeWidth={2} />}
            />
            {marketplace.map((conv) => (
              <ConversationRow
                key={conv.id}
                conversation={conv}
                onTap={() => onSelectConversation(conv)}
              />
            ))}
          </>
        )}

        {/* Neighbors */}
        {neighbors.length > 0 && (
          <>
            <SectionHeader
              title="Neighbors"
              icon={<Users size={12} color={T.textTertiary} strokeWidth={2} />}
            />
            {neighbors.map((conv) => (
              <ConversationRow
                key={conv.id}
                conversation={conv}
                onTap={() => onSelectConversation(conv)}
              />
            ))}
          </>
        )}

        {/* Empty state */}
        {conversations.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              paddingTop: 80,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: T.goldMuted,
                border: `1px solid ${T.goldBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Search size={24} color={T.gold} strokeWidth={1.5} />
            </div>
            <div style={{ textAlign: "center", maxWidth: 240 }}>
              <div style={{ fontSize: 16, fontWeight: 500, color: T.textPrimary, marginBottom: 4 }}>
                No messages yet
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.5, color: T.textTertiary }}>
                Start a conversation from the marketplace or ask the concierge for help.
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
