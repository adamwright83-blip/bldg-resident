/**
 * BLDG.chat Marketplace Prototype
 *
 * Design: Warm cream (#FAF8F5) canvas + gold (#C9A961) accents.
 * Mobile-first, app-like feel. Matches the resident app architecture.
 *
 * This is a standalone visual prototype showing:
 * 1. Mode pill toggle (Services ↔ Marketplace)
 * 2. Marketplace feed with category filter pills
 * 3. Listing cards with product photography
 * 4. Listing detail bottom sheet
 * 5. Create listing FAB + form sheet
 * 6. Empty state
 * 7. Unified inbox (support pinned, marketplace DMs, neighbor chats)
 * 8. Conversation thread with chat bubbles, listing context, typing indicator
 *
 * Integration note for Cursor:
 * - The mode pill replaces the existing services-pill in Home.tsx
 * - Marketplace feed replaces the chat-messages area when marketplace mode is active
 * - Listing detail uses the same bottom sheet pattern as AccountSheet
 * - All CSS is self-contained in this file via inline styles (to be extracted to index.css)
 */

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  LayoutGrid,
  ShoppingBag,
  Plus,
  X,
  Heart,
  MessageCircle,
  ChevronDown,
  Camera,
  Tag,
  MapPin,
  Send,
  Phone,
  Building2,
  ArrowLeft,
  Image as ImageIcon,
  Shirt,
  Dog,
  Car,
  Wrench,
  SprayCan,
  Package,
  Gem,
  Sparkles,
  Search,
  HardHat,
  Rss,
  Users,
  HandHeart,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { InboxList, ConversationThread, MOCK_CONVERSATIONS } from "@/components/messaging";
import type { Conversation } from "@/components/messaging";
import BuildingFeed from "@/components/BuildingFeed";
import NeighborGraph from "@/components/NeighborGraph";
import { LivingBuildingTransition } from "@/components/LivingBuilding";
import ServiceChatThread from "@/components/ServiceChatThread";

// ─── Design Tokens ───
const T = {
  canvas: "#FAF8F5",
  surface: "#FFFFFF",
  surfaceRaised: "#F5F1EC",
  gold: "#C9A961",
  goldMuted: "rgba(201, 169, 97, 0.08)",
  goldBorder: "rgba(201, 169, 97, 0.20)",
  goldDim: "#B89A55",
  textPrimary: "#1A1A18",
  textSecondary: "rgba(26, 26, 24, 0.55)",
  textTertiary: "rgba(26, 26, 24, 0.35)",
  border: "rgba(26, 26, 24, 0.08)",
  borderMedium: "rgba(26, 26, 24, 0.12)",
  shadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
  shadowLg: "0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
  radius: 16,
  radiusSm: 10,
  radiusXs: 8,
  font: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif',
};

// ─── Spring presets (matching resident app) ───
const springs = {
  snap: { type: "spring" as const, stiffness: 420, damping: 22, mass: 0.8 },
  sheet: { type: "spring" as const, stiffness: 340, damping: 28, mass: 1.0 },
  micro: { type: "spring" as const, stiffness: 500, damping: 25, mass: 0.5 },
};

const stagger = {
  delayChildren: 0.04,
  staggerChildren: 0.06,
};

const listItemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

// ─── Mock Data ───
interface Listing {
  id: string;
  title: string;
  price: number;
  unit: string;
  timeAgo: string;
  category: string;
  image: string;
  description: string;
  condition: string;
  sellerName: string;
  sellerUnit: string;
  liked: boolean;
}

const CATEGORIES = ["All", "Furniture", "Electronics", "Fitness", "Fashion", "Kitchen", "Free", "Wanted"];

