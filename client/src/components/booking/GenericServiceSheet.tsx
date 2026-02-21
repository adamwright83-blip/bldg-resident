// ============================================
// BLDG GenericServiceSheet
// Used for Dry Cleaning, Grooming, and Amenity bookings
// Same structure as LaundrySheet but simplified
// ============================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { springs } from "@/lib/springs";
import { ChevronDown, Check } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

interface GenericServiceSheetProps {
  serviceName: string;
  onConfirm: () => void;
}

const timeSlots = [
  "Today, 6–8pm",
  "Tomorrow, 10am–12pm",
  "Tomorrow, 6–8pm",
  "Wed, 10am–12pm",
  "Wed, 6–8pm",
];

const locations = ["Front Desk", "Unit Door", "Package Room"];

export default function GenericServiceSheet({ serviceName, onConfirm }: GenericServiceSheetProps) {
  const { state } = useApp();
  const [timeSlot, setTimeSlot] = useState(timeSlots[0]);
  const [location, setLocation] = useState(locations[0]);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  const isAmenity = ["Golf Simulator", "Golf Room", "Theater", "Pool Deck", "Lounge", "Event Spaces"].includes(serviceName);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-display" style={{ fontSize: 20, color: "var(--text-primary)" }}>
        {isAmenity ? `Reserve ${serviceName}` : `${serviceName} Pickup`}
      </h2>

      {/* Time Slot */}
      <div className="flex flex-col gap-2">
        <label style={{ fontSize: 12, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 500 }}>
          {isAmenity ? "Reservation Time" : "Pickup Window"}
        </label>
        <div className="relative">
          <button
            onClick={() => { setShowTimeDropdown(!showTimeDropdown); setShowLocationDropdown(false); }}
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
            <span>{timeSlot}</span>
            <ChevronDown size={18} strokeWidth={1.5} color="var(--text-tertiary)" />
          </button>
          <AnimatePresence>
            {showTimeDropdown && (
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
                {timeSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => { setTimeSlot(slot); setShowTimeDropdown(false); }}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      background: slot === timeSlot ? "var(--surface-elevated)" : "transparent",
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
                    {slot === timeSlot && <Check size={16} color="var(--accent-warm)" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Location (only for services, not amenities) */}
      {!isAmenity && (
        <div className="flex flex-col gap-2">
          <label style={{ fontSize: 12, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 500 }}>
            Location
          </label>
          <div className="relative">
            <button
              onClick={() => { setShowLocationDropdown(!showLocationDropdown); setShowTimeDropdown(false); }}
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
      )}

      {/* Pricing Note (only for services) */}
      {!isAmenity && (
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Final total confirmed after intake. Minimum order: $37.50
        </p>
      )}

      {/* Confirm Button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        transition={springs.micro}
        onClick={onConfirm}
        className="bldg-btn-primary"
      >
        {isAmenity ? "Confirm Reservation" : "Confirm Pickup"}
      </motion.button>

      {/* Saved Card (only for services) */}
      {!isAmenity && (
        <div className="flex items-center justify-center gap-1" style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          <span>{state.user.paymentBrand} ····{state.user.paymentLast4}</span>
          <span>·</span>
          <button style={{ color: "var(--accent-warm)", background: "transparent", border: "none", fontSize: 12 }}>
            Change
          </button>
        </div>
      )}
    </div>
  );
}
