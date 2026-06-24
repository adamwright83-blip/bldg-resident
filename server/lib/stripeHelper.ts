import Stripe from "stripe";
import { isResidentAppTestMode } from "../residentTestMode";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey && !isResidentAppTestMode() && process.env.NODE_ENV !== "test") {
  throw new Error("STRIPE_SECRET_KEY is not configured");
}

export const stripe = new Stripe(stripeSecretKey || "sk_test_resident_mode_disabled", {
  // @ts-ignore - Using latest API version
  apiVersion: "2024-12-18.acacia" as any,
});

/**
 * Create a Stripe customer and attach a payment method
 * @param paymentMethodId - Stripe payment method ID (pm_xxx)
 * @param email - Customer email
 * @param name - Customer name
 * @param phone - Customer phone
 * @returns Object with customer ID and card last4
 */
export async function createStripeCustomer(params: {
  paymentMethodId: string;
  email?: string;
  name?: string;
  phone?: string;
  logContext?: { reqId: string; bldgUserId: number };
}): Promise<{ customerId: string; last4: string }> {
  const { paymentMethodId, email, name, phone, logContext } = params;
  const logPrefix = logContext ? `[Stripe][${logContext.reqId}]` : "[Stripe]";

  // Get payment method details to extract last4
  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
  const last4 = paymentMethod.card?.last4 || "****";

  // Create customer
  const customer = await stripe.customers.create({
    email,
    name,
    phone,
    payment_method: paymentMethodId,
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
    metadata: {
      source: "bldg.chat",
      cardLast4: last4,
    },
  });

  console.log(
    logPrefix,
    "Customer created:",
    customer.id,
    "for user",
    logContext?.bldgUserId,
    "card ending in",
    last4
  );
  return { customerId: customer.id, last4 };
}

/**
 * Replace the default payment method on an existing Stripe customer.
 * Attaches the new PM, sets it as default, and detaches the old one.
 */
export async function replacePaymentMethod(params: {
  customerId: string;
  newPaymentMethodId: string;
  oldPaymentMethodId?: string | null;
  logContext?: { reqId: string; bldgUserId: number };
}): Promise<{ last4: string }> {
  const { customerId, newPaymentMethodId, oldPaymentMethodId, logContext } = params;
  const logPrefix = logContext ? `[Stripe][${logContext.reqId}]` : "[Stripe]";

  await stripe.paymentMethods.attach(newPaymentMethodId, { customer: customerId });

  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: newPaymentMethodId },
  });

  const pm = await stripe.paymentMethods.retrieve(newPaymentMethodId);
  const last4 = pm.card?.last4 || "****";

  if (oldPaymentMethodId) {
    try {
      await stripe.paymentMethods.detach(oldPaymentMethodId);
      console.log(logPrefix, "Detached old PM for user", logContext?.bldgUserId);
    } catch (err) {
      console.warn(logPrefix, "Failed to detach old PM for user", logContext?.bldgUserId, err);
    }
  }

  console.log(
    logPrefix,
    "Replaced PM on customer",
    customerId,
    "for user",
    logContext?.bldgUserId,
    "→ ending in",
    last4
  );
  return { last4 };
}