const MOCK_LISTINGS: Listing[] = [
  {
    id: "1",
    title: "Mid-Century Lounge Chair",
    price: 275,
    unit: "1204",
    timeAgo: "2h ago",
    category: "Furniture",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029845795/6mwyUrDqukxWVNyNuZKvJ6/mp-mcm-chair-8AtJu3xcaRmde4UxoGzNHc.webp",
    description: "Beautiful cognac leather lounge chair. Purchased from Design Within Reach 8 months ago. Minor wear on armrests. Moving and can't take it with me.",
    condition: "Good",
    sellerName: "Sarah M.",
    sellerUnit: "1204",
    liked: false,
  },
  {
    id: "2",
    title: "Peloton Bike+",
    price: 650,
    unit: "1417",
    timeAgo: "5h ago",
    category: "Fitness",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029845795/6mwyUrDqukxWVNyNuZKvJ6/mp-bike-dtSMqyRi5NDcz438ZNJ6rh.webp",
    description: "Peloton Bike+ with original accessories. Under 200 rides. Screen protector included. Can help move it to your unit.",
    condition: "Excellent",
    sellerName: "James",
    sellerUnit: "1417",
    liked: false,
  },
  {
    id: "3",
    title: "Breville Espresso Machine",
    price: 195,
    unit: "803",
    timeAgo: "1d ago",
    category: "Kitchen",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029845795/6mwyUrDqukxWVNyNuZKvJ6/mp-espresso-PKMC6owSHDR3EnZmPkNFtg.webp",
    description: "Breville Barista Express. Makes incredible espresso. Includes tamper, milk pitcher, and cleaning kit. Upgrading to a different model.",
    condition: "Good",
    sellerName: "Maya",
    sellerUnit: "803",
    liked: false,
  },
  {
    id: "4",
    title: "Walnut Standing Desk",
    price: 150,
    unit: "612",
    timeAgo: "1d ago",
    category: "Furniture",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029845795/6mwyUrDqukxWVNyNuZKvJ6/mp-standing-desk-cmoZoKCPXSeoynMhQJj5e8.webp",
    description: "Electric standing desk with walnut top. Dual motor, memory presets. 60\" wide. Cable management tray included.",
    condition: "Like new",
    sellerName: "Alex",
    sellerUnit: "612",
    liked: false,
  },
  {
    id: "5",
    title: "Designer Tote Bag",
    price: 85,
    unit: "1001",
    timeAgo: "2d ago",
    category: "Fashion",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029845795/6mwyUrDqukxWVNyNuZKvJ6/mp-designer-bag-XwAPQTN2vzGb9frWYy3dYf.webp",
    description: "Genuine leather tote. Barely used — received as a gift but not my style. Comes with dust bag.",
    condition: "Like new",
    sellerName: "Priya",
    sellerUnit: "1001",
    liked: false,
  },
  {
    id: "6",
    title: "West Elm Desk",
    price: 95,
    unit: "807",
    timeAgo: "3d ago",
    category: "Furniture",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029845795/6mwyUrDqukxWVNyNuZKvJ6/mp-standing-desk-cmoZoKCPXSeoynMhQJj5e8.webp",
    description: "Mid-century modern writing desk from West Elm. Solid walnut frame, brass hardware. Perfect for a home office or entryway.",
    condition: "Good",
    sellerName: "David",
    sellerUnit: "807",
    liked: false,
  },
  {
    id: "7",
    title: "Dyson V15 Detect",
    price: 175,
    unit: "1422",
    timeAgo: "3d ago",
    category: "Electronics",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029845795/6mwyUrDqukxWVNyNuZKvJ6/dyson-v15_8ced91ce.jpg",
    description: "Dyson V15 Detect cordless vacuum. Laser dust detection, LCD screen. All attachments included. Battery holds full charge.",
    condition: "Excellent",
    sellerName: "Dana W.",
    sellerUnit: "1422",
    liked: false,
  },
  {
    id: "8",
    title: "Moving Sale — Kitchen Set",
    price: 60,
    unit: "315",
    timeAgo: "4d ago",
    category: "Kitchen",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029845795/6mwyUrDqukxWVNyNuZKvJ6/kitchen-set_46b2d668.jpg",
    description: "Le Creuset Dutch oven, All-Clad pan set, and Vitamix blender. Selling as a bundle. Moving next week — price is firm.",
    condition: "Good",
    sellerName: "Lena",
    sellerUnit: "315",
    liked: false,
  },
];

// ─── Service Tiles Data ───
const SERVICE_TILES = [
  // color = icon tint, glow = box-shadow color for the tile
  { icon: Shirt, label: "Laundry", color: "#5BA4CF", glow: "rgba(91,164,207,0.18)" },
  { icon: Gem, label: "Dry Clean", color: "#3D5A80", glow: "rgba(61,90,128,0.18)" },
  { icon: Dog, label: "Dog Groom", color: "#6A9E78", glow: "rgba(106,158,120,0.18)" },
  { icon: Car, label: "Car Detail", color: "#2E7BB5", glow: "rgba(46,123,181,0.18)" },
  { icon: SprayCan, label: "Cleaning", color: "#8B6BAE", glow: "rgba(139,107,174,0.18)" },
  { icon: Wrench, label: "Handyman", color: "#C07A3A", glow: "rgba(192,122,58,0.20)" },
  { icon: Package, label: "Assembly", color: "#4A8FA8", glow: "rgba(74,143,168,0.18)" },
  { icon: HardHat, label: "Maintenance", color: "#D4873A", glow: "rgba(212,135,58,0.20)" },
];

