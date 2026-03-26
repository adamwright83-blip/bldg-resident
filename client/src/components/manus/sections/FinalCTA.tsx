/**
 * Section 9: Final CTA
 * Segmented paths: residents (charter) and property teams.
 * Gradient background, no image needed.
 * Color: Gold accent on warm dark.
 */

import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, Sparkles } from "lucide-react";

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function FinalCTA() {
  const [, setLocation] = useLocation();

  return (
    <section id="charter" className="relative py-24 lg:py-32">
      <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      {/* Subtle radial glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, oklch(0.75 0.10 85 / 6%) 0%, transparent 60%)",
          }}
        />
      </div>

      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-10">
        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4"
            style={{ fontFamily: "var(--font-display)", color: "#FAF8F5" }}
          >
            Bring it to <span className="text-gradient-gold">your building.</span>
          </h2>
          <p
            className="text-lg max-w-lg mx-auto"
            style={{ color: "rgba(250,248,245,0.5)" }}
          >
            It starts with one resident. One conversation. Charter your building and watch it come alive.
          </p>
        </motion.div>

        {/* Two paths */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Resident path */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <div className="glass rounded-2xl p-8 text-center h-full hover:bg-white/[0.08] transition-all duration-300 group border border-brand-gold/10 hover:border-brand-gold/25">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-gold/10 mb-5">
                <Sparkles className="w-6 h-6 text-brand-gold" />
              </div>
              <h3
                className="text-xl font-semibold mb-2"
                style={{ fontFamily: "var(--font-display)", color: "#FAF8F5" }}
              >
                I'm a resident
              </h3>
              <p
                className="text-sm mb-6"
                style={{ color: "rgba(250,248,245,0.45)" }}
              >
                Charter your building for $25 and become the founding member of your building's private network.
              </p>
              <Button
                size="lg"
                className="w-full bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 glow-gold transition-all duration-300"
                style={{ fontFamily: "var(--font-display)" }}
                onClick={() => setLocation("/")}
              >
                Bring it to your building — $25
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>

          {/* Property team path */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="glass rounded-2xl p-8 text-center h-full hover:bg-white/[0.08] transition-all duration-300 group">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/5 mb-5">
                <Building2 className="w-6 h-6 text-white/50 group-hover:text-brand-gold/70 transition-colors duration-300" />
              </div>
              <h3
                className="text-xl font-semibold mb-2"
                style={{ fontFamily: "var(--font-display)", color: "#FAF8F5" }}
              >
                I manage a building
              </h3>
              <p
                className="text-sm mb-6"
                style={{ color: "rgba(250,248,245,0.45)" }}
              >
                Your residents are already here. Make it official and give your building the amenity layer it deserves.
              </p>
              <Button
                variant="outline"
                size="lg"
                className="w-full border-white/15 hover:bg-white/5 hover:border-white/25 transition-all duration-300"
                style={{ fontFamily: "var(--font-display)", color: "rgba(250,248,245,0.7)" }}
                onClick={() => scrollToId("property-teams")}
              >
                Talk to our team
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative mt-24 border-t border-white/5 pt-8">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-gold to-brand-gold-dim flex items-center justify-center">
              <Building2 className="w-3 h-3 text-brand-dark" strokeWidth={2.5} />
            </div>
            <span
              className="text-sm font-medium"
              style={{ fontFamily: "var(--font-display)", color: "rgba(250,248,245,0.4)" }}
            >
              BLDG<span className="text-brand-gold/60">.chat</span>
            </span>
          </div>
          <p
            className="text-xs"
            style={{ fontFamily: "var(--font-mono)", color: "rgba(250,248,245,0.2)" }}
          >
            &copy; {new Date().getFullYear()} BLDG.chat — Los Angeles, CA
          </p>
        </div>
      </div>
    </section>
  );
}
