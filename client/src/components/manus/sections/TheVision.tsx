/**
 * Section 8: The Vision
 * "AI infrastructure for vertical living" — expansion narrative, TAM argument as story.
 * Uses the LA cityscape image as background for the manifesto moment.
 * Color: Gold accent on warm dark.
 */

import { motion } from "framer-motion";

const CITYSCAPE_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310419663029845795/6mwyUrDqukxWVNyNuZKvJ6/vision-cityscape-RGDaYDMoooSSmacytjotQc.webp";

export default function TheVision() {
  return (
    <section className="relative py-32 lg:py-44 overflow-hidden">
      {/* Cityscape background */}
      <div className="absolute inset-0">
        <img
          src={CITYSCAPE_IMG}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/70 to-background" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background" />
      </div>

      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto text-center"
        >
          <p
            className="text-xs uppercase tracking-wider text-brand-gold/70 mb-6"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            The Vision
          </p>

          <h2
            className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight mb-8 leading-[1.1]"
            style={{ fontFamily: "var(--font-display)", color: "#FAF8F5" }}
          >
            The missing{" "}
            <span className="text-gradient-gold">community layer.</span>
          </h2>

          <p
            className="text-lg sm:text-xl leading-relaxed mb-6"
            style={{ color: "rgba(250,248,245,0.55)" }}
          >
            The proptech market is split into two camps: infrastructure platforms that manage the building, and amenity platforms that serve the resident. Both are top-down, enterprise-sold, and lack a social moat.
          </p>

          <p
            className="text-lg sm:text-xl leading-relaxed mb-8"
            style={{ color: "rgba(250,248,245,0.55)" }}
          >
            BLDG.chat is the missing third layer: the community network. We are software-only and bottoms-up. Residents charter us for their own buildings, creating a private network inside each building that grows stronger as more neighbors join. We start with the best buildings in LA. The model works for every high-rise, everywhere.
          </p>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex items-center justify-center gap-8 sm:gap-14"
          >
            {[
              { value: "44M+", label: "U.S. apartment units" },
              { value: "100%", label: "Software-only model" },
              { value: "0", label: "Enterprise salespeople" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p
                  className="text-2xl sm:text-3xl font-bold text-brand-gold mb-1"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {stat.value}
                </p>
                <p
                  className="text-xs"
                  style={{ fontFamily: "var(--font-mono)", color: "rgba(250,248,245,0.35)" }}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
