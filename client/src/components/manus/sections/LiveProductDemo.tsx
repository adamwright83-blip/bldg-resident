/**
 * Section 4: Live Product Demo
 * Expanded chat demo showing a complete service flow from request to confirmation.
 * The demo IS the copy. Centered, larger, with phone frame mockup.
 * Color: Gold accent on warm dark.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { CheckCheck, Sparkles, RotateCcw } from "lucide-react";

interface DemoMessage {
  id: number;
  type: "user" | "ai";
  text: string;
  time: string;
}

const demoFlow: DemoMessage[] = [
  { id: 1, type: "user", text: "I need my car detailed this weekend", time: "Sat 9:12 AM" },
  { id: 2, type: "ai", text: "AutoShine Mobile has Saturday 10 AM available in your garage spot. Full interior + exterior. $85. Should I book it?", time: "Sat 9:12 AM" },
  { id: 3, type: "user", text: "Yes, book it", time: "Sat 9:13 AM" },
  { id: 4, type: "ai", text: "Confirmed! Saturday 10 AM, spot P2-47. You'll get a reminder tomorrow morning and a text when they arrive at the garage.", time: "Sat 9:13 AM" },
  { id: 5, type: "ai", text: "🚗 Update: AutoShine just arrived at P2-47. Estimated completion: 1.5 hours. We'll let you know when it's done.", time: "Sat 10:02 AM" },
  { id: 6, type: "ai", text: "✨ Your car is ready! AutoShine left a detail report in your messages. Rate your experience?", time: "Sat 11:28 AM" },
];

export default function LiveProductDemo() {
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [started, setStarted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  // Start the animation when the section enters the viewport
  useEffect(() => {
    if (isInView && !started) {
      setStarted(true);
      setVisibleMessages(0);
    }
  }, [isInView, started]);

  // Advance messages one at a time
  useEffect(() => {
    if (!started) return;
    if (visibleMessages >= demoFlow.length) return;

    const nextMsg = demoFlow[visibleMessages];
    const delay = visibleMessages === 0 ? 800 : 1800;

    const timer = setTimeout(() => {
      if (nextMsg.type === "ai") {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setVisibleMessages((v) => v + 1);
        }, 1200);
      } else {
        setVisibleMessages((v) => v + 1);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [visibleMessages, started]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages, isTyping]);

  const restart = () => {
    setVisibleMessages(0);
    setIsTyping(false);
    // Small delay then restart
    setTimeout(() => setStarted(true), 200);
  };

  return (
    <section className="relative py-24 lg:py-32">
      <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 lg:mb-16"
        >
          <p
            className="text-xs uppercase tracking-wider text-brand-gold/70 mb-4"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            A real service flow
          </p>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "#FAF8F5" }}
          >
            Watch it <span className="text-gradient-gold">work.</span>
          </h2>
        </motion.div>

        {/* Demo container */}
        <div ref={containerRef} className="flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="relative w-full max-w-[480px]"
          >
            {/* Phone frame */}
            <div className="relative rounded-[2rem] border border-white/10 bg-brand-dark-light/50 p-2 shadow-2xl shadow-black/40">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-brand-dark rounded-b-2xl z-10" />

              {/* Screen */}
              <div className="rounded-[1.5rem] overflow-hidden bg-brand-dark">
                {/* Chat header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-gold to-brand-gold-dim flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-brand-dark" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-brand-dark" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white" style={{ fontFamily: "var(--font-display)" }}>
                      BLDG.chat
                    </p>
                    <p className="text-xs text-brand-gold" style={{ fontFamily: "var(--font-mono)" }}>
                      AI Concierge • Online
                    </p>
                  </div>
                  {/* Restart button */}
                  {visibleMessages >= demoFlow.length && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={restart}
                      className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-white/40" />
                    </motion.button>
                  )}
                </div>

                {/* Messages */}
                <div className="px-4 py-4 space-y-3 min-h-[380px] max-h-[420px] overflow-y-auto">
                  <AnimatePresence mode="popLayout">
                    {demoFlow.slice(0, visibleMessages).map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
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
                            {msg.type === "user" && (
                              <CheckCheck className="w-3 h-3 text-brand-gold" />
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
                  <div ref={messagesEndRef} />
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

            {/* Outer glow */}
            <div className="absolute -inset-8 rounded-[3rem] bg-brand-gold/5 blur-3xl -z-10" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