// ─── Service Tile Component ───
function ServiceTile({
  icon: Icon,
  label,
  color,
  glow,
  index,
  onTap,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;
  label: string;
  color: string;
  glow: string;
  index: number;
  onTap?: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, ...springs.micro }}
      whileTap={{ scale: 0.94 }}
      whileHover={{ y: -2 }}
      onClick={onTap}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "12px 6px",
        borderRadius: 16,
        background: T.surface,
        border: `1px solid ${color}33`,
        boxShadow: `0 2px 8px ${glow}, ${T.shadow}`,
        cursor: "pointer",
        fontFamily: T.font,
        WebkitTapHighlightColor: "transparent",
        transition: "box-shadow 0.2s ease",
        width: "100%",
        height: "100%",
        minHeight: 80,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `${color}18`,
          border: `1px solid ${color}30`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={22} strokeWidth={1.6} color={color} />
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: T.textSecondary,
          letterSpacing: "0.01em",
          textAlign: "center",
        }}
      >
        {label}
      </span>
    </motion.button>
  );
}

// ─── Bottom Mode Pill Component (3-mode, thumb-friendly) ───
const MODES = [
  { id: "services" as const, label: "Services", Icon: LayoutGrid },
  { id: "feed" as const, label: "Feed", Icon: Rss },
  { id: "marketplace" as const, label: "Market", Icon: ShoppingBag },
];

function BottomModePill({
  mode,
  onSelect,
}: {
  mode: "services" | "feed" | "marketplace";
  onSelect: (m: "services" | "feed" | "marketplace") => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        background: "rgba(245, 241, 236, 0.90)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderRadius: 28,
        padding: 4,
        gap: 0,
        width: "fit-content",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(26,26,24,0.06)",
      }}
    >
      {MODES.map(({ id, label, Icon }) => (
        <motion.button
          key={id}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(id)}
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "9px 16px",
            borderRadius: 24,
            border: "none",
            background: "transparent",
            color: mode === id ? T.textPrimary : T.textTertiary,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: T.font,
            cursor: "pointer",
            transition: "color 0.15s",
            zIndex: 1,
            WebkitTapHighlightColor: "transparent",
            letterSpacing: "-0.01em",
          }}
        >
          {mode === id && (
            <motion.div
              layoutId="bottom-mode-pill"
              style={{
                position: "absolute",
                inset: 0,
                background: T.surface,
                borderRadius: 24,
                boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
              }}
              transition={springs.snap}
            />
          )}
          <Icon size={14} style={{ position: "relative", zIndex: 1 }} />
          <span style={{ position: "relative", zIndex: 1 }}>{label}</span>
        </motion.button>
      ))}
    </div>
  );
}

