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
import { CheckCircle2 } from "lucide-react";

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
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
