import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import { createStripeCustomer } from "../lib/stripeHelper";
import { getBldgUserById, insertChatMessage, updateBldgUser, getServiceRequests, hasShownOnboarding, markOnboardingShown } from "../db";
import { getOnboardingMessage } from "./chat";
import { createOpsPickup } from "../opsIntegration";
import { getDb } from "../db";
import { bldgUsers } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { parse as parseCookieHeader } from "cookie";
import { jwtVerify } from "jose";

const BLDG_COOKIE_NAME = "bldg_session";

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

      // ─── RE-FIRE OPS INTEGRATION — DISABLED ───
      // Intake forwarding now happens once at booking creation in chat.ts.
      // This re-fire block caused duplicate orders in the admin queue.
      if (false) {
        try {
          const completedUser = await getBldgUserById(bldgUserId);
          const requests = await getServiceRequests(bldgUserId);
          const pendingBookings = requests.filter((r: any) => r.status === "pending" || r.status === "confirmed");

          for (const booking of pendingBookings) {
            const payload = {
              bldgUserId,
              phone: completedUser?.phoneE164 || "+13235559999",
              firstName: completedUser?.firstName || "Resident",
              lastName: completedUser?.lastName || "",
              unit: completedUser?.unit || "",
              specialInstructions: undefined,
              serviceType: booking.serviceType as any,
              pickupDate: booking.scheduledDate || "",
              pickupWindow: booking.scheduledWindow || "",
              stripeCustomerId: customerId,
            };
            console.log("[OPS_INTEGRATION] Re-firing after registration complete:", JSON.stringify(payload, null, 2));
            const opsResult = await createOpsPickup(payload);
            console.log("[OPS_INTEGRATION] Re-fire result:", JSON.stringify(opsResult, null, 2));
          }
        } catch (err) {
          console.error("[OPS_INTEGRATION] Re-fire after payment failed:", err);
        }
      }

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
