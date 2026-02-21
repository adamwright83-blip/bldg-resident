import { useState, useEffect } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

interface PaymentMethodFormProps {
  bldgUserId: number;
  onSuccess: () => void;
}

export function PaymentMethodForm({ bldgUserId, onSuccess }: PaymentMethodFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [last4, setLast4] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

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

  // After showing the confirmation for 3 seconds, fade out and hide completely
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => {
      setHidden(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [saved]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      toast.error("Card element not found");
      setLoading(false);
      return;
    }

    try {
      // Create payment method
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
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
        bldgUserId,
      });
    } catch (error) {
      console.error("[PaymentMethodForm] Error:", error);
      toast.error("An error occurred");
      setLoading(false);
    }
  };

  // Fully hidden after fade-out completes
  if (hidden) {
    return null;
  }

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
            <div className="mb-4 w-full border border-gray-300 rounded-lg p-4 bg-white" style={{ minHeight: '48px' }}>
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: "16px",
                      color: "#000",
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      "::placeholder": {
                        color: "#999",
                      },
                    },
                    invalid: {
                      color: "#dc2626",
                    },
                  },
                }}
              />
            </div>
            <button
              type="submit"
              disabled={!stripe || loading}
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
