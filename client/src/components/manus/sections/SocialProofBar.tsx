/**
 * Section 1: Social Proof Strip
 * Activity signals — platform quality, not deployment count.
 * Framed as "Serving residents across Los Angeles" with rating + CTA reinforcement.
 * Pattern: Fast-scan trust strip, no images, text-only.
 */

import { motion } from "framer-motion";
import { Star, MapPin, Zap } from "lucide-react";

const signals = [
  {
    icon: MapPin,
    text: "Serving residents across Los Angeles",
  },
  {
    icon: Star,
    text: "4.9 average resident rating",
  },
  {
    icon: Zap,
    text: "Request any service, anytime",
  },
];

export default function SocialProofBar() {
  return (
    <section className="relative py-5 border-t border-b border-white/5 overflow-hidden">
      {/* Subtle gold gradient glow */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          background:
            "linear-gradient(90deg, transparent, #C9A961 50%, transparent)",
        }}
      />

      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 lg:gap-16">
          {signals.map((signal, i) => (
            <motion.div
              key={signal.text}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="flex items-center gap-2.5"
            >
              <signal.icon
                className="w-3.5 h-3.5 text-brand-gold/60 shrink-0"
                strokeWidth={1.5}
              />
              <p
                className="text-xs sm:text-sm tracking-wide whitespace-nowrap"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "rgba(250,248,245,0.45)",
                  letterSpacing: "0.04em",
                }}
              >
                {signal.text}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
