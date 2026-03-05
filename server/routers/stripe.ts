import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import { createStripeCustomer } from "../lib/stripeHelper";
import { getBldgUserById, insertChatMessage, updateBldgUser, getServiceRequests, updateServiceRequest, hasShownOnboarding, markOnboardingShown } from "../db";
import { getOnboardingMessage } from "./chat";
import { createOpsPickup } from "../opsIntegration";
import { getDb } from "../db";
import { bldgUsers } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { parse as parseCookieHeader } from "cookie";
import { jwtVerify } from "jose";

const BLDG_COOKIE_NAME = "bldg_session";

/** Convert display date "Saturday, Feb 28" → ISO "2026-02-28" */
function displayDateToISO(displayDate: string): string {
  const match = displayDate.match(/([A-Za-z]+),\s+([A-Za-z]+)\s+(\d+)/);
  if (!match) return displayDate;
  const [, , monthStr, dayStr] = match;
  const monthMap: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const month = monthMap[monthStr];
  const day = parseInt(dayStr, 10);
  if (month === undefined || isNaN(day)) return displayDate;
  const now = new Date();
  const date = new Date(now.getFullYear(), month, day);
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date < todayMidnight) date.setFullYear(now.getFullYear() + 1);
  return date.toISOString().split("T")[0];
}

async function getBldgUserIdFromRequest(req: any): Promise<number | null> {
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) return null;

  const parsed = parseCookieHeader(cookieHeader);
  const token = parsed[BLDG_COOKIE_NAME];
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "");
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    const { bldgUserId } = payload as Record<string, unknown>;
    return typeof bldgUserId === "number" ? bldgUserId : null;
  } catch {
    return null;
  }
}

