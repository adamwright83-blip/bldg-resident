/**
 * Ops Integration — Create pickup records in ops.bldg.chat (Laundry Butler admin)
 * 
 * When a booking is confirmed in bldg-chat, this helper creates a corresponding
 * pickup record in the ops system so it appears in /admin and /driver views.
 */

const OPS_API_URL = "https://laundrybutler.bldg.chat/api/intake/from-bldg";
const OPUS_LA_ADDRESS = "10000 Santa Monica Blvd, Los Angeles, CA 90067";

interface CreatePickupParams {
  bldgUserId: number;     // app.bldg.chat user ID (for receipt notifications)
  phone: string;          // E.164 format
  firstName: string;
  lastName: string;
  unit: string;
  email?: string;
  specialInstructions?: string;
  serviceType: "laundry" | "dry-cleaning" | "grooming" | "car-wash";
  pickupDate: string;     // ISO date: "2026-02-15"
  pickupWindow: string;   // "7–10 AM" format from bldg-chat
  stripeCustomerId?: string; // Stripe customer ID (cus_xxx)
  stripePaymentMethodId?: string; // Stripe payment method ID (pm_xxx)
}

/**
 * Map bldg-chat time window format to ops system format
 * "7–10 AM" → "7:00am–9:00am"
 */
function mapTimeWindow(window: string): string {
  const mapping: Record<string, string> = {
    "7–10 AM": "7:00am–9:00am",
    "12–2 PM": "11:00am–1:00pm",
    "7–9 PM": "7:00pm–9:00pm",
  };
  return mapping[window] || "7:00am–9:00am"; // Default to morning
}

/**
 * Generate vendor payload (300 char max plain text)
 * Format: PREMIUM: [Label]. FEE DUE: $[Price]. PICKUP: [scheduled_start_local] to [scheduled_end_local]. RESIDENT: [Name], Unit [Unit], [Phone]. NOTES: [Notes]
 */
export function generateVendorPayload(params: {
  upgradeLabel?: string;
  paymentAdjustmentDueCents?: number;
  scheduledStartLocal: string;
  scheduledEndLocal: string;
  firstName: string;
  lastName: string;
  unit: string;
  phone: string;
  notes?: string;
}): string {
  const parts: string[] = [];

  // PREMIUM section (if upgrade exists)
  if (params.upgradeLabel && params.paymentAdjustmentDueCents) {
    const price = (params.paymentAdjustmentDueCents / 100).toFixed(2);
    parts.push(`PREMIUM: ${params.upgradeLabel}. FEE DUE: $${price}.`);
  }

  // PICKUP section (required)
  parts.push(`PICKUP: ${params.scheduledStartLocal} to ${params.scheduledEndLocal}.`);

  // RESIDENT section (required)
  parts.push(`RESIDENT: ${params.firstName} ${params.lastName}, Unit ${params.unit}, ${params.phone}.`);

  // NOTES section (if present)
  if (params.notes) {
    parts.push(`NOTES: ${params.notes}`);
  }

  // Join and truncate to 300 chars
  const payload = parts.join(" ");
  return payload.length > 300 ? payload.substring(0, 297) + "..." : payload;
}

/**
 * Map bldg-chat service type to ops system format
 */
function mapServiceType(serviceType: string): "wash-fold" | "dry-cleaning" {
  if (serviceType === "laundry") return "wash-fold";
  if (serviceType === "dry-cleaning") return "dry-cleaning";
  return "wash-fold"; // Default
}

/**
 * Create a pickup record in ops.bldg.chat via REST endpoint
 */
export async function createOpsPickup(params: CreatePickupParams): Promise<{ success: boolean; orderId?: number; error?: string }> {
  try {
    const payload = {
      source: "bldg.chat",
      bldgUserId: params.bldgUserId, // User ID for receipt notifications
      serviceType: mapServiceType(params.serviceType),
      firstName: params.firstName,
      lastName: params.lastName,
      phone: params.phone,
      email: params.email,
      unit: params.unit,
      address: OPUS_LA_ADDRESS,
      pickupDate: params.pickupDate,
      pickupWindow: mapTimeWindow(params.pickupWindow),
      specialInstructions: params.specialInstructions,
      stripeCustomerId: params.stripeCustomerId,
      stripePaymentMethodId: params.stripePaymentMethodId, // Payment method ID for charging
    };

    console.error("[OPS_INTEGRATION] Calling REST endpoint:", OPS_API_URL);
    console.error("[OPS_INTEGRATION] Payload:", JSON.stringify(payload, null, 2));

    const response = await fetch(OPS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-APP-SHARED-SECRET": process.env.APP_SHARED_API_SECRET || "",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[OPS_INTEGRATION] API error:", response.status, errorText);
      return { success: false, error: `API returned ${response.status}: ${errorText}` };
    }

    const result = await response.json();
    console.error("[OPS_INTEGRATION] Success! Order created:", result);

    return { success: true, orderId: result.orderId };
  } catch (error) {
    console.error("[OPS_INTEGRATION] Failed to create pickup:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
