import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not configured");
}

export const stripe = new Stripe(stripeSecretKey, {
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
}): Promise<{ customerId: string; last4: string }> {
  const { paymentMethodId, email, name, phone } = params;

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

  console.log("[Stripe] Customer created:", customer.id, "card ending in", last4);
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
}): Promise<{ last4: string }> {
  const { customerId, newPaymentMethodId, oldPaymentMethodId } = params;

  await stripe.paymentMethods.attach(newPaymentMethodId, { customer: customerId });

  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: newPaymentMethodId },
  });

  const pm = await stripe.paymentMethods.retrieve(newPaymentMethodId);
  const last4 = pm.card?.last4 || "****";

  if (oldPaymentMethodId) {
    try {
      await stripe.paymentMethods.detach(oldPaymentMethodId);
      console.log("[Stripe] Detached old PM:", oldPaymentMethodId);
    } catch (err) {
      console.warn("[Stripe] Failed to detach old PM:", err);
    }
  }

  console.log("[Stripe] Replaced PM on customer", customerId, "→ ending in", last4);
  return { last4 };
}
