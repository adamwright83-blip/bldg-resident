/**
 * ServiceChatThread — AI concierge chat for service tile taps
 *
 * Design: Warm cream (#FAF8F5) + gold (#C9A961) palette.
 * Mobile-first, iOS Messages-inspired layout.
 *
 * Features:
 * - Animated BLDG logo next to AI response bubbles
 * - Service-specific opening message from AI
 * - Typing indicator before AI responds
 * - Back button returns to service tiles
 * - Simulated AI responses for demo purposes
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Check, CheckCheck } from "lucide-react";
import LivingBuilding from "./LivingBuilding";

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
};

const springs = {
  micro: { type: "spring" as const, stiffness: 500, damping: 25, mass: 0.5 },
  message: { type: "spring" as const, stiffness: 380, damping: 24, mass: 0.7 },
  slide: { type: "spring" as const, stiffness: 340, damping: 28, mass: 1.0 },
};

// ─── Service-specific AI opening messages ───
const SERVICE_OPENERS: Record<string, { greeting: string; followUps: string[] }> = {
  Laundry: {
    greeting: "Hi! I can schedule a laundry pickup for you. CleanLux picks up from your door — next available is **tomorrow between 9–11am**. Want me to book that?",
    followUps: [
      "Perfect! I've booked CleanLux for tomorrow 9–11am. They'll text you 30 min before arrival. Anything else?",
      "Got it! I'll note that preference. Anything special about this load — delicates, dry-clean items?",
      "On it! I'll add that to your booking notes.",
    ],
  },
  "Dry Clean": {
    greeting: "I can arrange dry cleaning pickup. **Prestige Cleaners** serves our building — they do same-day if dropped off by 10am. When works for you?",
    followUps: [
      "Booked! Prestige Cleaners will pick up tomorrow morning. They'll leave a receipt under your door.",
      "Noted! I'll schedule a morning pickup. Any specific items to mention?",
    ],
  },
  "Dog Groom": {
    greeting: "Tail wags incoming! 🐾 **Paws & Claws** does in-building grooming — they come to you. Next opening is **Thursday 2pm**. Shall I book it?",
    followUps: [
      "Booked! Paws & Claws will be at your door Thursday at 2pm. What's your pup's name so they can greet them properly?",
      "Got it! I'll note that. Any special grooming requests or sensitivities?",
    ],
  },
  "Car Detail": {
    greeting: "Your car will be showroom-ready. **AutoShine Mobile** details in the garage — next slot is **Saturday 10am**. Want me to reserve it?",
    followUps: [
      "Reserved! AutoShine will meet you in the garage Saturday at 10am. What's your parking spot number?",
      "Perfect, I'll add that to the booking. Interior detail included?",
    ],
  },
  Cleaning: {
    greeting: "I can book a cleaning for your unit. **Sparkle Pro** has a 4.9★ rating in our building — next available is **Friday 11am–2pm**. Book it?",
    followUps: [
      "Booked! Sparkle Pro will arrive Friday between 11am–2pm. They'll text you when they're 20 min away.",
      "Got it! I'll note that for the team. Any areas to prioritize?",
    ],
  },
  Handyman: {
    greeting: "What needs fixing? **FixIt Pro** handles everything from hanging art to furniture assembly. Describe what you need and I'll get them scheduled.",
    followUps: [
      "On it! I'll send FixIt Pro the details. They'll confirm a time within the hour.",
      "Got it — that sounds like about a 1-hour job. Next available is tomorrow afternoon. Works?",
    ],
  },
  Assembly: {
    greeting: "Got a flat-pack situation? **BuildRight** assembles anything — IKEA, Wayfair, you name it. What are you putting together?",
    followUps: [
      "Easy! BuildRight can handle that. Next slot is tomorrow evening. Want me to book it?",
      "Perfect — I'll send them the item details. They'll bring all the tools.",
    ],
  },
  Maintenance: {
    greeting: "What's the issue? I can log a maintenance request and get the right person on it — plumbing, electrical, HVAC, or general repairs.",
    followUps: [
      "Logged! I've flagged this as priority. Building maintenance will be in touch within 2 hours.",
      "Got it. I'll escalate this to the building team right away.",
    ],
  },
};

// ─── Message type ───
interface Message {
  id: string;
  text: string;
  sent: boolean;
  time: string;
  read?: boolean;
  isAI?: boolean;
}

// ─── Small animated BLDG logo for AI bubbles ───
function AIAvatar() {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        overflow: "hidden",
        flexShrink: 0,
        alignSelf: "flex-end",
        marginBottom: 2,
      }}
    >
      <LivingBuilding size={28} idle />
    </div>
  );
}

// ─── Typing Indicator ───
function TypingIndicator() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 8,
        padding: "4px 16px 8px",
      }}
    >
      <AIAvatar />
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
    </div>
  );
}

// ─── Chat Bubble ───
function ChatBubble({
  message,
  isLast,
}: {
  message: Message;
  isLast: boolean;
}) {
  const isSent = message.sent;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={springs.message}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 8,
        padding: "2px 16px",
        justifyContent: isSent ? "flex-end" : "flex-start",
      }}
    >
      {/* AI avatar for received messages */}
      {!isSent && <AIAvatar />}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: isSent ? "flex-end" : "flex-start",
          maxWidth: "78%",
        }}
      >
        <div
          style={{
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
          // Render markdown-style **bold** text
          dangerouslySetInnerHTML={{
            __html: message.text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
          }}
        />
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
      </div>

      {/* Spacer for sent messages to balance layout */}
      {isSent && <div style={{ width: 28, flexShrink: 0 }} />}
    </motion.div>
  );
}

