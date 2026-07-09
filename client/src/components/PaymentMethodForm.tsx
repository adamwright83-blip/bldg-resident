import { useState, useEffect, useRef } from "react";
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
import { TEST_PAYMENT_METHOD_ID, isResidentAppTestMode } from "@/lib/residentTestMode";
import {
  POST_OTP_PROFILE_ONBOARDING_KEY,
  PROFILE_PAYMENT_SETUP_SKIPPED_KEY,
} from "@/components/held/heldProfileOnboarding";

export interface PaymentMethodSavedInfo {
  hasPendingOrder?: boolean;
  /** True when the server already executed the single-service deferred
   * booking inside this same request — the caller must not resend the
   * original message, or it risks creating a duplicate order. */
  deferredBookingExecuted?: boolean;
  serviceRequestId?: number | null;
  serviceType?: string | null;
  status?: string | null;
}

interface PaymentMethodFormProps {
  onSuccess: (info?: PaymentMethodSavedInfo) => void;
  dark?: boolean;
  defaultCardholderName?: string;
}

export function PaymentMethodForm({ onSuccess, dark = false, defaultCardholderName = "" }: PaymentMethodFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const publishableKey =
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim() ||
    (import.meta.env.DEV
      ? "pk_test_51T0xPHCs30FtFkcGlu6o0Tz9GiFtvXGwVT8mTP6NlFf2HMnZQrPxGsohxnMWifKcq6Bxy0wgoDW3VAly6IuOKr8W000xZJFVx2"
      : "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [last4, setLast4] = useState<string | null>(null);
  const [cardholderName, setCardholderName] = useState(defaultCardholderName);
  const [postalCode, setPostalCode] = useState("");
  const [initError, setInitError] = useState<string | null>(null);
  const [cardFocused, setCardFocused] = useState(false);
  const [showFinishLater] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem(POST_OTP_PROFILE_ONBOARDING_KEY) === "true";
    } catch {
      return false;
    }
  });
  const submitButtonRef = useRef<HTMLButtonElement | null>(null);

  const savePaymentMethod = trpc.stripe.savePaymentMethod.useMutation({
    onSuccess: (data) => {
      try {
        window.localStorage.removeItem(PROFILE_PAYMENT_SETUP_SKIPPED_KEY);
      } catch {
        // Storage can be unavailable in private contexts; saved card still wins.
      }
      setLoading(false);
      setSaved(true);
      if (data.last4) {
        setLast4(data.last4);
      }
      onSuccess({
        hasPendingOrder: data.hasPendingOrder,
        deferredBookingExecuted: data.deferredBookingExecuted,
        serviceRequestId: data.serviceRequestId,
        serviceType: data.serviceType,
        status: data.status,
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save payment method.");
      setLoading(false);
    },
  });

  useEffect(() => {
    if (!dark || typeof document === "undefined") return;

    const styleId = "bldg-payment-entry-layer-fix";
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .held-app-frame:has(.bldg-pay-card) section:has(.bldg-pay-card) {
        z-index: 170 !important;
      }
      .held-app-frame:has(.bldg-pay-card) [aria-label="Open labyrinth drawer"],
      .held-app-frame:has(.bldg-pay-card) [aria-label="Close labyrinth drawer"],
      .held-app-frame:has(.bldg-pay-card) [aria-label="Close labyrinth"] {
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, [dark]);

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

  useEffect(() => {
    if (!cardFocused) return;

    const revealSubmit = () => {
      window.setTimeout(() => {
        submitButtonRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }, 80);
    };

    revealSubmit();
    window.visualViewport?.addEventListener("resize", revealSubmit);
    return () => {
      window.visualViewport?.removeEventListener("resize", revealSubmit);
    };
  }, [cardFocused]);

  const finishProfilePaymentLater = () => {
    try {
      window.localStorage.setItem(PROFILE_PAYMENT_SETUP_SKIPPED_KEY, "true");
      window.sessionStorage.removeItem(POST_OTP_PROFILE_ONBOARDING_KEY);
    } catch {
      // If storage is unavailable, still let the resident leave the stuck card screen.
    }
    window.location.assign("/");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isResidentAppTestMode) {
      setLoading(true);
      try {
        await savePaymentMethod.mutateAsync({
          paymentMethodId: TEST_PAYMENT_METHOD_ID,
        });
      } catch {
        setLoading(false);
      }
      return;
    }

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
          color: "#2f2923",
          fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          "::placeholder": { color: "rgba(88,73,58,0.56)" },
        },
        invalid: { color: "#9f3f32" },
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
    : "bldg-pay-btn bldg-pay-btn-light";
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
          <CheckCircle2 className={`w-5 h-5 shrink-0 ${dark ? "text-[#9a681f]" : "text-green-600"}`} />
          <span className={dark ? "text-sm text-[#4b4035]" : "text-sm text-[#4A4540]"}>
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
            {isResidentAppTestMode ? (
              <div className={`mb-4 w-full ${fieldCls}`} style={{ minHeight: "48px" }}>
                <span className={dark ? "text-sm text-[#68594a]" : "text-sm text-[#4A4540]"}>
                  Test mode is on. No Stripe card will be created.
                </span>
              </div>
            ) : !stripe || !elements ? (
              <div className={`mb-4 w-full ${fieldCls}`} style={{ minHeight: "48px" }}>
                <span className={dark ? "text-sm text-[#68594a]" : "text-sm text-[#4A4540]"}>
                  {initError || "Initializing secure card fields..."}
                </span>
              </div>
            ) : (
              <>
                <input
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  onBlur={() => setCardFocused(false)}
                  onFocus={() => setCardFocused(true)}
                  placeholder="Name on card"
                  className={dark ? "bldg-pay-zip" : zipCls}
                  style={{ marginBottom: "12px" }}
                  autoComplete="cc-name"
                />
                <div className={`mb-3 w-full ${fieldCls}`} style={{ minHeight: "48px" }}>
                  <CardNumberElement
                    onBlur={() => setCardFocused(false)}
                    onFocus={() => setCardFocused(true)}
                    options={{ style: stripeStyle }}
                  />
                </div>
                <div className="mb-3 grid grid-cols-2 gap-3">
                  <div className={fieldCls} style={{ minHeight: "48px" }}>
                    <CardExpiryElement
                      onBlur={() => setCardFocused(false)}
                      onFocus={() => setCardFocused(true)}
                      options={{ style: stripeStyle }}
                    />
                  </div>
                  <div className={fieldCls} style={{ minHeight: "48px" }}>
                    <CardCvcElement
                      onBlur={() => setCardFocused(false)}
                      onFocus={() => setCardFocused(true)}
                      options={{ style: stripeStyle }}
                    />
                  </div>
                </div>
                <input
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  onBlur={() => setCardFocused(false)}
                  onFocus={() => setCardFocused(true)}
                  placeholder="ZIP"
                  className={zipCls}
                  autoComplete="postal-code"
                  inputMode="numeric"
                />
              </>
            )}
            <button
              ref={submitButtonRef}
              type="submit"
              disabled={(!isResidentAppTestMode && (!stripe || !elements)) || loading}
              className={btnCls}
            >
              {loading ? "Saving..." : "Save card and continue"}
            </button>
            {showFinishLater && (
              <button
                type="button"
                disabled={loading}
                onClick={finishProfilePaymentLater}
                className={dark ? "mt-3 min-h-10 w-full font-serif text-[13px] italic text-[#7a6d5f] underline decoration-[#b78a38]/30 underline-offset-4 disabled:opacity-50" : "mt-3 min-h-10 w-full text-sm text-gray-500 underline disabled:opacity-50"}
              >
                Finish setup later
              </button>
            )}
            {dark && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '5px', marginTop: '14px',
                color: 'rgba(75,64,53,0.52)',
                fontSize: '11px',
                letterSpacing: '0.04em',
                fontFamily: 'DM Sans, sans-serif',
              }}>
                <Lock size={10} />
                <span>Secured by</span>
                <span style={{ fontWeight: 600, fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
                  Stripe
                </span>
              </div>
            )}
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
