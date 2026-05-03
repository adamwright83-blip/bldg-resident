/**
 * ChatDemo — Living, animated chat interface that demonstrates BLDG.chat's service coordination.
 * Design: Frosted glass panel with spring-physics message animations.
 * The chat cycles through real service request scenarios.
 * Color: Gold (#C9A961) accent palette on warm dark background.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CheckCheck, Sparkles } from "lucide-react";

interface ChatMessage {
  id: number;
  type: "user" | "ai";
  text: string;
  time: string;
  status?: "sent" | "delivered" | "read";
}

const conversations: ChatMessage[][] = [
  [
    { id: 1, type: "user", text: "I need a laundry pickup today", time: "2:34 PM", status: "read" },
    { id: 2, type: "ai", text: "I've scheduled a laundry pickup for today between 4–6 PM. Laundry Butler will come to unit 1204. You'll get a text when they're in the lobby.", time: "2:34 PM" },
  ],
  [
    { id: 1, type: "user", text: "Can someone groom my dog this week?", time: "10:15 AM", status: "read" },
    { id: 2, type: "ai", text: "Paws & Co. has Thursday at 11 AM open. They'll come to your unit with full mobile grooming. Should I confirm?", time: "10:15 AM" },
    { id: 3, type: "user", text: "Yes, book it!", time: "10:16 AM", status: "read" },
    { id: 4, type: "ai", text: "Done! Thursday 11 AM confirmed. You'll receive a reminder the morning of.", time: "10:16 AM" },
  ],
  [
    { id: 1, type: "user", text: "My kitchen faucet is dripping", time: "8:22 AM", status: "read" },
    { id: 2, type: "ai", text: "I'll get a handyman out to you. FixIt Pro is available tomorrow 9–11 AM. They specialize in plumbing. Want me to book it?", time: "8:22 AM" },
  ],
  [
    { id: 1, type: "user", text: "Need my car detailed in the garage", time: "6:45 PM", status: "read" },
    { id: 2, type: "ai", text: "AutoShine Mobile can detail your car Saturday morning in spot P2-47. Full interior + exterior package. Confirmed!", time: "6:45 PM" },
  ],
];

export default function ChatDemo() {
  const [currentConvo, setCurrentConvo] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState<number>(0);
  const [isTyping, setIsTyping] = useState(false);

  const messages = conversations[currentConvo];

  const advanceMessages = useCallback(() => {
    if (visibleMessages < messages.length) {
      // Show typing indicator before AI messages
      if (messages[visibleMessages].type === "ai") {
        setIsTyping(true);
        const typingTimer = setTimeout(() => {
          setIsTyping(false);
          setVisibleMessages((v) => v + 1);
        }, 1200);
        return () => clearTimeout(typingTimer);
      } else {
        setVisibleMessages((v) => v + 1);
      }
    }
  }, [visibleMessages, messages]);

  useEffect(() => {
    if (visibleMessages < messages.length) {
      const delay = visibleMessages === 0 ? 600 : 1800;
      const timer = setTimeout(advanceMessages, delay);
      return () => clearTimeout(timer);
    } else {
      // Cycle to next conversation after a pause
      const cycleTimer = setTimeout(() => {
        setCurrentConvo((c) => (c + 1) % conversations.length);
        setVisibleMessages(0);
      }, 4000);
      return () => clearTimeout(cycleTimer);
    }
  }, [visibleMessages, messages.length, advanceMessages]);

  // Reset when conversation changes
  useEffect(() => {
    setVisibleMessages(0);
    setIsTyping(false);
  }, [currentConvo]);

  return (
    <div className="relative w-full max-w-[420px]">
      {/* Outer glow */}
      <div className="absolute -inset-4 rounded-3xl bg-brand-gold/5 blur-2xl" />

      {/* Chat window */}
      <div className="relative glass-strong rounded-2xl overflow-hidden shadow-2xl shadow-black/30">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-gold to-brand-gold-dim flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-brand-dark" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-brand-dark-light" />
          </div>
          <div>
            <p className="text-sm font-medium text-white" style={{ fontFamily: "var(--font-display)" }}>
              BLDG.chat
            </p>
            <p className="text-xs text-brand-gold" style={{ fontFamily: "var(--font-mono)" }}>
              AI Concierge • Online
            </p>
          </div>
          {/* Conversation indicator dots */}
          <div className="ml-auto flex gap-1.5">
            {conversations.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                  i === currentConvo ? "bg-brand-gold w-4" : "bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Messages area */}
        <div className="px-4 py-4 space-y-3 min-h-[240px] max-h-[320px] overflow-hidden">
          <AnimatePresence mode="popLayout">
            {messages.slice(0, visibleMessages).map((msg) => (
              <motion.div
                key={`${currentConvo}-${msg.id}`}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{
                  type: "spring" as const,
                  stiffness: 300,
                  damping: 25,
                  mass: 0.8,
                }}
                className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl ${
                    msg.type === "user"
                      ? "bg-brand-gold/20 border border-brand-gold/30 rounded-br-md"
                      : "bg-white/8 border border-white/8 rounded-bl-md"
                  }`}
                >
                  <p className="text-[13px] leading-relaxed text-white/90">{msg.text}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span
                      className="text-[10px] text-white/30"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {msg.time}
                    </span>
                    {msg.type === "user" && msg.status === "read" && (
                      <CheckCheck className="w-3 h-3 text-brand-gold" />
                    )}
                    {msg.type === "user" && msg.status === "delivered" && (
                      <CheckCheck className="w-3 h-3 text-white/30" />
                    )}
                    {msg.type === "user" && msg.status === "sent" && (
                      <Check className="w-3 h-3 text-white/30" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="flex justify-start"
              >
                <div className="bg-white/8 border border-white/8 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-brand-gold/60"
                        animate={{ y: [0, -6, 0] }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          delay: i * 0.15,
                          ease: "easeInOut",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input bar */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-4 py-3">
            <span className="text-sm text-white/30 flex-1">Type what you need...</span>
            <div className="w-7 h-7 rounded-lg bg-brand-gold/20 flex items-center justify-center">
              <svg
                className="w-3.5 h-3.5 text-brand-gold"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
