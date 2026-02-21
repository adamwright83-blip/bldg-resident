// ============================================
// BLDG LaundrySheet — Booking flow
// Title: "LAUNDRY PICKUP" — DM Serif Display, 20px
// Pickup window, location, preferences
// Pricing note + Confirm button
// ============================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { springs } from "@/lib/springs";
import { ChevronDown, Check } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

interface LaundrySheetProps {
  onConfirm: () => void;
}

const pickupSlots = [
  "Today, 6–8pm",
  "Tomorrow, 10am–12pm",
  "Tomorrow, 6–8pm",
  "Wed, 10am–12pm",
  "Wed, 6–8pm",
];

const locations = ["Front Desk", "Unit Door", "Package Room"];

export default function LaundrySheet({ onConfirm }: LaundrySheetProps) {
  const { state } = useApp();
  const [pickupSlot, setPickupSlot] = useState(pickupSlots[0]);
  const [location, setLocation] = useState(locations[0]);
  const [showPrefs, setShowPrefs] = useState(false);
  const [showPickupDropdown, setShowPickupDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-display" style={{ fontSize: 20, color: "var(--text-primary)" }}>
        Laundry Pickup
      </h2>

      {/* Pickup Window */}
      <div className="flex flex-col gap-2">
        <label style={{ fontSize: 12, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 500 }}>
          Pickup Window
        </label>
        <div className="relative">
          <button
            onClick={() => { setShowPickupDropdown(!showPickupDropdown); setShowLocationDropdown(false); }}
            style={{
              width: "100%",
              height: 48,
              background: "var(--surface-base)",
              border: "1px solid var(--border-visible)",
              borderRadius: 12,
              padding: "0 16px",
              color: "var(--text-primary)",
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>{pickupSlot}</span>
            <ChevronDown size={18} strokeWidth={1.5} color="var(--text-tertiary)" />
          </button>
          <AnimatePresence>
            {showPickupDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  right: 0,
                  background: "var(--surface-overlay)",
                  border: "1px solid var(--border-visible)",
                  borderRadius: 12,
                  overflow: "hidden",
                  zIndex: 10,
                }}
              >
                {pickupSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => { setPickupSlot(slot); setShowPickupDropdown(false); }}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      background: slot === pickupSlot ? "var(--surface-elevated)" : "transparent",
                      border: "none",
                      color: "var(--text-primary)",
                      fontSize: 15,
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{slot}</span>
                    {slot === pickupSlot && <Check size={16} color="var(--accent-warm)" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Location */}
      <div className="flex flex-col gap-2">
        <label style={{ fontSize: 12, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 500 }}>
          Location
        </label>
        <div className="relative">
          <button
            onClick={() => { setShowLocationDropdown(!showLocationDropdown); setShowPickupDropdown(false); }}
            style={{
              width: "100%",
              height: 48,
              background: "var(--surface-base)",
              border: "1px solid var(--border-visible)",
              borderRadius: 12,
              padding: "0 16px",
              color: "var(--text-primary)",
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>{location}</span>
            <ChevronDown size={18} strokeWidth={1.5} color="var(--text-tertiary)" />
          </button>
          <AnimatePresence>
            {showLocationDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  right: 0,
                  background: "var(--surface-overlay)",
                  border: "1px solid var(--border-visible)",
                  borderRadius: 12,
                  overflow: "hidden",
                  zIndex: 10,
                }}
              >
                {locations.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => { setLocation(loc); setShowLocationDropdown(false); }}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      background: loc === location ? "var(--surface-elevated)" : "transparent",
                      border: "none",
                      color: "var(--text-primary)",
                      fontSize: 15,
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{loc}</span>
                    {loc === location && <Check size={16} color="var(--accent-warm)" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Preferences */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setShowPrefs(!showPrefs)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "transparent",
            border: "none",
            padding: 0,
            width: "100%",
          }}
        >
          <label style={{ fontSize: 12, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 500 }}>
            Preferences
          </label>
          <ChevronDown
            size={16}
            strokeWidth={1.5}
            color="var(--text-tertiary)"
            style={{
              transform: showPrefs ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          />
        </button>
        <div
          style={{
            padding: "10px 14px",
            background: "var(--surface-base)",
            borderRadius: 8,
            fontSize: 13,
            color: "var(--text-secondary)",
          }}
        >
          {state.preferences.waterTemp} water · {state.preferences.softener ? "Softener" : "No softener"} · {state.preferences.detergent}
        </div>
        <AnimatePresence>
          {showPrefs && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden" }}
            >
              <div
                style={{
                  padding: "12px 14px",
                  background: "var(--surface-raised)",
                  borderRadius: 8,
                  fontSize: 13,
                  color: "var(--text-tertiary)",
                  marginTop: 4,
                }}
              >
                Edit preferences in your Profile to update for future orders.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pricing Note */}
      <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
        Final total confirmed after intake. Minimum order: $37.50
      </p>

      {/* Confirm Button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        transition={springs.micro}
        onClick={onConfirm}
        className="bldg-btn-primary"
      >
        Confirm Pickup
      </motion.button>

      {/* Saved Card */}
      <div className="flex items-center justify-center gap-1" style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
        <span>{state.user.paymentBrand} ····{state.user.paymentLast4}</span>
        <span>·</span>
        <button style={{ color: "var(--accent-warm)", background: "transparent", border: "none", fontSize: 12 }}>
          Change
        </button>
      </div>
    </div>
  );
}
