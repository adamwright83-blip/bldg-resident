import { useState, useEffect } from "react";
import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Lock } from "lucide-react";

interface PaymentMethodFormProps {
  onSuccess: () => void;
  dark?: boolean;
  defaultCardholderName?: string;
}

export function PaymentMethodForm({ onSuccess, dark = false, defaultCardholderName = "" }: PaymentMethodFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const publishableKey =
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim() ||
    "pk_test_51T0xPHCs30FtFkcGlu6o0Tz9GiFtvXGwVT8mTP6NlFf2HMnZQrPxGsohxnMWifKcq6Bxy0wgoDW3VAly6IuOKr8W000xZJFVx2";
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [last4, setLast4] = useState<string | null>(null);
  const [cardholderName, setCardholderName] = useState(defaultCardholderName);
  const [postalCode, setPostalCode] = useState("");
  const [initError, setInitError] = useState<string | null>(null);

  const savePaymentMethod = trpc.stripe.savePaymentMethod.useMutation({
    onSuccess: (data) => {
      setLoading(false);
      setSaved(true);
      if (data.last4) {
        setLast4(data.last4);
      }
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed to save payment method: ${error.message}`);
      setLoading(false);
    },
  });

  useEffect(() => {
    if (stripe && elements) {
      setInitError(null);
      return;
    }
    const timer = setTimeout(() => {
      setInitError(
        publishableKey
          ? "Secure card fields could not initialize. Refresh and try again."
          : "Stripe is not configured."
      );
    }, 5000);
    return () => clearTimeout(timer);
  }, [elements, publishableKey, stripe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast.error(initError || "Secure card fields are still loading.");
      return;
    }

    setLoading(true);

    const cardNumberElement = elements.getElement(CardNumberElement);
    if (!cardNumberElement) {
      toast.error("Card number field not ready");
      setLoading(false);
      return;
    }

    try {
      // Create payment method
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardNumberElement,
        billing_details: {
          name: cardholderName.trim() || undefined,
          address: {
            postal_code: postalCode || undefined,
          },
        },
      });

      if (error) {
        toast.error(error.message || "Failed to create payment method");
        setLoading(false);
        return;
      }

      if (!paymentMethod) {
        toast.error("No payment method returned");
        setLoading(false);
        return;
      }

      // Save to backend
      await savePaymentMethod.mutateAsync({
        paymentMethodId: paymentMethod.id,
      });
    } catch (error) {
      console.error("[PaymentMethodForm] Error:", error);
      toast.error("An error occurred");
      setLoading(false);
    }
  };

  const stripeStyle = dark
    ? {
        base: {
          fontSize: "16px",
          color: "rgba(255,255,255,0.92)",
          fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          "::placeholder": { color: "rgba(255,255,255,0.35)" },
        },
        invalid: { color: "#f87171" },
      }
    : {
        base: {
          fontSize: "16px",
          color: "#000",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          "::placeholder": { color: "#999" },
        },
        invalid: { color: "#dc2626" },
      };

  const wrapCls = dark
    ? "bldg-pay-card"
    : "bg-white border border-gray-200 rounded-lg p-4 my-3 w-full";
  const fieldCls = dark
    ? "bldg-pay-field"
    : "border border-gray-300 rounded-lg p-4 bg-white";
  const zipCls = dark
    ? "bldg-pay-zip"
    : "mb-4 w-full border border-gray-300 rounded-lg px-4 py-3 text-base text-black placeholder:text-gray-400 bg-white";
  const btnCls = dark
    ? "bldg-pay-btn"
    : "w-full bg-black text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed";
  const confirmCls = dark
    ? "bldg-pay-confirm"
    : "flex items-center gap-2.5 bg-white border border-gray-200 rounded-lg p-4 my-3 w-full";

  return (
    <AnimatePresence mode="wait">
      {saved ? (
        <motion.div
          key="confirmation"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={confirmCls}
        >
          <CheckCircle2 className={`w-5 h-5 shrink-0 ${dark ? "text-[#4ADE80]" : "text-green-600"}`} />
          <span className={dark ? "text-sm text-white/80" : "text-sm text-[#4A4540]"}>
            {last4 ? `Card ending in ${last4} saved.` : "Payment method saved."}
          </span>
        </motion.div>
      ) : (
        <motion.div
          key="form"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className={wrapCls}
        >
          <form onSubmit={handleSubmit} className="w-full">
            {!stripe || !elements ? (
              <div className={`mb-4 w-full ${fieldCls}`} style={{ minHeight: "48px" }}>
                <span className={dark ? "text-sm text-white/50" : "text-sm text-[#4A4540]"}>
                  {initError || "Initializing secure card fields..."}
                </span>
              </div>
            ) : (
              <>
                <input
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  placeholder="Name on card"
                  className={dark ? "bldg-pay-zip" : zipCls}
                  style={{ marginBottom: "12px" }}
                  autoComplete="cc-name"
                />
                <div className={`mb-3 w-full ${fieldCls}`} style={{ minHeight: "48px" }}>
                  <CardNumberElement options={{ style: stripeStyle }} />
                </div>
                <div className="mb-3 grid grid-cols-2 gap-3">
                  <div className={fieldCls} style={{ minHeight: "48px" }}>
                    <CardExpiryElement options={{ style: stripeStyle }} />
                  </div>
                  <div className={fieldCls} style={{ minHeight: "48px" }}>
                    <CardCvcElement options={{ style: stripeStyle }} />
                  </div>
                </div>
                <input
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="ZIP"
                  className={zipCls}
                  autoComplete="postal-code"
                  inputMode="numeric"
                />
              </>
            )}
            <button
              type="submit"
              disabled={!stripe || !elements || loading}
              className={btnCls}
              style={dark ? undefined : { height: '48px' }}
            >
              {loading ? "Saving..." : "Save"}
            </button>
            {dark && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '5px', marginTop: '14px', opacity: 0.3,
              }}>
                <Lock size={10} color="rgba(255,255,255,0.9)" />
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.9)', letterSpacing: '0.04em', fontFamily: 'DM Sans, sans-serif' }}>
                  Secured by
                </span>
                {/* Stripe wordmark */}
                <svg width="34" height="14" viewBox="0 0 60 25" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.9, marginTop: '1px' }}>
                  <path d="M7.5 10.2c0-.66.54-1.02 1.44-1.02 1.26 0 2.88.42 4.14 1.14V6.72c-1.38-.54-2.76-.78-4.14-.78C5.7 5.94 3.6 7.74 3.6 10.38c0 4.08 5.58 3.42 5.58 5.16 0 .78-.66 1.08-1.62 1.08-1.38 0-3.18-.6-4.56-1.38v3.66c1.56.66 3.12.96 4.56.96 3.42 0 5.76-1.68 5.76-4.38-.06-4.38-5.82-3.6-5.82-5.28zM22.02 5.34l-2.76.6-.06 12.36h3.9V5.34h-1.08zm-3.78 1.5l-.06-.3H14.7V18.3h3.9V11.1c.9-1.14 2.46-.96 2.94-.78V6.84c-.48-.18-2.22-.48-3.3 0zm11.1-.84c-4.14 0-6.6 3.48-6.6 6.6 0 3.9 2.76 6.6 6.78 6.6 1.92 0 3.36-.42 4.44-1.14V14.4c-1.02.66-2.28 1.02-3.6 1.02-1.44 0-2.7-.6-2.94-2.04h7.38c0-.24.06-.84.06-1.14 0-3.18-1.68-6.24-5.52-6.24zm-2.1 5.1c.18-1.44 1.14-2.1 2.1-2.1.9 0 1.8.66 1.98 2.1h-4.08zm15.06-5.1c-1.5 0-2.46.72-3 1.2l-.18-.96H35.7V21.9l3.9-.84v-3.6c.54.42 1.38.9 2.7.9 2.76 0 5.22-2.16 5.22-6.78 0-4.2-2.46-6.42-5.22-6.42zm-.9 9.84c-.9 0-1.44-.3-1.8-.72V10.8c.42-.48.96-.78 1.8-.78 1.38 0 2.34 1.56 2.34 3.42 0 1.92-.96 3.42-2.34 3.42zm12.96-9.84c-1.5 0-2.46.72-3 1.2l-.18-.96h-3.42V18.3h3.9v-8.52c.54-.72 1.44-1.02 2.34-1.02.3 0 .6.06.9.12V6.06c-.18-.06-.36-.06-.54-.06z" fill="rgba(255,255,255,0.9)"/>
                </svg>
              </div>
            )}
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