// ─── Category Filter Pills ───
function CategoryPills({
  categories,
  active,
  onChange,
}: {
  categories: string[];
  active: string;
  onChange: (cat: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      style={{
        display: "flex",
        gap: 8,
        overflowX: "auto",
        padding: "0 20px",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {categories.map((cat) => (
        <motion.button
          key={cat}
          whileTap={{ scale: 0.95 }}
          onClick={() => onChange(cat)}
          style={{
            flexShrink: 0,
            padding: "7px 16px",
            borderRadius: 20,
            border: `1px solid ${active === cat ? T.goldBorder : T.border}`,
            background: active === cat ? T.goldMuted : "transparent",
            color: active === cat ? T.goldDim : T.textSecondary,
            fontSize: 13,
            fontWeight: 500,
            fontFamily: T.font,
            cursor: "pointer",
            transition: "all 0.15s ease",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {cat}
        </motion.button>
      ))}
    </div>
  );
}

// ─── Listing Card ───
function ListingCard({
  listing,
  onTap,
  onLike,
}: {
  listing: Listing;
  onTap: () => void;
  onLike: () => void;
}) {
  return (
    <motion.div
      variants={listItemVariants}
      whileTap={{ scale: 0.97 }}
      transition={springs.micro}
      onClick={onTap}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onTap()}
      style={{
        display: "flex",
        flexDirection: "column",
        background: T.surface,
        borderRadius: T.radius,
        overflow: "hidden",
        border: `1px solid ${T.border}`,
        boxShadow: T.shadow,
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        WebkitTapHighlightColor: "transparent",
        padding: 0,
        fontFamily: T.font,
      }}
    >
      {/* Image */}
      <div style={{ position: "relative", aspectRatio: "4/3", overflow: "hidden" }}>
        <img
          src={listing.image}
          alt={listing.title}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "transform 0.3s ease",
          }}
          loading="lazy"
        />
        {/* Like button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLike();
          }}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(8px)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "transform 0.15s",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          }}
        >
          <Heart
            size={15}
            fill={listing.liked ? T.gold : "none"}
            color={listing.liked ? T.gold : T.textSecondary}
            strokeWidth={1.8}
          />
        </button>
        {/* Category tag */}
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            padding: "4px 10px",
            borderRadius: 6,
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(8px)",
            fontSize: 11,
            fontWeight: 500,
            color: T.textSecondary,
            letterSpacing: "0.02em",
          }}
        >
          {listing.category}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "12px 14px 16px" }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: T.textPrimary,
            lineHeight: 1.3,
            marginBottom: 10,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {listing.title}
        </div>
        <div
          style={{
            fontSize: 17,
            fontWeight: 600,
            color: T.gold,
            letterSpacing: "-0.01em",
            marginBottom: 5,
          }}
        >
          ${listing.price}
        </div>
        <div
          style={{
            fontSize: 11,
            color: T.textTertiary,
            fontFamily: "SF Mono, ui-monospace, monospace",
            letterSpacing: "0.01em",
          }}
        >
          Unit {listing.unit} · {listing.timeAgo}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Listing Detail Bottom Sheet ───
function ListingDetailSheet({
  listing,
  onClose,
  onMessage,
}: {
  listing: Listing;
  onClose: () => void;
  onMessage: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.25)",
          zIndex: 50,
        }}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={springs.sheet}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: "92vh",
          background: T.canvas,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          zIndex: 51,
          overflowY: "auto",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.08)",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 4 }}>
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: T.borderMedium,
            }}
          />
        </div>

        {/* Image */}
        <div style={{ position: "relative", maxHeight: "40vh", overflow: "hidden" }}>
          <img
            src={listing.image}
            alt={listing.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(8px)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            }}
          >
            <X size={18} color={T.textPrimary} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "20px 20px 32px" }}>
          {/* Price + condition */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.02em" }}>
              ${listing.price}
            </span>
            <span
              style={{
                padding: "4px 12px",
                borderRadius: 6,
                background: T.goldMuted,
                border: `1px solid ${T.goldBorder}`,
                fontSize: 12,
                fontWeight: 500,
                color: T.goldDim,
              }}
            >
              {listing.condition}
            </span>
          </div>

          {/* Title */}
          <h2 style={{ fontSize: 20, fontWeight: 600, color: T.textPrimary, lineHeight: 1.3, marginBottom: 16 }}>
            {listing.title}
          </h2>

          {/* Seller info */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              borderRadius: T.radiusSm,
              background: T.surface,
              border: `1px solid ${T.border}`,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: T.goldMuted,
                border: `1px solid ${T.goldBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                fontWeight: 600,
                color: T.gold,
              }}
            >
              {listing.sellerName.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: T.textPrimary }}>
                {listing.sellerName}
              </div>
              <div style={{ fontSize: 13, color: T.textTertiary }}>
                Unit {listing.sellerUnit} · {listing.timeAgo}
              </div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <MapPin size={14} color={T.textTertiary} />
            </div>
          </div>

          {/* Description */}
          <p style={{ fontSize: 15, lineHeight: 1.6, color: T.textSecondary, marginBottom: 24 }}>
            {listing.description}
          </p>

          {/* Trust signal */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: T.radiusXs,
              background: T.surfaceRaised,
              marginBottom: 24,
              fontSize: 13,
              color: T.textTertiary,
            }}
          >
            <Building2 size={14} color={T.gold} />
            <span>Verified resident of your building</span>
          </div>

          {/* CTA */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            transition={springs.micro}
            onClick={onMessage}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "14px 24px",
              borderRadius: T.radiusSm,
              border: "none",
              background: T.gold,
              color: "#FFFFFF",
              fontSize: 16,
              fontWeight: 600,
              fontFamily: T.font,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(201, 169, 97, 0.25)",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <MessageCircle size={18} />
            Message {listing.sellerName}
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}

// ─── Create Listing Sheet ───
function CreateListingSheet({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.25)",
          zIndex: 50,
        }}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={springs.sheet}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: "92vh",
          background: T.canvas,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          zIndex: 51,
          overflowY: "auto",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.08)",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 4 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: T.borderMedium }} />
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 20px 16px",
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 600, color: T.textPrimary }}>New Listing</h2>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: T.surfaceRaised,
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={16} color={T.textSecondary} />
          </button>
        </div>

        <div style={{ padding: "0 20px 32px" }}>
          {/* Photo upload area */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 8,
              height: 160,
              borderRadius: T.radius,
              border: `2px dashed ${T.borderMedium}`,
              background: T.surface,
              marginBottom: 20,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: T.goldMuted,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Camera size={22} color={T.gold} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 500, color: T.textSecondary }}>
              Add photos
            </span>
            <span style={{ fontSize: 12, color: T.textTertiary }}>
              Tap to upload from camera or gallery
            </span>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: T.textSecondary, marginBottom: 6 }}>
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What are you selling?"
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: T.radiusXs,
                border: `1px solid ${T.border}`,
                background: T.surface,
                fontSize: 15,
                color: T.textPrimary,
                fontFamily: T.font,
                outline: "none",
                transition: "border-color 0.15s",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Price */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: T.textSecondary, marginBottom: 6 }}>
              Price
            </label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 15,
                  color: T.textTertiary,
                  fontWeight: 500,
                }}
              >
                $
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="0"
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 28px",
                  borderRadius: T.radiusXs,
                  border: `1px solid ${T.border}`,
                  background: T.surface,
                  fontSize: 15,
                  color: T.textPrimary,
                  fontFamily: T.font,
                  outline: "none",
                  transition: "border-color 0.15s",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Category */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: T.textSecondary, marginBottom: 6 }}>
              Category
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CATEGORIES.filter((c) => c !== "All").map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 20,
                    border: `1px solid ${category === cat ? T.goldBorder : T.border}`,
                    background: category === cat ? T.goldMuted : "transparent",
                    color: category === cat ? T.goldDim : T.textSecondary,
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: T.font,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: T.textSecondary, marginBottom: 6 }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the item, condition, and any details buyers should know..."
              rows={4}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: T.radiusXs,
                border: `1px solid ${T.border}`,
                background: T.surface,
                fontSize: 15,
                color: T.textPrimary,
                fontFamily: T.font,
                outline: "none",
                resize: "vertical",
                lineHeight: 1.5,
                transition: "border-color 0.15s",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Submit */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            transition={springs.micro}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "14px 24px",
              borderRadius: T.radiusSm,
              border: "none",
              background: T.gold,
              color: "#FFFFFF",
              fontSize: 16,
              fontWeight: 600,
              fontFamily: T.font,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(201, 169, 97, 0.25)",
              opacity: title && price ? 1 : 0.5,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <Tag size={18} />
            List Item
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}

// ─── Empty State ───
function MarketplaceEmpty() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        paddingTop: 80,
        paddingBottom: 40,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: T.goldMuted,
          border: `1px solid ${T.goldBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ShoppingBag size={28} strokeWidth={1.5} color={T.gold} />
      </div>
      <div style={{ textAlign: "center", maxWidth: 260 }}>
        <div style={{ fontSize: 17, fontWeight: 500, color: T.textPrimary, marginBottom: 6 }}>
          No listings yet
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.5, color: T.textTertiary }}>
          Be the first to list something in your building. Your neighbors are waiting.
        </div>
      </div>
    </div>
  );
}

