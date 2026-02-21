// ============================================
// BLDG ProfilePage
// Page title: "Profile" — DM Serif Display, 24px
// Sections: User info, Preferences, Payment,
// Notifications, About
// ============================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { springs } from "@/lib/springs";
import {
  User,
  Shirt,
  CreditCard,
  Bell,
  ChevronRight,
  Info,
  LogOut,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import BottomSheet from "@/components/layout/BottomSheet";
import { toast } from "sonner";

function ProfileRow({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: typeof User;
  label: string;
  value?: string;
  onClick?: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      transition={springs.micro}
      onClick={onClick}
      className="w-full text-left"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "16px 0",
        background: "transparent",
        border: "none",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <Icon size={20} strokeWidth={1.5} color="var(--text-secondary)" />
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span style={{ fontSize: 15, color: "var(--text-primary)" }}>{label}</span>
        {value && (
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{value}</span>
        )}
      </div>
      <ChevronRight size={16} strokeWidth={1.5} color="var(--text-tertiary)" />
    </motion.button>
  );
}

export default function ProfilePage() {
  const { state } = useApp();
  const [prefsSheet, setPrefsSheet] = useState(false);
  const [paymentSheet, setPaymentSheet] = useState(false);
  const [notifsSheet, setNotifsSheet] = useState(false);
  const [smsOrders, setSmsOrders] = useState(true);
  const [smsBuilding, setSmsBuilding] = useState(true);

  return (
    <div className="flex flex-col" style={{ padding: "16px 20px 32px" }}>
      <h1
        className="font-display"
        style={{ fontSize: 24, color: "var(--text-primary)", marginBottom: 24 }}
      >
        Profile
      </h1>

      {/* User Info Card */}
      <div
        className="bldg-card"
        style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 9999,
            background: "var(--surface-elevated)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span
            className="font-display"
            style={{ fontSize: 22, color: "var(--accent-warm)" }}
          >
            {state.user.name.charAt(0)}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span style={{ fontSize: 17, fontWeight: 500, color: "var(--text-primary)" }}>
            {state.user.name}
          </span>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Unit {state.user.unit} · {state.user.building}
          </span>
        </div>
      </div>

      {/* Settings List */}
      <div className="flex flex-col">
        <ProfileRow
          icon={Shirt}
          label="Laundry Preferences"
          value={`${state.preferences.waterTemp} water · ${state.preferences.softener ? "Softener" : "No softener"} · ${state.preferences.detergent}`}
          onClick={() => setPrefsSheet(true)}
        />
        <ProfileRow
          icon={CreditCard}
          label="Payment Method"
          value={`${state.user.paymentBrand} ····${state.user.paymentLast4}`}
          onClick={() => setPaymentSheet(true)}
        />
        <ProfileRow
          icon={Bell}
          label="Notification Settings"
          value="SMS for order updates"
          onClick={() => setNotifsSheet(true)}
        />
        <ProfileRow
          icon={Info}
          label="About BLDG"
          onClick={() => toast("Terms · Privacy · Support")}
        />
        <ProfileRow
          icon={LogOut}
          label="Sign Out"
          onClick={() => toast("Sign out coming soon")}
        />
      </div>

      {/* Preferences Sheet */}
      <BottomSheet isOpen={prefsSheet} onClose={() => setPrefsSheet(false)}>
        <div className="flex flex-col gap-6">
          <h2 className="font-display" style={{ fontSize: 20, color: "var(--text-primary)" }}>
            Laundry Preferences
          </h2>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label style={{ fontSize: 12, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 500 }}>
                Water Temperature
              </label>
              <div
                style={{
                  height: 48,
                  background: "var(--surface-base)",
                  border: "1px solid var(--border-visible)",
                  borderRadius: 12,
                  padding: "0 16px",
                  display: "flex",
                  alignItems: "center",
                  color: "var(--text-primary)",
                  fontSize: 15,
                }}
              >
                {state.preferences.waterTemp}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label style={{ fontSize: 12, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 500 }}>
                Detergent
              </label>
              <div
                style={{
                  height: 48,
                  background: "var(--surface-base)",
                  border: "1px solid var(--border-visible)",
                  borderRadius: 12,
                  padding: "0 16px",
                  display: "flex",
                  alignItems: "center",
                  color: "var(--text-primary)",
                  fontSize: 15,
                }}
              >
                {state.preferences.detergent}
              </div>
            </div>

            <div className="flex items-center justify-between" style={{ padding: "8px 0" }}>
              <span style={{ fontSize: 15, color: "var(--text-primary)" }}>Fabric Softener</span>
              <div
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 9999,
                  background: state.preferences.softener ? "var(--accent-warm)" : "var(--border-visible)",
                  padding: 2,
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 9999,
                    background: "white",
                    transform: state.preferences.softener ? "translateX(20px)" : "translateX(0)",
                    transition: "transform 0.2s",
                  }}
                />
              </div>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            transition={springs.micro}
            onClick={() => { setPrefsSheet(false); toast("Preferences saved"); }}
            className="bldg-btn-primary"
          >
            Save Preferences
          </motion.button>
        </div>
      </BottomSheet>

      {/* Payment Sheet */}
      <BottomSheet isOpen={paymentSheet} onClose={() => setPaymentSheet(false)}>
        <div className="flex flex-col gap-6">
          <h2 className="font-display" style={{ fontSize: 20, color: "var(--text-primary)" }}>
            Payment Method
          </h2>

          <div
            className="bldg-card"
            style={{ display: "flex", alignItems: "center", gap: 12 }}
          >
            <CreditCard size={24} strokeWidth={1.5} color="var(--accent-warm)" />
            <div className="flex flex-col gap-0.5">
              <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>
                {state.user.paymentBrand} ····{state.user.paymentLast4}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                Default payment method
              </span>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            transition={springs.micro}
            onClick={() => { setPaymentSheet(false); toast("Payment management coming soon"); }}
            className="bldg-btn-secondary"
          >
            Update Payment Method
          </motion.button>
        </div>
      </BottomSheet>

      {/* Notifications Sheet */}
      <BottomSheet isOpen={notifsSheet} onClose={() => setNotifsSheet(false)}>
        <div className="flex flex-col gap-6">
          <h2 className="font-display" style={{ fontSize: 20, color: "var(--text-primary)" }}>
            Notification Settings
          </h2>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between" style={{ padding: "14px 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <div className="flex flex-col gap-0.5">
                <span style={{ fontSize: 15, color: "var(--text-primary)" }}>Order Updates</span>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>SMS when items collected & delivered</span>
              </div>
              <button
                onClick={() => setSmsOrders(!smsOrders)}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 9999,
                  background: smsOrders ? "var(--accent-warm)" : "var(--border-visible)",
                  padding: 2,
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 9999,
                    background: "white",
                    transform: smsOrders ? "translateX(20px)" : "translateX(0)",
                    transition: "transform 0.2s",
                  }}
                />
              </button>
            </div>

            <div className="flex items-center justify-between" style={{ padding: "14px 0" }}>
              <div className="flex flex-col gap-0.5">
                <span style={{ fontSize: 15, color: "var(--text-primary)" }}>Building Notices</span>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Maintenance, events, packages</span>
              </div>
              <button
                onClick={() => setSmsBuilding(!smsBuilding)}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 9999,
                  background: smsBuilding ? "var(--accent-warm)" : "var(--border-visible)",
                  padding: 2,
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 9999,
                    background: "white",
                    transform: smsBuilding ? "translateX(20px)" : "translateX(0)",
                    transition: "transform 0.2s",
                  }}
                />
              </button>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            transition={springs.micro}
            onClick={() => { setNotifsSheet(false); toast("Notification settings saved"); }}
            className="bldg-btn-primary"
          >
            Save Settings
          </motion.button>
        </div>
      </BottomSheet>
    </div>
  );
}
