/**
 * Section 6: For Property Teams
 * The B2B buyer section. ROI framing + coded dashboard mockup.
 * Dashboard shows: live request feed, key metrics, vendor status.
 * Designed to make a property manager feel "this gives me control without work."
 * Color: Gold accent on warm dark.
 */

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
  Loader2,
  Circle,
  Shirt,
  Dog,
  Car,
  Wrench,
  SprayCan,
} from "lucide-react";

const LOBBY_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310419663029845795/6mwyUrDqukxWVNyNuZKvJ6/property-lobby-MDpXWjHtK4jmgxbMRn59HE.webp";

// Dashboard mock data
const recentRequests = [
  { unit: "803", service: "Laundry Pickup", status: "completed", time: "11:42 AM", icon: Shirt },
  { unit: "1417", service: "Dog Grooming", status: "in-progress", time: "11:15 AM", icon: Dog },
  { unit: "315", service: "Car Detailing", status: "confirmed", time: "10:58 AM", icon: Car },
  { unit: "2214", service: "Handyman", status: "confirmed", time: "10:30 AM", icon: Wrench },
  { unit: "612", service: "Cleaning", status: "completed", time: "9:45 AM", icon: SprayCan },
];

const statusConfig = {
  completed: { label: "Completed", color: "text-emerald-400", bg: "bg-emerald-400/10", dot: "bg-emerald-400" },
  "in-progress": { label: "In Progress", color: "text-brand-gold", bg: "bg-brand-gold/10", dot: "bg-brand-gold" },
  confirmed: { label: "Confirmed", color: "text-sky-400", bg: "bg-sky-400/10", dot: "bg-sky-400" },
};

const vendors = [
  { name: "CleanPro LA", category: "Laundry & Cleaning", available: true },
  { name: "PawPerfect", category: "Pet Services", available: true },
  { name: "DetailKing", category: "Auto Care", available: true },
  { name: "FixIt Crew", category: "Maintenance", available: false },
];

