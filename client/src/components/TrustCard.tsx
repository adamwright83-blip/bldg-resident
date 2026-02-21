// ============================================
// TrustCard — Elevated card for post-booking
// profile collection during onboarding.
//
// Non-payment cards get a gold accent border
// and a subtle arrow pointing to the composer
// to signal "type your answer below."
//
// Payment step gets the Stripe badge.
// ============================================

import { motion } from "framer-motion";
import { Lock, Shield, ChevronDown } from "lucide-react";

interface TrustCardProps {
  /** The collection step type */
  collectType: "address" | "name" | "phone" | "payment" | "unit" | "info";
  /** The message content */
  content: string;
  /** Optional children (e.g., Stripe payment form) */
  children?: React.ReactNode;
}

const STEP_LABELS: Record<string, string> = {
  address: "Pickup Details",
  unit: "Pickup Details",
  name: "Account Setup",
  phone: "Account Setup",
  payment: "Secure Payment",
  info: "Account Setup",
};

export default function TrustCard({ collectType, content, children }: TrustCardProps) {
  const isPayment = collectType === "payment";
  const isAction = !isPayment; // Non-payment cards are "action" cards
  const label = STEP_LABELS[collectType] || "Account Setup";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`trust-card${isAction ? " trust-card-action" : ""}`}
    >
      {/* Header bar */}
      <div className="trust-card-header">
        <div className="trust-card-badge">
          {isPayment ? (
            <Shield size={12} strokeWidth={2.5} />
          ) : (
            <Lock size={11} strokeWidth={2.5} />
          )}
          <span>{label}</span>
        </div>
        <span className="trust-card-wordmark">BLDG.chat</span>
      </div>

      {/* Message content */}
      <p className="trust-card-content">{content}</p>

      {/* Arrow hint for non-payment action cards */}
      {isAction && (
        <div className="trust-card-hint">
          <ChevronDown size={14} strokeWidth={2} />
          <span>Reply below</span>
        </div>
      )}

      {/* Optional children (Stripe form, etc.) */}
      {children && <div className="trust-card-body">{children}</div>}

      {/* Stripe badge for payment step */}
      {isPayment && (
        <div className="trust-card-stripe-badge">
          <Lock size={10} strokeWidth={2.5} />
          <span>Secured by Stripe</span>
        </div>
      )}
    </motion.div>
  );
}