export const stripeRouter = router({
  /**
   * Save payment method for a user
   * Creates Stripe customer, attaches payment method, stores customer ID
   */
  savePaymentMethod: publicProcedure
    .input(
      z.object({
        paymentMethodId: z.string(), // pm_xxx from Stripe Elements
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { paymentMethodId } = input;
      const bldgUserId = await getBldgUserIdFromRequest(ctx.req);
      if (!bldgUserId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "No active session",
        });
      }

      // Get user details
      const user = await getBldgUserById(bldgUserId);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Create Stripe customer
      let customerId: string;
      let last4: string;
      try {
        const customer = await createStripeCustomer({
          paymentMethodId,
          email: undefined, // BLDG users don't have email
          name: user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : undefined,
          phone: user.phoneE164,
        });
        customerId = customer.customerId;
        last4 = customer.last4;
      } catch (error: any) {
        console.error("[Stripe] savePaymentMethod failed during customer creation:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Stripe customer setup failed. Please verify backend Stripe configuration.",
        });
      }

      // Update user record
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }
      await db
        .update(bldgUsers)
        .set({
          stripeCustomerId: customerId,
          stripePaymentMethodId: paymentMethodId, // Store payment method ID
          paymentMethodSaved: 1,
          cardLast4: last4,
        })
        .where(eq(bldgUsers.id, bldgUserId));

      console.log("[Stripe] Payment method saved for user", bldgUserId, "→", customerId, "ending in", last4);

      // ─── POST-PAYMENT: Complete onboarding + show instructional images ───
      // Now that payment is saved, advance onboarding to COMPLETE and
      // insert the service instructional images that were deferred.
      const ONBOARDING_COMPLETE = 5;
      const freshUser = await getBldgUserById(bldgUserId);
      if (freshUser && freshUser.onboardingStep < ONBOARDING_COMPLETE) {
        await updateBldgUser(bldgUserId, {
          onboardingStep: ONBOARDING_COMPLETE,
        } as any);
        console.log(`[Onboarding] Payment saved — advanced user ${bldgUserId} to COMPLETE`);
      }

      // Insert instructional images for each service the user has booked
      // (typically just the first service, but handle multiple)
      try {
        const requests = await getServiceRequests(bldgUserId);
        const bookedServices = new Set(requests.map((r: any) => r.serviceType));

        for (const svc of Array.from(bookedServices)) {
          const hasShown = await hasShownOnboarding(bldgUserId, svc);
          if (!hasShown) {
            const onboardingMsg = getOnboardingMessage(svc);
            if (onboardingMsg) {
              await insertChatMessage({
                bldgUserId,
                role: "assistant",
                content: onboardingMsg,
              });
              await markOnboardingShown(bldgUserId, svc);
              console.log(`[Onboarding] Inserted instructional images for ${svc} after payment`);
            }
          }
        }
      } catch (err) {
        console.error("[Onboarding] Failed to insert instructional images:", err);
      }

      // ─── INTAKE FORWARD — send complete order to admin API after payment ───
      // Names are guaranteed here (name card runs before payment card).
      // Uses same externalId as the booking-creation attempt so the admin
      // API can upsert/deduplicate using that key.
      (async () => {
        try {
          const adminApiUrl = (
            process.env.ADMIN_API_URL ||
            "https://bldg-admin-api-production.up.railway.app"
          ).replace(/\/$/, "");

          const sharedSecret = process.env.APP_SHARED_API_SECRET;

          const completedUser = await getBldgUserById(bldgUserId);
          const requests = await getServiceRequests(bldgUserId);
          const pendingBookings = requests.filter(
            (r: any) => r.status === "pending" || r.status === "confirmed"
          );

          const BUILDING_ADDRESSES: Record<string, string> = {
            "opus-south": "3545 S Figueroa St, Los Angeles, CA 90007",
            "opus-north": "3650 S Figueroa St, Los Angeles, CA 90007",
            "cpe-north":  "2160 Century Park E, Los Angeles, CA 90067",
            "cpe-south":  "2170 Century Park E, Los Angeles, CA 90067",
          };
          const buildingSlug = completedUser?.buildingSlug || "";
          const address = BUILDING_ADDRESSES[buildingSlug] || "10000 Santa Monica Blvd, Los Angeles, CA 90067";

          const firstName = (completedUser?.firstName || "").trim() || "Resident";
          const lastName  = (completedUser?.lastName  || "").trim() || "Resident";
          const phone     = completedUser?.phoneE164 || "";

          for (const booking of pendingBookings) {
            const serviceType = booking.serviceType === "dry-cleaning" ? "dry_cleaning" : "wash_fold";

            // scheduledDate is stored as display string e.g. "Saturday, Feb 28"
            const rawDate = booking.scheduledDate || "";
            const pickupDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
              ? rawDate
              : displayDateToISO(rawDate);

            const intakePayload = {
              externalId: `bldg-sr-${booking.id}`,
              source: "bldg-resident",
              status: "new",
              serviceType,
              pickupDate,
              pickupWindow: booking.scheduledWindow || "",
              address,
              buildingId: buildingSlug || null,
              unit: completedUser?.unit || null,
              firstName,
              lastName,
              phone,
              bldgUserId,
              stripeCustomerId: customerId,
              stripePaymentMethodId: completedUser?.stripePaymentMethodId || null,
            };

            console.log("[INTAKE] post-payment sending", JSON.stringify(intakePayload, null, 2));
            console.log(`[INTAKE] hasSecret=${Boolean(sharedSecret)} len=${sharedSecret?.length ?? 0} headerName=x-app-shared-secret`);

            const fwdRes = await fetch(`${adminApiUrl}/api/intake/from-bldg`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-app-shared-secret": sharedSecret || "",
              },
              body: JSON.stringify(intakePayload),
            });

            const responseText = await fwdRes.text().catch(() => "(no body)");
            console.log(`[INTAKE] post-payment response status=${fwdRes.status} body=${responseText}`);
            if (fwdRes.ok) {
              try {
                const body = JSON.parse(responseText) as { orderId?: number };
                if (body?.orderId != null && Number.isFinite(Number(body.orderId))) {
                  await updateServiceRequest(booking.id, { orderId: Number(body.orderId) });
                  console.log(`[INTAKE] stored orderId=${body.orderId} on service_request #${booking.id}`);
                }
              } catch (_) {
                // ignore parse errors; admin may not return JSON or orderId
              }
            }
          }
        } catch (err) {
          console.error("[INTAKE] post-payment forward threw — full error:", err);
        }
      })();

      // v2: after payment saved, ask for name if not captured yet
      const postPaymentUser = await getBldgUserById(bldgUserId);
      if (postPaymentUser && !postPaymentUser.firstName) {
        await insertChatMessage({
          bldgUserId,
          role: "assistant",
          content: "Locked in. What name should we use for pickups?",
          metadata: { type: "awaiting_name" },
        });
      }

      return {
        success: true,
        stripeCustomerId: customerId,
        last4,
      };
    }),
});
