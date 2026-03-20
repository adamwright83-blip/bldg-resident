/**
 * ConversationThread — Individual chat thread for BLDG.chat
 *
 * Features:
 * - Chat bubbles with sent/received styling
 * - Listing context card at top (for marketplace conversations)
 * - Typing indicator
 * - Message composer with send button
 * - Support conversation has AI badge
 * - Read receipts (double check)
 *
 * Design: Warm cream (#FAF8F5) + gold (#C9A961) palette
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Phone,
  MoreHorizontal,
  Send,
  ShoppingBag,
  Headphones,
  Check,
  CheckCheck,
  Image as ImageIcon,
  Camera,
  ChevronRight,
} from "lucide-react";
import type { Conversation } from "./InboxList";

// ─── Design Tokens ───
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
  radius: 16,
  radiusSm: 10,
  radiusXs: 8,
  font: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif',
  sentBubble: "#C9A961",
  sentText: "#FFFFFF",
  receivedBubble: "#FFFFFF",
  receivedText: "#1A1A18",
  onlineDot: "#4CAF50",
};

const springs = {
  micro: { type: "spring" as const, stiffness: 500, damping: 25, mass: 0.5 },
  message: { type: "spring" as const, stiffness: 380, damping: 24, mass: 0.7 },
};

// ─── Types ───
export interface Message {
  id: string;
  text: string;
  sent: boolean; // true = current user sent it
  time: string;
  read?: boolean;
}

// ─── Mock Messages per conversation type ───
export function getMockMessages(conversation: Conversation): Message[] {
  if (conversation.type === "support") {
    return [
      { id: "s1", text: "Hey, is there a way to get a package redelivered? FedEx left it at the wrong door.", sent: true, time: "10:30 AM", read: true },
      { id: "s2", text: "Hey! Yeah I can help with that. What's the tracking number? I'll call FedEx directly and get it sorted.", sent: false, time: "10:32 AM" },
      { id: "s3", text: "Thanks! It's 7891 2345 6789", sent: true, time: "10:33 AM", read: true },
      { id: "s4", text: "Got it. I just called them \u2014 they're rerouting it to your unit. Should arrive by 4pm today. Let me know if it doesn't show up!", sent: false, time: "10:41 AM" },
      { id: "s5", text: "Hey! I'm here if you need anything. Call or text anytime.", sent: false, time: "10:42 AM" },
    ];
  }

  if (conversation.id === "conv-sarah-chair") {
    return [
      { id: "m1", text: "Hi! Is the lounge chair still available?", sent: true, time: "3:15 PM", read: true },
    ];
  }

  if (conversation.id === "conv-james-peloton") {
    return [
      { id: "m1", text: "Hi James! I'm interested in the Peloton. How many rides does it have?", sent: true, time: "1:00 PM", read: true },
      { id: "m2", text: "Hey! It has about 180 rides. Still works perfectly.", sent: false, time: "1:05 PM" },
      { id: "m3", text: "Would you take $600?", sent: true, time: "1:10 PM", read: true },
      { id: "m4", text: "I could do $620 — it includes all the accessories and I'll help move it.", sent: false, time: "1:15 PM" },
      { id: "m5", text: "Yes, it's in great condition. Want to come see it this evening?", sent: false, time: "1:20 PM" },
    ];
  }

  if (conversation.id === "conv-maya-espresso") {
    return [
      { id: "m1", text: "Hi Maya! Would you consider $170 for the espresso machine?", sent: true, time: "11:00 AM", read: true },
      { id: "m2", text: "I can do $170 if you pick it up today", sent: false, time: "11:45 AM" },
    ];
  }

  if (conversation.id === "conv-neighbor-alex") {
    return [
      { id: "m1", text: "Hey Alex, heads up — there's a package at the front desk with your name on it", sent: true, time: "Yesterday", read: true },
      { id: "m2", text: "Thanks for the package heads up! 🙏", sent: false, time: "Yesterday" },
    ];
  }

  if (conversation.id === "conv-neighbor-priya") {
    return [
      { id: "m1", text: "The rooftop BBQ was amazing last weekend", sent: false, time: "2 days ago" },
      { id: "m2", text: "Right?! We should do it again soon. Maybe next Saturday?", sent: true, time: "2 days ago", read: true },
    ];
  }

  return [];
}

// ─── Listing Context Card ───
function ListingContextCard({ conversation }: { conversation: Conversation }) {
  if (conversation.type !== "marketplace" || !conversation.listingTitle) return null;

  return (
    <div
      style={{
        margin: "12px 16px",
        padding: 10,
        borderRadius: T.radiusSm,
        background: T.surface,
        border: `1px solid ${T.border}`,
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
      }}
    >
      {conversation.listingImage && (
        <img
          src={conversation.listingImage}
          alt=""
          style={{
            width: 52,
            height: 52,
            borderRadius: 8,
            objectFit: "cover",
            flexShrink: 0,
          }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: T.textPrimary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {conversation.listingTitle}
        </div>
        {conversation.listingPrice && (
          <div style={{ fontSize: 15, fontWeight: 600, color: T.gold, marginTop: 2 }}>
            ${conversation.listingPrice}
          </div>
        )}
      </div>
      <ChevronRight size={16} color={T.textTertiary} />
    </div>
  );
}

// ─── Chat Bubble ───
function ChatBubble({ message, isLast }: { message: Message; isLast: boolean }) {
  const isSent = message.sent;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={springs.message}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isSent ? "flex-end" : "flex-start",
        padding: "2px 16px",
      }}
    >
      <div
        style={{
          maxWidth: "78%",
          padding: "10px 14px",
          borderRadius: 18,
          borderBottomRightRadius: isSent ? 6 : 18,
          borderBottomLeftRadius: isSent ? 18 : 6,
          background: isSent ? T.sentBubble : T.receivedBubble,
          color: isSent ? T.sentText : T.receivedText,
          fontSize: 15,
          lineHeight: 1.45,
          fontFamily: T.font,
          boxShadow: isSent
            ? "0 1px 3px rgba(201, 169, 97, 0.15)"
            : "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        {message.text}
      </div>
      {/* Time + read receipt */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 3,
          marginTop: 3,
          padding: isSent ? "0 4px 0 0" : "0 0 0 4px",
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: T.textTertiary,
            fontFamily: "SF Mono, ui-monospace, monospace",
          }}
        >
          {message.time}
        </span>
        {isSent && (
          <span style={{ display: "flex", alignItems: "center" }}>
            {message.read ? (
              <CheckCheck size={13} color={T.gold} strokeWidth={2} />
            ) : (
              <Check size={13} color={T.textTertiary} strokeWidth={2} />
            )}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Typing Indicator ───
function TypingIndicator({ name }: { name: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 16px 8px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "10px 16px",
          borderRadius: 18,
          borderBottomLeftRadius: 6,
          background: T.receivedBubble,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
            }}
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: T.textTertiary,
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 12, color: T.textTertiary }}>
        {name} is typing...
      </span>
    </div>
  );
}

