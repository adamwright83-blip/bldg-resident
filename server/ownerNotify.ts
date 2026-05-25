/**
 * Owner notification abstraction.
 *
 * Current implementation: uses built-in notifyOwner() (Manus platform notifications).
 * Future: Twilio SMS (guarded by env vars, not enabled by default).
 */
import { notifyOwner } from "./_core/notification";
import { isResidentAppTestMode } from "./residentTestMode";

export type OwnerAlertPayload = {
  serviceCategory: string;
  residentName: string;
  unit: string;
  scheduledWindow: string;
  building?: string;
  notes?: string;
  vendor?: string;
  action: "booking_created" | "booking_modified" | "booking_cancelled" | "service_request";
};

/**
 * Send an alert to the building owner/manager.
 *
 * Current: uses Manus platform notifications via notifyOwner().
 * Future: Twilio SMS if all env vars are set.
 */
export async function sendOwnerAlert(payload: OwnerAlertPayload): Promise<boolean> {
  const {
    serviceCategory,
    residentName,
    unit,
    scheduledWindow,
    building,
    notes,
    vendor,
    action,
  } = payload;

  if (isResidentAppTestMode()) {
    console.log("[ResidentTestMode] Skipping owner alert:", {
      action,
      serviceCategory,
      residentName,
      unit,
      scheduledWindow,
    });
    return true;
  }

  // Format the message
  const actionLabel =
    action === "booking_created"
      ? "New booking"
      : action === "booking_modified"
      ? "Modified booking"
      : action === "service_request"
      ? "Service request"
      : "Cancelled booking";

  const title = `${actionLabel}: ${serviceCategory}`;
  const content = [
    `Resident: ${residentName} (Unit ${unit})`,
    building ? `Building: ${building}` : null,
    `Service: ${serviceCategory}`,
    `Window: ${scheduledWindow}`,
    notes ? `Notes: ${notes}` : null,
    vendor ? `Vendor: ${vendor}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  // Check if Twilio is configured (guarded implementation)
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFromNumber = process.env.TWILIO_FROM_NUMBER;
  const ownerToNumber = process.env.OWNER_TO_NUMBER;

  if (
    twilioAccountSid &&
    twilioAuthToken &&
    twilioFromNumber &&
    ownerToNumber
  ) {
    // Twilio SMS implementation (guarded, not enabled by default)
    try {
      // Uncomment when Twilio is ready:
      // const twilio = require("twilio")(twilioAccountSid, twilioAuthToken);
      // await twilio.messages.create({
      //   from: twilioFromNumber,
      //   to: ownerToNumber,
      //   body: `${title}\n\n${content}`,
      // });
      // console.log("[ownerNotify] Twilio SMS sent:", title);
      // return true;

      // For now, log that Twilio would be used
      console.log("[ownerNotify] Twilio env vars detected but not enabled:", title);
    } catch (error) {
      console.error("[ownerNotify] Twilio SMS failed:", error);
      // Fall through to notifyOwner as backup
    }
  }

  // Default: use Manus platform notifications
  try {
    const success = await notifyOwner({ title, content });
    if (success) {
      console.log("[ownerNotify] Platform notification sent:", title);
    } else {
      console.warn("[ownerNotify] Platform notification failed:", title);
    }
    return success;
  } catch (error) {
    console.error("[ownerNotify] Platform notification error:", error);
    return false;
  }
}
