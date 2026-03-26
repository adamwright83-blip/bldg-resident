/**
 * Home — BLDG.chat Full Landing Page
 *
 * Design: "Living Interface" — Dark immersive canvas with frosted glass panels,
 * animated chat demo center-stage, bokeh city background, and floating service icons.
 *
 * Color: Warm dark (#1A1A18) + Gold (#C9A961) accent palette.
 * Typography: Space Grotesk (display) + Inter (body) + JetBrains Mono (tech accents)
 *
 * Sections:
 * 1. Hero
 * 2. Social Proof Bar
 * 3. Building Feed
 * 4. How It Works
 * 5. Services Ecosystem
 * 6. Live Product Demo
 * 7. Resident Marketplace
 * 8. For Property Teams
 * 9. Trust & Security
 * 10. The Vision
 * 11. Final CTA
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import ChatDemo from "@/components/ChatDemo";
import FloatingIcons from "@/components/FloatingIcons";
import SocialProofBar from "@/components/manus/sections/SocialProofBar";
import BuildingFeedSection from "@/components/manus/sections/BuildingFeedSection";
import HowItWorks from "@/components/manus/sections/HowItWorks";
import ServicesEcosystem from "@/components/manus/sections/ServicesEcosystem";
import LiveProductDemo from "@/components/manus/sections/LiveProductDemo";
import ResidentMarketplace from "@/components/manus/sections/ResidentMarketplace";
import ForPropertyTeams from "@/components/manus/sections/ForPropertyTeams";
import TrustSecurity from "@/components/manus/sections/TrustSecurity";
import TheVision from "@/components/manus/sections/TheVision";
import FinalCTA from "@/components/manus/sections/FinalCTA";
import {
  ArrowRight,
  Building2,
  Sparkles,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310419663029845795/6mwyUrDqukxWVNyNuZKvJ6/hero-bg-city-WG8gQA4iabZCCQKFwMB7FV.webp";

// Stagger animation variants
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.3 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 200, damping: 20 },
  },
};

const wordVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.4 + i * 0.08,
      type: "spring" as const,
      stiffness: 200,
      damping: 20,
    },
  }),
};

const navLinks = [
  { label: "Services", href: "#services" },
  { label: "Marketplace", href: "#marketplace" },
  { label: "Feed", href: "#feed" },
  { label: "How It Works", href: "#how-it-works" },
];

function smoothScrollTo(href: string) {
  const id = href.replace("#", "");
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export default function ManusLanding() {
  const [, setLocation] = useLocation();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  const headlineWords = ["A private", "network", "for the people", "down the hall."];

  return (
    <div className="relative min-h-screen overflow-x-clip bg-background">
      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-screen">
        {/* ===== BACKGROUND LAYERS ===== */}
        <div className="absolute inset-0">
          <img
            src={HERO_BG}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background/90" />
        </div>

        {/* Animated bokeh circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {mounted && (
            <>
              <motion.div
                className="absolute w-[500px] h-[500px] rounded-full"
                style={{
                  background: "radial-gradient(circle, oklch(0.75 0.10 85 / 6%) 0%, transparent 70%)",
                  top: "10%",
                  right: "5%",
                }}
                animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute w-[400px] h-[400px] rounded-full"
                style={{
                  background: "radial-gradient(circle, oklch(0.75 0.10 85 / 5%) 0%, transparent 70%)",
                  bottom: "15%",
                  left: "10%",
                }}
                animate={{ x: [0, -25, 0], y: [0, 15, 0], scale: [1, 1.05, 1] }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute w-[300px] h-[300px] rounded-full"
                style={{
                  background: "radial-gradient(circle, oklch(0.75 0.10 85 / 4%) 0%, transparent 70%)",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              />
            </>
          )}
        </div>

        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(oklch(1 0 0 / 20%) 1px, transparent 1px),
                              linear-gradient(90deg, oklch(1 0 0 / 20%) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* ===== NAVIGATION ===== */}
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative z-30 flex items-center justify-between px-6 lg:px-10 py-5"
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-gold to-brand-gold-dim flex items-center justify-center">
              <Building2 className="w-4 h-4 text-brand-dark" strokeWidth={2.5} />
            </div>
            <span
              className="text-lg font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "#FAF8F5" }}
            >
              BLDG<span className="text-brand-gold">.chat</span>
            </span>
          </div>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => smoothScrollTo(link.href)}
                className="text-sm hover:text-white/90 transition-colors bg-transparent border-none cursor-pointer"
                style={{ fontFamily: "var(--font-display)", color: "rgba(250,248,245,0.6)" }}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Desktop CTA + Mobile hamburger */}
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              className="hidden md:flex bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-all duration-300"
              style={{ fontFamily: "var(--font-display)" }}
              onClick={() => smoothScrollTo("#charter")}
            >
              Get Started
            </Button>

            {/* Hamburger button — mobile only */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: "oklch(1 0 0 / 8%)", border: "1px solid oklch(1 0 0 / 12%)" }}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen
                ? <X className="w-4 h-4 text-white/80" />
                : <Menu className="w-4 h-4 text-white/80" />
              }
            </button>
          </div>
        </motion.nav>

        {/* ===== MOBILE MENU DRAWER ===== */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />

              {/* Drawer */}
              <motion.div
                initial={{ opacity: 0, x: "100%" }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: "100%" }}
                transition={{ type: "spring" as const, stiffness: 300, damping: 30 }}
                className="fixed top-0 right-0 bottom-0 z-50 w-72 md:hidden flex flex-col"
                style={{
                  background: "oklch(0.12 0.005 60)",
                  borderLeft: "1px solid oklch(1 0 0 / 8%)",
                }}
              >
                {/* Drawer header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-gold to-brand-gold-dim flex items-center justify-center">
                      <Building2 className="w-3.5 h-3.5 text-brand-dark" strokeWidth={2.5} />
                    </div>
                    <span
                      className="text-base font-semibold tracking-tight"
                      style={{ fontFamily: "var(--font-display)", color: "#FAF8F5" }}
                    >
                      BLDG<span className="text-brand-gold">.chat</span>
                    </span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "oklch(1 0 0 / 6%)" }}
                  >
                    <X className="w-4 h-4 text-white/60" />
                  </button>
                </div>

                {/* Drawer nav links */}
                <nav className="flex-1 px-6 py-8 space-y-1">
                  {navLinks.map((link, i) => (
                    <motion.button
                      key={link.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + i * 0.06 }}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setTimeout(() => smoothScrollTo(link.href), 300);
                      }}
                      className="w-full text-left px-4 py-3.5 rounded-xl text-base font-medium transition-colors hover:bg-white/5"
                      style={{ fontFamily: "var(--font-display)", color: "rgba(250,248,245,0.7)" }}
                    >
                      {link.label}
                    </motion.button>
                  ))}
                </nav>

                {/* Drawer CTA */}
                <div className="px-6 pb-8 space-y-3">
                  <Button
                    size="lg"
                    className="w-full bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-all duration-300"
                    style={{ fontFamily: "var(--font-display)" }}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setTimeout(() => smoothScrollTo("#charter"), 300);
                    }}
                  >
                    Bring it to your building
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full border-white/15 hover:bg-white/5 transition-all duration-300"
                    style={{ fontFamily: "var(--font-display)", color: "rgba(250,248,245,0.7)" }}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setLocation("/");
                    }}
                  >
                    Log in
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ===== MAIN HERO CONTENT ===== */}
        <main className="relative z-10 px-6 lg:px-10 pt-6 lg:pt-10 pb-20">
          <div className="max-w-[1280px] mx-auto">
            <div className="grid lg:grid-cols-[1fr_auto] gap-12 lg:gap-20 items-center">
              {/* Left column — Copy */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="max-w-2xl"
              >
                {/* Pill badge */}
                <motion.div variants={itemVariants} className="mb-6">
                  <div
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2"
                    style={{
                      background: "oklch(1 0 0 / 6%)",
                      backdropFilter: "blur(20px) saturate(1.2)",
                      border: "1px solid oklch(0.75 0.10 85 / 25%)",
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
                    <span
                      className="text-xs text-brand-gold tracking-wide uppercase"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      Now live in Los Angeles
                    </span>
                  </div>
                </motion.div>

                {/* Headline — word-by-word reveal */}
                <div className="mb-6">
                  <h1
                    className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.05] tracking-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {headlineWords.map((word, i) => (
                      <motion.span
                        key={word}
                        custom={i}
                        variants={wordVariants}
                        initial="hidden"
                        animate="visible"
                        className={`inline-block mr-[0.3em] ${
                          i < 2 ? "" : "text-gradient-gold"
                        }`}
                        style={i < 2 ? { color: "#FAF8F5" } : undefined}
                      >
                        {word}
                      </motion.span>
                    ))}
                  </h1>
                </div>

                {/* Subheadline */}
                <motion.p
                  variants={itemVariants}
                  className="text-lg sm:text-xl leading-relaxed max-w-xl mb-8"
                  style={{ fontFamily: "var(--font-sans)", color: "rgba(250,248,245,0.5)" }}
                >
                  Book a service, buy from a neighbor, or ask the building for a favor — all from one conversation.
                </motion.p>

                {/* CTA buttons */}
                <motion.div variants={itemVariants} className="flex flex-wrap gap-4 mb-12">
                  <Button
                    size="lg"
                    className="bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 glow-gold transition-all duration-300 px-7"
                    style={{ fontFamily: "var(--font-display)" }}
                    onClick={() => smoothScrollTo("#charter")}
                  >
                    Bring it to your building — $25
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-white/15 hover:bg-white/5 hover:border-white/25 transition-all duration-300 px-7"
                    style={{ fontFamily: "var(--font-display)", color: "rgba(250,248,245,0.7)" }}
                    onClick={() => setLocation("/")}
                  >
                    Log in
                  </Button>
                </motion.div>

                {/* Live buildings line */}
                <motion.div variants={itemVariants}>
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <div className="w-2 h-2 rounded-full bg-emerald-400/60 animate-pulse" style={{ animationDelay: "0.3s" }} />
                    </div>
                    <p
                      className="text-sm"
                      style={{ fontFamily: "var(--font-mono)", color: "rgba(250,248,245,0.4)" }}
                    >
                      Now live at{" "}
                      <span className="text-brand-gold/80">OPUS LA</span>
                      {" "}and{" "}
                      <span className="text-brand-gold/80">Century Park East</span>
                    </p>
                  </div>
                </motion.div>
              </motion.div>

              {/* Right column — Chat Demo */}
              <motion.div
                initial={{ opacity: 0, x: 40, rotateY: -5 }}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                transition={{ delay: 0.8, duration: 0.8, type: "spring" as const, stiffness: 100 }}
                className="relative hidden lg:block"
                style={{ perspective: "1000px", marginRight: "2rem" }}
              >
                <FloatingIcons />
                <ChatDemo />
              </motion.div>
            </div>

            {/* Mobile chat demo */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.6 }}
              className="mt-12 flex justify-center lg:hidden"
            >
              <ChatDemo />
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.5 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          >
            <span
              className="text-[10px] uppercase tracking-widest"
              style={{ fontFamily: "var(--font-mono)", color: "rgba(250,248,245,0.25)" }}
            >
              Scroll to explore
            </span>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown className="w-4 h-4" style={{ color: "rgba(250,248,245,0.25)" }} />
            </motion.div>
          </motion.div>
        </main>
      </section>

      {/* ===== SECTIONS 2–11 ===== */}
      <SocialProofBar />
      <BuildingFeedSection />
      <HowItWorks />
      <ServicesEcosystem />
      <LiveProductDemo />
      <ResidentMarketplace />
      <ForPropertyTeams />
      <TrustSecurity />
      <TheVision />
      <FinalCTA />

      <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none flex justify-center">
        <button
          type="button"
          className="pointer-events-auto rounded-full bg-brand-gold text-brand-dark px-5 py-3 text-sm font-semibold shadow-lg border-0 cursor-pointer"
          style={{ fontFamily: "var(--font-display)" }}
          onClick={() => setLocation("/")}
        >
          Open resident app
        </button>
      </div>
    </div>
  );
}