export default function ForPropertyTeams() {
  return (
    <section id="property-teams" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      {/* Background image with heavy overlay */}
      <div className="absolute inset-0">
        <img
          src={LOBBY_IMG}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-15"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background" />
      </div>

      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-12 lg:gap-16 items-start">
          {/* Left — Copy */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="lg:sticky lg:top-32"
          >
            <p
              className="text-xs uppercase tracking-wider text-brand-gold/70 mb-4"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              For Property Teams
            </p>

            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-5"
              style={{ fontFamily: "var(--font-display)", color: "#FAF8F5" }}
            >
              Upgrade your building.{" "}
              <span className="text-gradient-gold">Not your workload.</span>
            </h2>

            <p
              className="text-lg leading-relaxed mb-8"
              style={{ color: "rgba(250,248,245,0.5)" }}
            >
              BLDG.chat gives your residents a premium amenity layer without adding
              a single task to your team's plate. We handle vendor coordination,
              scheduling, and resident communication — you get happier tenants and
              higher retention.
            </p>

            {/* Key metrics — compact horizontal */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { icon: TrendingUp, value: "+40%", label: "Satisfaction" },
                { icon: Users, value: "78%", label: "Adoption" },
                { icon: Clock, value: "48hrs", label: "To go live" },
              ].map((m, i) => (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
                  className="glass rounded-xl p-3 text-center"
                >
                  <p
                    className="text-xl font-bold text-brand-gold mb-0.5"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {m.value}
                  </p>
                  <p className="text-[10px] text-white/40" style={{ fontFamily: "var(--font-mono)" }}>
                    {m.label}
                  </p>
                </motion.div>
              ))}
            </div>

            <Button
              size="lg"
              className="bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 glow-gold transition-all duration-300 px-7"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Bring BLDG.chat to your building
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>

          {/* Right — Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "oklch(0.14 0.005 60)",
                border: "1px solid oklch(1 0 0 / 8%)",
                boxShadow: "0 25px 60px -15px oklch(0 0 0 / 50%)",
              }}
            >
              {/* Dashboard header bar */}
              <div
                className="flex items-center justify-between px-5 py-3.5"
                style={{ borderBottom: "1px solid oklch(1 0 0 / 6%)" }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-gold to-brand-gold-dim flex items-center justify-center">
                    <span className="text-[10px] font-bold text-brand-dark" style={{ fontFamily: "var(--font-display)" }}>B</span>
                  </div>
                  <span
                    className="text-xs font-semibold text-white/80"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    BLDG.chat Dashboard
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-white/30" style={{ fontFamily: "var(--font-mono)" }}>
                    OPUS LA
                  </span>
                  <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  </div>
                </div>
              </div>

              {/* Dashboard content */}
              <div className="p-4 space-y-4">
                {/* Top stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Today", value: "12", sub: "requests" },
                    { label: "Avg Response", value: "< 3m", sub: "time" },
                    { label: "This Week", value: "47", sub: "completed" },
                    { label: "Satisfaction", value: "4.9", sub: "/ 5.0" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-lg p-3"
                      style={{ background: "oklch(1 0 0 / 3%)" }}
                    >
                      <p className="text-[10px] text-white/30 mb-1" style={{ fontFamily: "var(--font-mono)" }}>
                        {stat.label}
                      </p>
                      <p className="text-lg font-bold text-white/90" style={{ fontFamily: "var(--font-display)" }}>
                        {stat.value}
                      </p>
                      <p className="text-[9px] text-white/20" style={{ fontFamily: "var(--font-mono)" }}>
                        {stat.sub}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Main content: Request feed + Vendor sidebar */}
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  {/* Request feed */}
                  <div
                    className="rounded-lg overflow-hidden"
                    style={{ background: "oklch(1 0 0 / 2%)" }}
                  >
                    {/* Feed header */}
                    <div
                      className="flex items-center justify-between px-3.5 py-2.5"
                      style={{ borderBottom: "1px solid oklch(1 0 0 / 5%)" }}
                    >
                      <span className="text-[10px] font-semibold text-white/50" style={{ fontFamily: "var(--font-display)" }}>
                        Live Requests
                      </span>
                      <span className="text-[9px] text-brand-gold/50" style={{ fontFamily: "var(--font-mono)" }}>
                        5 active
                      </span>
                    </div>

                    {/* Request rows */}
                    {recentRequests.map((req, i) => {
                      const status = statusConfig[req.status as keyof typeof statusConfig];
                      return (
                        <motion.div
                          key={`${req.unit}-${req.service}`}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.4 + i * 0.06, duration: 0.3 }}
                          className="flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3.5 py-2 sm:py-2.5 hover:bg-white/[0.02] transition-colors"
                          style={i < recentRequests.length - 1 ? { borderBottom: "1px solid oklch(1 0 0 / 3%)" } : undefined}
                        >
                          {/* Icon */}
                          <div className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0">
                            <req.icon className="w-3.5 h-3.5 text-white/40" strokeWidth={1.5} />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-medium text-white/70" style={{ fontFamily: "var(--font-display)" }}>
                                {req.service}
                              </span>
                              <span className="text-[9px] text-white/20" style={{ fontFamily: "var(--font-mono)" }}>
                                Unit {req.unit}
                              </span>
                            </div>
                          </div>

                          {/* Status */}
                          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${status.bg}`}>
                            {req.status === "completed" && <CheckCircle2 className={`w-2.5 h-2.5 ${status.color}`} />}
                            {req.status === "in-progress" && <Loader2 className={`w-2.5 h-2.5 ${status.color} animate-spin`} />}
                            {req.status === "confirmed" && <Circle className={`w-2.5 h-2.5 ${status.color}`} />}
                            <span className={`text-[9px] font-medium ${status.color}`} style={{ fontFamily: "var(--font-mono)" }}>
                              {status.label}
                            </span>
                          </div>

                          {/* Time */}
                          <span className="text-[9px] text-white/15 flex-shrink-0 w-14 text-right hidden sm:inline" style={{ fontFamily: "var(--font-mono)" }}>
                            {req.time}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Vendor sidebar */}
                  <div
                    className="rounded-lg w-36 hidden sm:block"
                    style={{ background: "oklch(1 0 0 / 2%)" }}
                  >
                    <div
                      className="px-3 py-2.5"
                      style={{ borderBottom: "1px solid oklch(1 0 0 / 5%)" }}
                    >
                      <span className="text-[10px] font-semibold text-white/50" style={{ fontFamily: "var(--font-display)" }}>
                        Vendors
                      </span>
                    </div>

                    <div className="p-2 space-y-1">
                      {vendors.map((vendor, i) => (
                        <motion.div
                          key={vendor.name}
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.5 + i * 0.08 }}
                          className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-white/[0.03] transition-colors"
                        >
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${vendor.available ? "bg-emerald-400" : "bg-white/15"}`} />
                          <div className="min-w-0">
                            <p className="text-[10px] font-medium text-white/60 truncate" style={{ fontFamily: "var(--font-display)" }}>
                              {vendor.name}
                            </p>
                            <p className="text-[8px] text-white/20 truncate" style={{ fontFamily: "var(--font-mono)" }}>
                              {vendor.category}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Subtle "this is a preview" label */}
            <p
              className="text-center mt-3 text-[10px] text-white/15"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Property management dashboard preview
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
