// ============================================
// BLDG BuildingFeed — Community posts
// Avatar + name + timestamp + post text
// Reply count badge, "+" button
// Matches screenshot exactly
// ============================================

import { motion } from "framer-motion";
import { listItemVariants, stagger, springs } from "@/lib/springs";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface FeedPost {
  id: string;
  name: string;
  avatar: string;
  timestamp: string;
  body: string;
  replyCount?: number;
}

const feedPosts: FeedPost[] = [
  {
    id: "1",
    name: "Jenny M.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face",
    timestamp: "",
    body: "This Friday is the yoga class at 10am at the community gym if anyone wants to join \u{1F9D8}",
    replyCount: 3,
  },
  {
    id: "2",
    name: "Connor F.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
    timestamp: "2days ago",
    body: "Does anyone have a ladder I can borrow? I'll return it by tomorrow. \u{1F44D}",
  },
];

export default function BuildingFeed() {
  return (
    <div className="flex flex-col gap-3">
      <h2
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#9B9590",
        }}
      >
        Building Feed
      </h2>

      <motion.div
        className="flex flex-col gap-0"
        initial="hidden"
        animate="visible"
        variants={{ visible: stagger }}
      >
        {feedPosts.map((post) => (
          <motion.div
            key={post.id}
            variants={listItemVariants}
            transition={springs.page}
            style={{
              padding: "14px 0",
              borderBottom: "1px solid #EDE9E3",
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            {/* Avatar */}
            <img
              src={post.avatar}
              alt={post.name}
              style={{
                width: 36,
                height: 36,
                borderRadius: 9999,
                objectFit: "cover",
                flexShrink: 0,
              }}
            />

            {/* Content */}
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 14, fontWeight: 500, color: "#9B9590" }}>
                  {post.name}
                </span>
                {post.timestamp && (
                  <span style={{ fontSize: 12, color: "#B5AFA8" }}>
                    {post.timestamp}
                  </span>
                )}
              </div>
              <p style={{
                fontSize: 14,
                color: "#4A4540",
                lineHeight: 1.45,
                margin: 0,
              }}>
                {post.body}
              </p>
            </div>

            {/* Reply count or + button */}
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
              {post.replyCount ? (
                <span
                  style={{
                    fontSize: 12,
                    color: "#9B9590",
                    background: "#F0ECE6",
                    borderRadius: 9999,
                    padding: "3px 10px",
                    fontWeight: 500,
                  }}
                >
                  {post.replyCount}↑
                </span>
              ) : (
                <button
                  onClick={() => toast("Reply feature coming soon")}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9999,
                    background: "#FFFFFF",
                    border: "1px solid #E8E3DC",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  <Plus size={16} strokeWidth={2} color="#9B9590" />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
