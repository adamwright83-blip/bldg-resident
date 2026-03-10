// ============================================
// Settings — Profile, Payment, Support, Terms/Privacy
// UI only; reuses existing profile data and Stripe flow.
// ============================================

import { ArrowLeft, MessageCircle, FileText, Shield } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { PaymentMethodForm } from "@/components/PaymentMethodForm";
import { SUPPORT_PHONE_SMS } from "@/const";

const STRIPE_PUBLISHABLE_FALLBACK =
  "pk_test_51T0xPHCs30FtFkcGlu6o0Tz9GiFtvXGwVT8mTP6NlFf2HMnZQrPxGsohxnMWifKcq6Bxy0wgoDW3VAly6IuOKr8W000xZJFVx2";
const stripePublishableKey =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim() || STRIPE_PUBLISHABLE_FALLBACK;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    const area = digits.slice(1, 4);
    const mid = digits.slice(4, 7);
    const last = digits.slice(7);
    return `(${area}) ${mid}-${last}`;
  }
  return phone;
}

function formatBuilding(slug: string | null | undefined): string {
  if (!slug) return "—";
  if (slug.includes("opus")) return "Opus LA";
  if (slug.includes("century")) return "Century Park East";
  return slug;
}

interface SettingsProps {
  onBack: () => void;
  onPaymentSaved?: () => void;
}

export default function Settings({ onBack, onPaymentSaved }: SettingsProps) {
  const { data: profileData } = trpc.chat.getVaultProfile.useQuery();
  const user = profileData?.user || null;

  return (
    <div className="settings-container">
      <div className="settings-header">
        <button type="button" className="settings-back" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <span className="settings-title">Settings</span>
        <div style={{ width: 36 }} />
      </div>

      <div className="settings-content">
        {/* Profile */}
        <section className="settings-section">
          <h2 className="settings-section-title">Profile</h2>
          <div className="settings-field">
            <span className="settings-label">Name</span>
            <span className="settings-value">
              {[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "—"}
            </span>
          </div>
          <div className="settings-field">
            <span className="settings-label">Phone</span>
            <span className="settings-value">{formatPhone(user?.phoneE164)}</span>
          </div>
          <div className="settings-field">
            <span className="settings-label">Unit</span>
            <span className="settings-value">{user?.unit || "—"}</span>
          </div>
          <div className="settings-field">
            <span className="settings-label">Building</span>
            <span className="settings-value">{formatBuilding(user?.buildingSlug)}</span>
          </div>
        </section>

        {/* Payment */}
        <section className="settings-section">
          <h2 className="settings-section-title">Payment</h2>
          <div className="settings-field">
            <span className="settings-label">Payment Method</span>
            <span className="settings-value">
              {user?.paymentMethodSaved ? `•••• ${user.cardLast4 || "****"}` : "Not saved"}
            </span>
          </div>
          <div className="settings-payment-block">
            <span className="settings-payment-cta">Add / Update Card</span>
            {stripePromise ? (
              <Elements stripe={stripePromise}>
                <PaymentMethodForm onSuccess={onPaymentSaved ?? (() => {})} />
              </Elements>
            ) : (
              <p className="settings-payment-unavailable">Card setup is temporarily unavailable.</p>
            )}
          </div>
        </section>

        {/* Support */}
        <section className="settings-section">
          <h2 className="settings-section-title">Support</h2>
          <a href={SUPPORT_PHONE_SMS} className="settings-link">
            <MessageCircle size={18} />
            <span>Text Support</span>
          </a>
        </section>

        {/* Terms / Privacy */}
        <section className="settings-section">
          <h2 className="settings-section-title">Legal</h2>
          <a href="/terms" className="settings-link">
            <FileText size={18} />
            <span>Terms of Service</span>
          </a>
          <a href="/privacy" className="settings-link">
            <Shield size={18} />
            <span>Privacy Policy</span>
          </a>
        </section>
      </div>
    </div>
  );
}
