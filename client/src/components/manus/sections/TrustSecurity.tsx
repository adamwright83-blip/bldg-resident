/**
 * Section 7: Trust & Security
 * Three pillars: Vetted Vendors, Privacy, Building Control.
 * Addresses objections without an FAQ.
 * Color: Gold accent on warm dark.
 */

import { motion } from "framer-motion";
import { ShieldCheck, Lock, Building2 } from "lucide-react";

const pillars = [
  {
    icon: ShieldCheck,
    title: "Vetted vendors",
    description:
      "Every service provider is background-checked, insured, and reviewed by our team before they enter your building.",
  },
  {
    icon: Lock,
    title: "Private by default",
    description:
      "Conversations, requests, and marketplace activity stay within your building. No data is shared with third parties.",
  },
  {
    icon: Building2,
    title: "Building-level control",
    description:
      "Property managers approve which services are available, set access hours, and maintain full oversight.",
  },
];

export default function TrustSecurity() {
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
          className="text-center mb-16 lg:mb-20"
        >
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4"
            style={{ fontFamily: "var(--font-display)", color: "#FAF8F5" }}
          >
            Built on <span className="text-gradient-gold">trust.</span>
          </h2>
          <p
            className="text-lg max-w-lg mx-auto"
            style={{ color: "rgba(250,248,245,0.5)" }}
          >
            Security and privacy are not features — they are the foundation.
          </p>
        </motion.div>

        {/* Three pillars */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
            >
              <div className="glass rounded-2xl p-8 h-full text-center hover:bg-white/[0.08] transition-all duration-300 group">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-gold/10 border border-brand-gold/15 mb-6 group-hover:border-brand-gold/30 transition-colors duration-300">
                  <pillar.icon className="w-7 h-7 text-brand-gold/70 group-hover:text-brand-gold transition-colors duration-300" strokeWidth={1.5} />
                </div>

                <h3
                  className="text-lg font-semibold mb-3"
                  style={{ fontFamily: "var(--font-display)", color: "#FAF8F5" }}
                >
                  {pillar.title}
                </h3>

                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "rgba(250,248,245,0.45)" }}
                >
                  {pillar.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