// ─── Service Chat Header ───
function ServiceChatHeader({
  serviceLabel,
  onBack,
}: {
  serviceLabel: string;
  onBack: () => void;
}) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderBottom: `1px solid ${T.border}`,
        background: T.canvas,
        flexShrink: 0,
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

      {/* BLDG logo avatar */}
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <LivingBuilding size={38} idle />
      </div>

      {/* Name + service context */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: T.textPrimary,
            letterSpacing: "-0.01em",
          }}
        >
          BLDG Concierge
        </div>
        <div
          style={{
            fontSize: 12,
            color: T.gold,
            fontWeight: 500,
            marginTop: 1,
          }}
        >
          {serviceLabel} · AI-powered
        </div>
      </div>

      {/* AI badge */}
      <div
        style={{
          padding: "4px 10px",
          borderRadius: 20,
          background: T.goldMuted,
          border: `1px solid ${T.goldBorder}`,
          fontSize: 11,
          fontWeight: 600,
          color: T.goldDim,
          letterSpacing: "0.04em",
          flexShrink: 0,
        }}
      >
        AI
      </div>
    </header>
  );
}

// ─── Main ServiceChatThread Component ───
export default function ServiceChatThread({
  serviceLabel,
  onBack,
}: {
  serviceLabel: string;
  onBack: () => void;
}) {
  const opener = SERVICE_OPENERS[serviceLabel] || SERVICE_OPENERS["Handyman"];
  const followUps = opener.followUps;
  const followUpIndexRef = useRef(0);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showTyping, setShowTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Show opening AI message after a brief delay
  useEffect(() => {
    const t = setTimeout(() => {
      setMessages([
        {
          id: "ai-open",
          text: opener.greeting,
          sent: false,
          time: "Just now",
          isAI: true,
        },
      ]);
    }, 200);
    return () => clearTimeout(t);
  }, [opener.greeting]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showTyping]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      text: inputValue.trim(),
      sent: true,
      time: "Just now",
      read: false,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");

    // Simulate AI typing then responding
    setShowTyping(true);
    setTimeout(() => {
      setShowTyping(false);
      const idx = followUpIndexRef.current % followUps.length;
      followUpIndexRef.current += 1;
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          text: followUps[idx],
          sent: false,
          time: "Just now",
          isAI: true,
        },
      ]);
    }, 2200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={springs.slide}
      style={{
        position: "fixed",
        inset: 0,
        maxWidth: 430,
        margin: "0 auto",
        background: T.canvas,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        fontFamily: T.font,
        overflow: "hidden",
      }}
    >
      <ServiceChatHeader serviceLabel={serviceLabel} onBack={onBack} />

      {/* Messages area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          paddingTop: 12,
          paddingBottom: 16,
          WebkitOverflowScrolling: "touch",
        }}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <ChatBubble
              key={msg.id}
              message={msg}
              isLast={i === messages.length - 1}
            />
          ))}
        </AnimatePresence>

        {showTyping && <TypingIndicator />}
      </div>

      {/* Composer */}
      <div
        style={{
          padding: "10px 16px",
          paddingBottom: "max(14px, env(safe-area-inset-bottom))",
          borderTop: `1px solid ${T.border}`,
          background: T.canvas,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            padding: "10px 14px",
            borderRadius: T.radiusSm,
            border: `1px solid ${T.border}`,
            background: T.surface,
            gap: 8,
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={`Ask about ${serviceLabel.toLowerCase()}...`}
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
          whileTap={{ scale: 0.9 }}
          onClick={handleSend}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: inputValue.trim() ? T.gold : T.surfaceRaised,
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: inputValue.trim() ? "pointer" : "default",
            transition: "background 0.15s ease",
            flexShrink: 0,
          }}
        >
          <Send
            size={17}
            color={inputValue.trim() ? "#FFFFFF" : T.textTertiary}
          />
        </motion.button>
      </div>
    </motion.div>
  );
}