// ─── Main Prototype Page ───
export default function MarketplacePrototype() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"services" | "feed" | "marketplace">("marketplace");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [listings, setListings] = useState<Listing[]>(MOCK_LISTINGS);
  const [showEmpty, setShowEmpty] = useState(false);

  // ─── Marketplace Search ───
  const [marketplaceQuery, setMarketplaceQuery] = useState("");

  // ─── Neighbor Directory ───
  const [showNeighborDir, setShowNeighborDir] = useState(false);

  // ─── Service Tile Tap → Living Building transition ───
  const [showLivingBuilding, setShowLivingBuilding] = useState(false);
  const [pendingServiceLabel, setPendingServiceLabel] = useState<string | null>(null);
  const [activeServiceChat, setActiveServiceChat] = useState<string | null>(null);

  // ─── Messaging State ───
  const [showInbox, setShowInbox] = useState(false);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const filteredListings = listings.filter((l) => {
    const matchesCategory = activeCategory === "All" || l.category === activeCategory;
    const q = marketplaceQuery.toLowerCase().trim();
    const matchesSearch = !q || l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q) || l.category.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const toggleLike = useCallback((id: string) => {
    setListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, liked: !l.liked } : l))
    );
  }, []);

  // Open inbox from header chat icon
  const openInbox = useCallback(() => {
    setShowInbox(true);
  }, []);

  // Select a conversation from inbox
  const openConversation = useCallback((conv: Conversation) => {
    // Clear unread when opening
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
    );
    setActiveConversation({ ...conv, unreadCount: 0 });
  }, []);

  // Back from conversation to inbox
  const backToInbox = useCallback(() => {
    setActiveConversation(null);
  }, []);

  // Back from inbox to main
  const closeInbox = useCallback(() => {
    setShowInbox(false);
    setActiveConversation(null);
  }, []);

  // "I can help" from Building Feed → open a neighbor DM
  const handleFeedDM = useCallback((neighborName: string) => {
    const existingConv = conversations.find(
      (c) => c.type === "neighbor" && c.name === neighborName
    );
    if (existingConv) {
      setConversations((prev) =>
        prev.map((c) => (c.id === existingConv.id ? { ...c, unreadCount: 0 } : c))
      );
      setActiveConversation({ ...existingConv, unreadCount: 0 });
      setShowInbox(true);
    } else {
      const newConv: Conversation = {
        id: `conv-neighbor-${Date.now()}`,
        type: "neighbor",
        name: neighborName,
        avatar: neighborName.charAt(0),
        lastMessage: "Hey, I can help with that!",
        lastMessageTime: "Just now",
        unreadCount: 0,
        isOnline: true,
        lastMessageSent: true,
        lastMessageRead: false,
      };
      setConversations((prev) => [...prev, newConv]);
      setActiveConversation(newConv);
      setShowInbox(true);
    }
  }, [conversations]);

  // "Message Seller" from listing detail → create/open marketplace DM
  const handleMessage = useCallback(() => {
    if (!selectedListing) return;

    // Check if conversation already exists for this listing
    const existingConv = conversations.find(
      (c) => c.type === "marketplace" && c.listingTitle === selectedListing.title
    );

    if (existingConv) {
      // Open existing conversation
      setSelectedListing(null);
      setActiveConversation({ ...existingConv, unreadCount: 0 });
      setShowInbox(true);
    } else {
      // Create new conversation for this listing
      const newConv: Conversation = {
        id: `conv-new-${selectedListing.id}`,
        type: "marketplace",
        name: selectedListing.sellerName,
        avatar: selectedListing.sellerName.charAt(0),
        lastMessage: `Hi, is the ${selectedListing.title} still available?`,
        lastMessageTime: "Just now",
        unreadCount: 0,
        isOnline: true,
        listingTitle: selectedListing.title,
        listingImage: selectedListing.image,
        listingPrice: selectedListing.price,
        lastMessageSent: true,
        lastMessageRead: false,
      };
      setConversations((prev) => [prev[0], newConv, ...prev.slice(1)]);
      setSelectedListing(null);
      setActiveConversation(newConv);
      setShowInbox(true);
    }
  }, [selectedListing, conversations]);

  return (
    <div
      style={{
        minHeight: "100vh",
        maxWidth: 430,
        margin: "0 auto",
        background: T.canvas,
        fontFamily: T.font,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ─── App Header ─── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: `1px solid ${T.border}`,
          background: T.canvas,
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={() => setLocation("/")}
            aria-label="Back to chat"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              border: `1px solid ${T.border}`,
              background: T.surface,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <ArrowLeft size={18} color={T.textSecondary} strokeWidth={1.8} />
          </button>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: T.goldMuted,
              border: `1px solid ${T.goldBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 600,
              color: T.gold,
            }}
          >
            R
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <span style={{ fontSize: 17, fontWeight: 600, color: T.textPrimary, letterSpacing: "-0.01em" }}>
                BLDG
              </span>
              <span style={{ fontSize: 17, fontWeight: 600, color: T.gold }}>.</span>
              <span style={{ fontSize: 17, fontWeight: 400, color: T.textSecondary }}>chat</span>
            </div>
            {/* Neighbor count badge */}
            <button
              onClick={() => setShowNeighborDir(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                borderRadius: 20,
                background: T.goldMuted,
                border: `1px solid ${T.goldBorder}`,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <Users size={11} color={T.gold} />
              <span style={{ fontSize: 11, fontWeight: 600, color: T.gold, fontFamily: T.font }}>47</span>
            </button>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={openInbox}
            style={{
              position: "relative",
              width: 36,
              height: 36,
              borderRadius: 10,
              background: T.surfaceRaised,
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <MessageCircle size={18} strokeWidth={1.5} color={T.textSecondary} />
            {totalUnread > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  background: T.gold,
                  border: `2px solid ${T.canvas}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 4px",
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, color: "#FFFFFF", lineHeight: 1 }}>
                  {totalUnread}
                </span>
              </div>
            )}
          </button>
          <button
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: T.surfaceRaised,
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Phone size={18} strokeWidth={1.5} color={T.textSecondary} />
          </button>
        </div>
      </header>

      {/* ─── Content Area ─── */}
      <AnimatePresence mode="wait">
        {mode === "services" ? (
          <motion.div
            key="services"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            style={{ paddingBottom: 140 }}
          >
            {/* Service Tiles Grid */}
            <div style={{ padding: "16px 20px 12px" }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: T.textTertiary,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  marginBottom: 12,
                }}
              >
                Book a service
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gridAutoRows: "1fr",
                  gap: 10,
                }}
              >
                {SERVICE_TILES.map((tile, i) => (
                  <ServiceTile
                    key={tile.label}
                    {...tile}
                    index={i}
                    onTap={() => {
                      setPendingServiceLabel(tile.label);
                      setShowLivingBuilding(true);
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Recent Activity / Quick Actions */}
            <div style={{ padding: "8px 20px" }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: T.textTertiary,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  marginBottom: 12,
                }}
              >
                Recent
              </div>
              {[
                { icon: Shirt, text: "Laundry pickup — Tomorrow 10am", sub: "CleanLux · Confirmed", accent: "#4CAF50" },
                { icon: Car, text: "Car detail — Saturday 10am", sub: "AutoShine Mobile · Pending", accent: T.gold },
                { icon: Wrench, text: "Faucet repair — Completed", sub: "FixIt Pro · Rated ★★★★★", accent: T.textTertiary },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.06, ...springs.micro }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: T.surfaceRaised,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <item.icon size={18} strokeWidth={1.6} color={T.textSecondary} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: T.textPrimary }}>{item.text}</div>
                    <div style={{ fontSize: 12, color: T.textTertiary, marginTop: 2 }}>
                      <span style={{ color: item.accent, fontWeight: 500 }}>•</span> {item.sub}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : mode === "feed" ? (
          <motion.div
            key="feed"
            initial={{ opacity: 0, x: 0 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              height: "calc(100vh - 180px)",
              overflowY: "auto",
              paddingBottom: 130,
            }}
          >
            <BuildingFeed onOpenDM={handleFeedDM} />
          </motion.div>
        ) : (
          <motion.div
            key="marketplace"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Category pills */}
            <div style={{ paddingTop: 4, paddingBottom: 16 }}>
              <CategoryPills
                categories={CATEGORIES}
                active={activeCategory}
                onChange={setActiveCategory}
              />
            </div>

            {/* Listings grid */}
            {showEmpty || filteredListings.length === 0 ? (
              <MarketplaceEmpty />
            ) : (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: stagger } }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 12,
                  padding: "0 20px 120px",
                }}
              >
                {filteredListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    onTap={() => setSelectedListing(listing)}
                    onLike={() => toggleLike(listing.id)}
                  />
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Create Listing FAB ─── */}
      <AnimatePresence>
        {mode === "marketplace" && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={springs.snap}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowCreateSheet(true)}
            style={{
              position: "fixed",
              bottom: 24,
              right: 24,
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: T.gold,
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(201, 169, 97, 0.35), 0 2px 6px rgba(0,0,0,0.08)",
              zIndex: 40,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ─── Listing Detail Sheet ─── */}
      <AnimatePresence>
        {selectedListing && (
          <ListingDetailSheet
            listing={selectedListing}
            onClose={() => setSelectedListing(null)}
            onMessage={handleMessage}
          />
        )}
      </AnimatePresence>

      {/* ─── Create Listing Sheet ─── */}
      <AnimatePresence>
        {showCreateSheet && (
          <CreateListingSheet onClose={() => setShowCreateSheet(false)} />
        )}
      </AnimatePresence>

      {/* ─── Bottom Bar: Mode Pill + Composer ─── */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 430,
          background: T.canvas,
          borderTop: `1px solid ${T.border}`,
          padding: "8px 20px",
          paddingBottom: "max(10px, env(safe-area-inset-bottom))",
          zIndex: 35,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          alignItems: "center",
        }}
      >
        {/* Mode Pill — always visible */}
        <BottomModePill
          mode={mode}
          onSelect={setMode}
        />

        {/* Search — marketplace mode */}
        {mode === "marketplace" && (
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: T.radiusSm,
              border: `1px solid ${T.border}`,
              background: T.surface,
            }}
          >
            <Search size={16} color={T.textTertiary} style={{ flexShrink: 0 }} />
            <input
              type="text"
              value={marketplaceQuery}
              onChange={(e) => setMarketplaceQuery(e.target.value)}
              placeholder="Search listings..."
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                fontSize: 15,
                color: T.textPrimary,
                fontFamily: T.font,
                outline: "none",
              }}
            />
            {marketplaceQuery && (
              <button
                onClick={() => setMarketplaceQuery("")}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  background: T.border,
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <X size={12} color={T.textSecondary} />
              </button>
            )}
          </div>
        )}

        {/* Favor composer — feed mode */}
        {mode === "feed" && (
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: T.radiusSm,
              border: `1px solid ${T.border}`,
              background: T.surface,
            }}
          >
            <HandHeart size={15} color={T.textTertiary} style={{ flexShrink: 0 }} />
            <input
              id="favor-composer"
              type="text"
              placeholder="Need a favor or sharing something good?"
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                fontSize: 14,
                color: T.textPrimary,
                fontFamily: T.font,
                outline: "none",
              }}
            />
            <button
              onClick={() => {
                const input = document.getElementById("favor-composer") as HTMLInputElement;
                if (input && input.value.trim()) {
                  // Dispatch a custom event that BuildingFeed listens to
                  const event = new CustomEvent("post-favor", { detail: input.value.trim() });
                  window.dispatchEvent(event);
                  input.value = "";
                }
              }}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: T.gold,
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Send size={14} color="#FFFFFF" />
            </button>
          </div>
        )}

        {/* Composer — only in services mode */}
        {mode === "services" && (
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: T.radiusSm,
              border: `1px solid ${T.border}`,
              background: T.surface,
            }}
          >
            <input
              type="text"
              placeholder="Type what you need..."
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                fontSize: 15,
                color: T.textPrimary,
                fontFamily: T.font,
                outline: "none",
              }}
            />
            <button
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: T.gold,
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                opacity: 0.5,
              }}
            >
              <Send size={15} color="#FFFFFF" />
            </button>
          </div>
        )}
      </div>

      {/* ─── Inbox Overlay ─── */}
      <AnimatePresence>
        {showInbox && !activeConversation && (
          <InboxList
            conversations={conversations}
            onSelectConversation={openConversation}
            onBack={closeInbox}
          />
        )}
      </AnimatePresence>

      {/* ─── Conversation Thread Overlay ─── */}
      <AnimatePresence>
        {activeConversation && (
          <ConversationThread
            conversation={activeConversation}
            onBack={backToInbox}
          />
        )}
      </AnimatePresence>

      {/* ─── Service Chat Thread Overlay ─── */}
      <AnimatePresence>
        {activeServiceChat && (
          <ServiceChatThread
            serviceLabel={activeServiceChat}
            onBack={() => setActiveServiceChat(null)}
          />
        )}
      </AnimatePresence>

      {/* ─── Neighbor Directory Overlay ─── */}
      <AnimatePresence>
        {showNeighborDir && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 60,
              borderRadius: "inherit",
              overflow: "hidden",
            }}
          >
            <NeighborGraph onClose={() => setShowNeighborDir(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Living Building Transition Overlay ─── */}
      <AnimatePresence>
        {showLivingBuilding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 70,
              borderRadius: "inherit",
              overflow: "hidden",
            }}
          >
            <LivingBuildingTransition
              onComplete={() => {
                setShowLivingBuilding(false);
                // Open the service-specific AI chat thread
                setActiveServiceChat(pendingServiceLabel);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
