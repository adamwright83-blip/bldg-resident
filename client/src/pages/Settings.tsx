// ============================================
// Settings — Profile, Payment, Support, Terms/Privacy
// UI only; reuses existing profile data and Stripe flow.
// ============================================

import { useEffect, useState } from "react";
import { ArrowLeft, MessageCircle, FileText, Shield, LogOut } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { PaymentMethodForm } from "@/components/PaymentMethodForm";
import { SUPPORT_PHONE_SMS } from "@/const";
import { isResidentAppTestMode } from "@/lib/residentTestMode";
import { useAuth } from "@/_core/hooks/useAuth";

const STRIPE_PUBLISHABLE_FALLBACK =
  "pk_test_51T0xPHCs30FtFkcGlu6o0Tz9GiFtvXGwVT8mTP6NlFf2HMnZQrPxGsohxnMWifKcq6Bxy0wgoDW3VAly6IuOKr8W000xZJFVx2";
const stripePublishableKey =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim() ||
  (import.meta.env.DEV ? STRIPE_PUBLISHABLE_FALLBACK : "");
const stripeInitError = stripePublishableKey ? null : "Stripe publishable key is unavailable.";
const stripePromise =
  stripeInitError || isResidentAppTestMode ? null : loadStripe(stripePublishableKey);

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
  const [email, setEmail] = useState("");
  const preferencesMutation = trpc.chat.updateReceiptEmailPreferences.useMutation();
  const { logout } = useAuth();
  useEffect(() => setEmail(user?.email ?? ""), [user?.email]);

  const saveEmail = async () => {
    const next = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(next)) return;
    await preferencesMutation.mutateAsync({ email: next, enabled: true, prompted: true });
  };

  const logoutResident = async () => {
    await logout();
    localStorage.removeItem("bldg_onboarding_complete");
    window.location.href = "/";
  };

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

        <section className="settings-section">
          <h2 className="settings-section-title">Digital Receipts</h2>
          <input aria-label="Receipt email" className="h-12 w-full rounded-xl border border-[#d8d0c4] bg-white px-4" onChange={event => setEmail(event.target.value)} placeholder="you@example.com" type="email" value={email} />
          <label className="mt-4 flex items-center justify-between gap-4 text-sm">
            <span>Email my receipts</span>
            <input checked={user?.emailReceiptsEnabled ?? false} disabled={!user?.email} onChange={event => void preferencesMutation.mutateAsync({ enabled: event.target.checked })} type="checkbox" />
          </label>
          <button className="mt-4 rounded-xl bg-[#2b241d] px-5 py-3 text-sm text-white disabled:opacity-50" disabled={!/^\S+@\S+\.\S+$/.test(email.trim()) || preferencesMutation.isPending} onClick={() => void saveEmail()} type="button">Save receipt email</button>
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
            {stripePromise || isResidentAppTestMode ? (
              <Elements stripe={stripePromise}>
                <PaymentMethodForm onSuccess={onPaymentSaved ?? (() => {})} />
              </Elements>
            ) : (
              <p className="settings-payment-unavailable">Card setup is temporarily unavailable.</p>
            )}
          </div>
        </section>

        <section className="settings-section">
          <button className="settings-link text-red-700" onClick={() => void logoutResident()} type="button">
            <LogOut size={18} />
            <span>Log out</span>
          </button>
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
