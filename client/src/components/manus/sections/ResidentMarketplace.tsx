/**
 * Section 5: Resident Marketplace
 * Compact card layout with real product images.
 * Positioned as a bonus feature — "Oh, and also..."
 * Color: Warm amber accent to differentiate from service gold.
 */

import { motion } from "framer-motion";
import { ShoppingBag, ArrowUpRight, Heart } from "lucide-react";

const listings = [
  {
    title: "West Elm Mid-Century Desk",
    price: "$180",
    seller: "Unit 803",
    time: "2h ago",
    tag: "Furniture",
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029845795/6mwyUrDqukxWVNyNuZKvJ6/marketplace-desk-gXT3uXyNyN2bNvcRiN63Xp.webp",
  },
  {
    title: "Peloton Bike — barely used",
    price: "$900",
    seller: "Unit 1417",
    time: "5h ago",
    tag: "Fitness",
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029845795/6mwyUrDqukxWVNyNuZKvJ6/marketplace-peloton-GHnoZekCp7x2v2DJtms59g.webp",
  },
  {
    title: "Dyson V15 Vacuum",
    price: "$250",
    seller: "Unit 315",
    time: "1d ago",
    tag: "Electronics",
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029845795/6mwyUrDqukxWVNyNuZKvJ6/marketplace-dyson-3SuMC4FfCVdNoaRemKyKfU.webp",
  },
  {
    title: "Moving sale — kitchen items",
    price: "Various",
    seller: "Unit 2214",
    time: "3h ago",
    tag: "Moving",
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029845795/6mwyUrDqukxWVNyNuZKvJ6/marketplace-kitchen-EDa8tNHPxo5iVUsu4LKRoX.webp",
  },
];

export default function ResidentMarketplace() {
  return (
    <section id="marketplace" className="relative py-24 lg:py-32">
      <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-20 items-center">
          {/* Left — Copy */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6 border border-brand-amber/20 bg-brand-amber/5">
              <ShoppingBag className="w-3.5 h-3.5 text-brand-amber" />
              <span
                className="text-xs text-brand-amber tracking-wide uppercase"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Marketplace
              </span>
            </div>

            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-5"
              style={{ fontFamily: "var(--font-display)", color: "#FAF8F5" }}
            >
              No strangers.{" "}
              <span style={{ color: "oklch(0.78 0.12 75)" }}>Just neighbors.</span>
            </h2>

            <p
              className="text-lg leading-relaxed mb-6"
              style={{ color: "rgba(250,248,245,0.5)" }}
            >
              No shipping. No parking lot meetups. No middlemen. Whether you're selling a Peloton or giving away a plant, the marketplace is where good things find a new home — just an elevator ride away.
            </p>

            <div className="space-y-3">
              {["Private to your building only", "Delivery is an elevator ride away", "No fees, no middlemen"].map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-brand-amber/15 flex items-center justify-center flex-shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-amber" />
                  </div>
                  <span className="text-sm" style={{ color: "rgba(250,248,245,0.6)" }}>
                    {item}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right — Listing cards */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {listings.map((listing, i) => (
                <motion.div
                  key={listing.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
                  className="glass rounded-xl p-3 group cursor-default hover:bg-white/[0.08] transition-all duration-300"
                >
                  {/* Product image */}
                  <div className="w-full aspect-square rounded-lg mb-3 relative overflow-hidden bg-white/5">
                    <img
                      src={listing.img}
                      alt={listing.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Gradient overlay at bottom */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    {/* Tag */}
                    <span
                      className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-brand-amber border border-brand-amber/20"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {listing.tag}
                    </span>
                    {/* Heart */}
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Heart className="w-3 h-3 text-white/70" />
                    </div>
                  </div>

                  <h4
                    className="text-xs font-medium text-white/80 mb-1 line-clamp-1"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {listing.title}
                  </h4>

                  <div className="flex items-center justify-between">
                    <span
                      className="text-sm font-semibold text-brand-amber"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {listing.price}
                    </span>
                    <span
                      className="text-[10px] text-white/25"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {listing.seller} • {listing.time}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Browse all link */}
            <div className="mt-4 text-center">
              <span
                className="inline-flex items-center gap-1 text-xs text-brand-amber/60 hover:text-brand-amber transition-colors cursor-pointer"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Browse all listings <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
