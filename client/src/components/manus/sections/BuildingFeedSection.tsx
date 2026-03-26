/**
 * Section: Building Feed
 * "Your building, alive." — The community layer.
 * Shows the four card types: micro-favor, marketplace listing,
 * service activity (anonymous), and neighbor pulse.
 * This is the daily habit driver and the social moat.
 */

import { motion } from "framer-motion";
import { MessageCircle, ShoppingBag, Zap, Users, Heart, ArrowRight } from "lucide-react";

const feedCards = [
  {
    type: "favor",
    icon: MessageCircle,
    iconColor: "text-sky-400",
    iconBg: "bg-sky-400/10",
    tag: "Micro-Favor",
    tagColor: "text-sky-400 border-sky-400/20",
    title: "Does anyone have a ladder I can borrow?",
    detail: "Unit 1205 · Just for 5 minutes to change a lightbulb!",
    cta: "I can help",
    ctaStyle: "bg-sky-400/10 text-sky-400 hover:bg-sky-400/20",
  },
  {
    type: "listing",
    icon: ShoppingBag,
    iconColor: "text-brand-amber",
    iconBg: "bg-brand-amber/10",
    tag: "Marketplace",
    tagColor: "text-brand-amber border-brand-amber/20",
    title: "Herman Miller Aeron — $450",
    detail: "Unit 1205 · Great condition. Elevator delivery.",
    cta: "Message seller",
    ctaStyle: "bg-brand-amber/10 text-brand-amber hover:bg-brand-amber/20",
  },
  {
    type: "service",
    icon: Zap,
    iconColor: "text-brand-gold",
    iconBg: "bg-brand-gold/10",
    tag: "Building Activity",
    tagColor: "text-brand-gold/70 border-brand-gold/20",
    title: "A neighbor just booked a car detail.",
    detail: "AutoShine Mobile · Saturday at 10 AM in the garage",
    cta: "Book the same",
    ctaStyle: "bg-brand-gold/10 text-brand-gold hover:bg-brand-gold/20",
  },
  {
    type: "pulse",
    icon: Users,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-400/10",
    tag: "Neighbor Pulse",
    tagColor: "text-emerald-400 border-emerald-400/20",
    title: "Neighbors are active right now.",
    detail: "OPUS LA · Your building's private network",
    cta: "View the directory",
    ctaStyle: "bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20",
  },
];

export default function BuildingFeedSection() {
  return (
    <section id="feed" className="relative py-24 lg:py-32">
      <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-20 items-center">

          {/* Left — Copy */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6 border border-brand-gold/20 bg-brand-gold/5">
              <Zap className="w-3.5 h-3.5 text-brand-gold" />
              <span
                className="text-xs text-brand-gold tracking-wide uppercase"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                The Feed
              </span>
            </div>

            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-5"
              style={{ fontFamily: "var(--font-display)", color: "#FAF8F5" }}
            >
              Your building,{" "}
              <span className="text-gradient-gold">alive.</span>
            </h2>

            <p
              className="text-lg leading-relaxed mb-6"
              style={{ color: "rgba(250,248,245,0.5)" }}
            >
              See what's happening in your building — what neighbors are selling, what favors are being asked, and what services are being booked — without the noise of a group chat.
            </p>

            <div className="space-y-3 mb-8">
              {[
                "Real-time activity from your building only",
                "Ask for a favor. Offer one back.",
                "Anonymous service activity shows you what's possible",
              ].map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-brand-gold/15 flex items-center justify-center flex-shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-gold" />
                  </div>
                  <span className="text-sm" style={{ color: "rgba(250,248,245,0.6)" }}>
                    {item}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right — Feed mockup */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            {/* Phone-style feed container */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "oklch(0.14 0.005 60)",
                border: "1px solid oklch(1 0 0 / 8%)",
                boxShadow: "0 25px 60px -15px oklch(0 0 0 / 50%)",
              }}
            >
              {/* Feed header */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid oklch(1 0 0 / 6%)" }}
              >
                <div>
                  <p
                    className="text-sm font-semibold text-white/90"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Building Feed
                  </p>
                  <p
                    className="text-[10px] text-brand-gold/60 mt-0.5"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    OPUS LA · Private
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span
                    className="text-[10px] text-white/30"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    Live
                  </span>
                </div>
              </div>

              {/* Feed cards */}
              <div className="p-3 space-y-2.5">
                {feedCards.map((card, i) => (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                    className="rounded-xl p-4 group cursor-default transition-all duration-300 hover:bg-white/[0.04]"
                    style={{ background: "oklch(1 0 0 / 2.5%)", border: "1px solid oklch(1 0 0 / 5%)" }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${card.iconBg}`}>
                        <card.icon className={`w-4 h-4 ${card.iconColor}`} strokeWidth={1.5} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Tag */}
                        <span
                          className={`inline-block text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border mb-1.5 ${card.tagColor}`}
                          style={{ fontFamily: "var(--font-mono)", background: "oklch(1 0 0 / 3%)" }}
                        >
                          {card.tag}
                        </span>

                        {/* Title */}
                        <p
                          className="text-[13px] font-medium text-white/85 mb-1 leading-snug"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {card.title}
                        </p>

                        {/* Detail */}
                        <p
                          className="text-[11px] text-white/35 mb-2.5"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {card.detail}
                        </p>

                        {/* CTA */}
                        <button
                          type="button"
                          className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors ${card.ctaStyle}`}
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {card.cta}
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Heart on listing */}
                      {card.type === "listing" && (
                        <button
                          type="button"
                          className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        >
                          <Heart className="w-3.5 h-3.5 text-white/40" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Feed footer */}
              <div
                className="px-5 py-3 flex items-center justify-center"
                style={{ borderTop: "1px solid oklch(1 0 0 / 5%)" }}
              >
                <span
                  className="text-[10px] text-white/20"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Private to OPUS LA residents only
                </span>
              </div>
            </div>

            {/* Outer glow */}
            <div className="absolute -inset-8 rounded-[3rem] bg-brand-gold/3 blur-3xl -z-10 pointer-events-none" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
