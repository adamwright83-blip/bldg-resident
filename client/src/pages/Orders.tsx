// ============================================
// BLDG OrdersPage
// Page title: "Orders" — DM Serif Display, 24px
// Segmented control: Active | Past
// Order cards with status tracking
// Tap to expand receipt
// ============================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shirt, Sparkles, Scissors, ChevronDown } from "lucide-react";
import { springs, stagger, listItemVariants } from "@/lib/springs";
import { useApp, type Order } from "@/contexts/AppContext";
import SegmentControl from "@/components/home/SegmentControl";

const serviceIcons = {
  laundry: Shirt,
  "dry-cleaning": Sparkles,
  grooming: Scissors,
};

const statusConfig: Record<string, { color: string; label: string }> = {
  scheduled: { color: "var(--status-pending)", label: "SCHEDULED" },
  collected: { color: "var(--status-active)", label: "COLLECTED" },
  "pending-intake": { color: "var(--status-pending)", label: "PENDING INTAKE" },
  charged: { color: "var(--status-active)", label: "CHARGED" },
  delivered: { color: "var(--status-complete)", label: "DELIVERED" },
};

function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = serviceIcons[order.service] || Shirt;
  const status = statusConfig[order.status];

  return (
    <motion.button
      variants={listItemVariants}
      transition={springs.page}
      onClick={() => setExpanded(!expanded)}
      className="bldg-card w-full text-left"
      style={{ cursor: "pointer" }}
    >
      <div className="flex items-start gap-3">
        <Icon size={20} strokeWidth={1.5} color="var(--text-secondary)" style={{ flexShrink: 0, marginTop: 2 }} />

        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>
              {order.service === "dry-cleaning" ? "Dry Cleaning" : order.service.charAt(0).toUpperCase() + order.service.slice(1)} · #{order.orderNumber}
            </span>
            <ChevronDown
              size={16}
              strokeWidth={1.5}
              color="var(--text-tertiary)"
              style={{
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
          </div>

          {/* Status */}
          <div className="flex items-center gap-1.5">
            <span className="status-dot" style={{ background: status.color }} />
            <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.05em", color: "var(--text-secondary)" }}>
              {status.label}
            </span>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {order.total || "Total after intake"}
            </span>
          </div>

          {/* Pickup info */}
          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            {order.pickupWindow} · {order.pickupLocation}
          </span>
        </div>
      </div>

      {/* Expanded Receipt */}
      <AnimatePresence>
        {expanded && order.receipt && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              {/* Receipt Items */}
              <div className="flex flex-col gap-2" style={{ fontFamily: "var(--font-body)" }}>
                {order.receipt.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span
                      style={{
                        fontSize: 13,
                        color: item.isDiscount ? "var(--status-active)" : "var(--text-secondary)",
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: item.isDiscount ? "var(--status-active)" : "var(--text-primary)",
                        fontWeight: 500,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {item.amount}
                    </span>
                  </div>
                ))}

                {/* Divider */}
                <div style={{ height: 1, background: "var(--border-subtle)", margin: "4px 0" }} />

                {/* Total */}
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                    Total charged
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                    {order.finalTotal}
                  </span>
                </div>

                {/* Payment */}
                <span style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>
                  Visa ····4242
                </span>

                {/* Timestamps */}
                {order.collectedAt && (
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                    Collected: {order.collectedAt}
                  </span>
                )}
                {order.deliveredAt && (
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                    Delivered: {order.deliveredAt}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export default function OrdersPage() {
  const { state } = useApp();
  const [segment, setSegment] = useState(0);

  const activeOrders = state.orders.filter(
    (o) => o.status !== "delivered"
  );
  const pastOrders = state.orders.filter(
    (o) => o.status === "delivered"
  );

  const orders = segment === 0 ? activeOrders : pastOrders;

  return (
    <div className="flex flex-col" style={{ padding: "16px 20px 32px" }}>
      <h1
        className="font-display"
        style={{ fontSize: 24, color: "var(--text-primary)", marginBottom: 20 }}
      >
        Orders
      </h1>

      <div style={{ marginBottom: 20 }}>
        <SegmentControl
          segments={["Active", "Past"]}
          active={segment}
          onChange={setSegment}
        />
      </div>

      {orders.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-3"
          style={{ paddingTop: 64 }}
        >
          <span style={{ fontSize: 15, color: "var(--text-secondary)" }}>
            {segment === 0 ? "No active orders" : "No past orders"}
          </span>
          <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
            Book a service from the Home tab to get started.
          </span>
        </div>
      ) : (
        <motion.div
          className="flex flex-col gap-3"
          initial="hidden"
          animate="visible"
          variants={{ visible: stagger }}
        >
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </motion.div>
      )}
    </div>
  );
}
