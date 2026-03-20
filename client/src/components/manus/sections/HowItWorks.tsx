/**
 * Section 2: How It Works
 * Option B: Split layout — steps on left, aspirational lifestyle image on right.
 * Superhuman approach: one strong image sells the lifestyle.
 * Color: Gold accent on warm dark.
 */

import { motion } from "framer-motion";
import { MessageSquare, Cpu, CheckCircle2 } from "lucide-react";

const LIFESTYLE_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029845795/6mwyUrDqukxWVNyNuZKvJ6/howitworks-lifestyle-GeSEMGuWwbwwLBtpMiiEfE.webp";

const steps = [
  {
    icon: MessageSquare,
    label: "Text",
    title: "Tell us what you need",
    description:
      "Send a message describing any service — laundry, dog grooming, car detailing, anything.",
  },
  {
    icon: Cpu,
    label: "Coordinate",
    title: "We handle everything",
    description:
      "BLDG.chat matches your request to a vetted vendor, confirms timing, and handles logistics.",
  },
  {
    icon: CheckCircle2,
    label: "Done",
    title: "Service delivered",
    description:
      "The vendor comes to your unit or your parking spot. You get real-time updates throughout.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 lg:py-32">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-16 lg:mb-20"
        >
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4"
            style={{ fontFamily: "var(--font-display)", color: "#FAF8F5" }}
          >
            Three texts. <span className="text-gradient-gold">Zero effort.</span>
          </h2>
          <p
            className="text-lg max-w-lg"
            style={{ color: "rgba(250,248,245,0.5)" }}
          >
            From request to delivery, the entire experience happens in your
            messages.
          </p>
        </motion.div>

        {/* Split layout: steps left, image right */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Steps */}
          <div className="space-y-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
              >
                <div className="flex gap-5 group">
                  {/* Icon + vertical line */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center transition-all duration-300 group-hover:bg-brand-gold/15 group-hover:border-brand-gold/30 relative">
                      <step.icon
                        className="w-5 h-5 text-brand-gold"
                        strokeWidth={1.5}
                      />
                      {/* Pulse on middle step */}
                      {i === 1 && (
                        <motion.div
                          className="absolute inset-0 rounded-xl border border-brand-gold/30"
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.5, 0, 0.5],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                      )}
                    </div>
                    {/* Connecting line */}
                    {i < steps.length - 1 && (
                      <div className="w-px h-full min-h-[24px] bg-gradient-to-b from-brand-gold/20 to-transparent mt-2" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="pb-4">
                    <p
                      className="text-[10px] uppercase tracking-widest text-brand-gold/60 mb-1.5"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      Step {i + 1} — {step.label}
                    </p>
                    <h3
                      className="text-lg font-semibold mb-2"
                      style={{
                        fontFamily: "var(--font-display)",
                        color: "#FAF8F5",
                      }}
                    >
                      {step.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "rgba(250,248,245,0.45)" }}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Right: Lifestyle image */}
          <motion.div
            initial={{ opacity: 0, x: 30, scale: 0.97 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative hidden lg:block"
          >
            {/* Outer glow */}
            <div
              className="absolute -inset-4 rounded-3xl opacity-20 blur-2xl"
              style={{
                background:
                  "radial-gradient(ellipse at center, #C9A961 0%, transparent 70%)",
              }}
            />

            {/* Image container */}
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
              <img
                src={LIFESTYLE_IMAGE}
                alt="Resident texting from a luxury high-rise apartment at night"
                className="w-full h-auto object-cover"
                style={{ aspectRatio: "3/4" }}
                loading="lazy"
              />

              {/* Subtle gradient overlay at bottom */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(26,26,24,0.6) 0%, transparent 40%)",
                }}
              />

              {/* Caption overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <p
                  className="text-xs tracking-wider"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "rgba(250,248,245,0.5)",
                  }}
                >
                  Text what you need. We handle the rest.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Mobile: Image shown below steps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6 }}
            className="lg:hidden relative"
          >
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-xl">
              <img
                src={LIFESTYLE_IMAGE}
                alt="Resident texting from a luxury high-rise apartment at night"
                className="w-full h-auto object-cover"
                style={{ aspectRatio: "4/3" }}
                loading="lazy"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(26,26,24,0.6) 0%, transparent 40%)",
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p
                  className="text-xs tracking-wider"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "rgba(250,248,245,0.5)",
                  }}
                >
                  Text what you need. We handle the rest.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