// ─── Main ConversationThread Component ───
export default function ConversationThread({
  conversation,
  onBack,
}: {
  conversation: Conversation;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showTyping, setShowTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load mock messages
  useEffect(() => {
    setMessages(getMockMessages(conversation));
  }, [conversation.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showTyping]);

  // Send message handler
  const handleSend = () => {
    if (!inputValue.trim()) return;

    const newMsg: Message = {
      id: `user-${Date.now()}`,
      text: inputValue.trim(),
      sent: true,
      time: "Just now",
      read: false,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputValue("");

    // Simulate typing response for support (human customer service)
    if (conversation.type === "support") {
      setShowTyping(true);
      setTimeout(() => {
        setShowTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `cs-${Date.now()}`,
            text: "Got it! Let me look into that for you. If it's urgent, feel free to call me directly at (323) 807-4661.",
            sent: false,
            time: "Just now",
          },
        ]);
      }, 3000);
    }
  };

  const isSupport = conversation.type === "support";
  const displayName = conversation.name;

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
        zIndex: 70,
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
          gap: 12,
          padding: "12px 16px",
          borderBottom: `1px solid ${T.border}`,
          background: T.canvas,
        }}
      >
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
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={18} strokeWidth={1.8} color={T.textPrimary} />
        </motion.button>

        {/* Avatar */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: isSupport ? 11 : "50%",
              background: isSupport ? T.gold : T.surfaceRaised,
              border: `1.5px solid ${isSupport ? T.gold : T.borderMedium}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              fontWeight: 600,
              color: isSupport ? "#FFFFFF" : T.textPrimary,
              overflow: "hidden",
            }}
          >
            {isSupport ? (
              <Headphones size={18} strokeWidth={1.8} />
            ) : conversation.listingImage ? (
              <img
                src={conversation.listingImage}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              conversation.avatar || conversation.name.charAt(0)
            )}
          </div>
          {conversation.isOnline && !isSupport && (
            <div
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: T.onlineDot,
                border: `2px solid ${T.canvas}`,
              }}
            />
          )}
        </div>

        {/* Name + status */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: T.textPrimary, letterSpacing: "-0.01em" }}>
              {displayName}
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
          <span style={{ fontSize: 12, color: conversation.isOnline ? T.onlineDot : T.textTertiary }}>
            {conversation.isOnline ? "Online" : "Offline"}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 4 }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => window.open("tel:+13238074661", "_self")}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: isSupport ? T.goldMuted : T.surfaceRaised,
              border: isSupport ? `1px solid ${T.goldBorder}` : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Phone size={16} strokeWidth={1.8} color={isSupport ? T.gold : T.textSecondary} />
          </motion.button>
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
            <MoreHorizontal size={16} strokeWidth={1.8} color={T.textSecondary} />
          </motion.button>
        </div>
      </header>

      {/* Listing Context Card */}
      <ListingContextCard conversation={conversation} />

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          paddingTop: 8,
          paddingBottom: 8,
        }}
      >
        {/* Date separator */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "8px 0 12px",
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: T.textTertiary,
              background: T.surfaceRaised,
              padding: "4px 12px",
              borderRadius: 10,
              fontWeight: 500,
            }}
          >
            Today
          </span>
        </div>

        {messages.map((msg, i) => (
          <ChatBubble
            key={msg.id}
            message={msg}
            isLast={i === messages.length - 1}
          />
        ))}

        {showTyping && <TypingIndicator name={displayName} />}
      </div>

      {/* Composer */}
      <div
        style={{
          borderTop: `1px solid ${T.border}`,
          padding: "10px 16px",
          paddingBottom: "max(10px, env(safe-area-inset-bottom))",
          background: T.canvas,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
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
              flexShrink: 0,
            }}
          >
            <Camera size={18} strokeWidth={1.5} color={T.textSecondary} />
          </motion.button>

          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 12px",
              borderRadius: 20,
              border: `1px solid ${T.border}`,
              background: T.surface,
              transition: "border-color 0.15s",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isSupport ? "Ask the concierge..." : `Message ${conversation.name.split(" ")[0]}...`}
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                fontSize: 15,
                color: T.textPrimary,
                fontFamily: T.font,
                outline: "none",
              }}
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleSend}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: inputValue.trim() ? T.gold : T.surfaceRaised,
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: inputValue.trim() ? "pointer" : "default",
              flexShrink: 0,
              transition: "background 0.15s",
            }}
          >
            <Send
              size={16}
              color={inputValue.trim() ? "#FFFFFF" : T.textTertiary}
              strokeWidth={2}
              style={{ marginLeft: 1 }}
            />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
