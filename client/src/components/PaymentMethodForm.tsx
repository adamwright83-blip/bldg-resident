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
}

export function PaymentMethodForm({ onSuccess }: PaymentMethodFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const publishableKey =
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim() ||
    "pk_test_51T0xPHCs30FtFkcGlu6o0Tz9GiFtvXGwVT8mTP6NlFf2HMnZQrPxGsohxnMWifKcq6Bxy0wgoDW3VAly6IuOKr8W000xZJFVx2";
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [last4, setLast4] = useState<string | null>(null);
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

  return (
    <AnimatePresence mode="wait">
      {saved ? (
        <motion.div
          key="confirmation"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-lg p-4 my-3 w-full"
        >
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <span className="text-sm text-[#4A4540]">
            {last4 ? `Card ending in ${last4} saved.` : "Payment method saved."}
          </span>
        </motion.div>
      ) : (
        <motion.div
          key="form"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white border border-gray-200 rounded-lg p-4 my-3 w-full"
        >
          <form onSubmit={handleSubmit} className="w-full">
            {!stripe || !elements ? (
              <div className="mb-4 w-full border border-gray-300 rounded-lg p-4 bg-white text-sm text-[#4A4540]">
                {initError || "Initializing secure card fields..."}
              </div>
            ) : (
              <>
                <div className="mb-3 w-full border border-gray-300 rounded-lg p-4 bg-white" style={{ minHeight: "48px" }}>
                  <CardNumberElement
                    options={{
                      style: {
                        base: {
                          fontSize: "16px",
                          color: "#000",
                          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                          "::placeholder": { color: "#999" },
                        },
                        invalid: { color: "#dc2626" },
                      },
                    }}
                  />
                </div>
                <div className="mb-3 grid grid-cols-2 gap-3">
                  <div className="border border-gray-300 rounded-lg p-4 bg-white" style={{ minHeight: "48px" }}>
                    <CardExpiryElement
                      options={{
                        style: {
                          base: {
                            fontSize: "16px",
                            color: "#000",
                            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                            "::placeholder": { color: "#999" },
                          },
                          invalid: { color: "#dc2626" },
                        },
                      }}
                    />
                  </div>
                  <div className="border border-gray-300 rounded-lg p-4 bg-white" style={{ minHeight: "48px" }}>
                    <CardCvcElement
                      options={{
                        style: {
                          base: {
                            fontSize: "16px",
                            color: "#000",
                            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                            "::placeholder": { color: "#999" },
                          },
                          invalid: { color: "#dc2626" },
                        },
                      }}
                    />
                  </div>
                </div>
                <input
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="ZIP"
                  className="mb-4 w-full border border-gray-300 rounded-lg px-4 py-3 text-base text-black placeholder:text-gray-400 bg-white"
                  autoComplete="postal-code"
                  inputMode="numeric"
                />
              </>
            )}
            <button
              type="submit"
              disabled={!stripe || !elements || loading}
              className="w-full bg-black text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ height: '48px' }}
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
