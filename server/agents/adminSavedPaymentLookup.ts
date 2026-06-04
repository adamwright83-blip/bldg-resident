import type { BldgUser } from "../../drizzle/schema";
import { updateBldgUser } from "../db";
import { isResidentAppTestMode } from "../residentTestMode";
import {
  getAdminIntakeApiBaseUrlCandidates,
  hasAdminIntakeSharedSecret,
} from "./adminIntakeConfig";

type AdminSavedPaymentLookupResponse = {
  ok?: boolean;
  found?: boolean;
  stripeCustomerId?: string;
  stripePaymentMethodId?: string;
  cardLast4?: string;
  brand?: string;
  expMonth?: number;
  expYear?: number;
};

export type AdminSavedPaymentLookupResult = {
  found: boolean;
  reason: string;
  user: BldgUser | null | undefined;
  card?: {
    brand?: string;
    expMonth?: number;
    expYear?: number;
    last4?: string;
  };
};

function hasSavedPayment(user: BldgUser | null | undefined) {
  return Boolean(user?.stripePaymentMethodId?.trim()) && Number(user?.paymentMethodSaved) === 1;
}

function sanitizeLast4(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length === 4 ? digits : null;
}

function isSafeLookupPayload(
  body: AdminSavedPaymentLookupResponse
): body is AdminSavedPaymentLookupResponse & {
  found: true;
  stripeCustomerId: string;
  stripePaymentMethodId: string;
} {
  return (
    body.ok === true &&
    body.found === true &&
    typeof body.stripeCustomerId === "string" &&
    body.stripeCustomerId.startsWith("cus_") &&
    typeof body.stripePaymentMethodId === "string" &&
    body.stripePaymentMethodId.startsWith("pm_")
  );
}

export async function tryAttachAdminSavedPaymentMethod(
  user: BldgUser | null | undefined,
  logPrefix = "ResidentPaymentLookup"
): Promise<AdminSavedPaymentLookupResult> {
  if (!user) {
    return { found: false, reason: "missing_user", user };
  }

  if (hasSavedPayment(user)) {
    return { found: true, reason: "already_saved", user };
  }

  const phone = user.phoneE164?.trim();
  if (!phone) {
    return { found: false, reason: "missing_phone", user };
  }

  if (isResidentAppTestMode()) {
    return { found: false, reason: "resident_test_mode", user };
  }

  if (!hasAdminIntakeSharedSecret()) {
    console.warn(`[${logPrefix}] admin saved-card lookup skipped: missing APP_SHARED_API_SECRET`);
    return { found: false, reason: "missing_shared_secret", user };
  }

  const sharedSecret = process.env.APP_SHARED_API_SECRET || "";
  let lastReason = "not_found";

  const adminApiUrlCandidates = getAdminIntakeApiBaseUrlCandidates();

  for (const adminApiUrl of adminApiUrlCandidates) {
    try {
      console.log(`[${logPrefix}] checking admin saved card at ${adminApiUrl}`);
      const res = await fetch(`${adminApiUrl}/api/resident/payment-method-lookup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-shared-secret": sharedSecret,
        },
        body: JSON.stringify({ phone }),
      });

      const responseText = await res.text().catch(() => "");

      if (!res.ok) {
        lastReason = `non_2xx:${res.status}`;
        console.warn(`[${logPrefix}] saved-card lookup failed status=${res.status}`);
        if (
          (res.status === 404 || res.status === 405) &&
          adminApiUrl !== adminApiUrlCandidates[adminApiUrlCandidates.length - 1]
        ) {
          continue;
        }
        return { found: false, reason: lastReason, user };
      }

      let body: AdminSavedPaymentLookupResponse;
      try {
        body = JSON.parse(responseText) as AdminSavedPaymentLookupResponse;
      } catch {
        console.warn(`[${logPrefix}] saved-card lookup parse failed`);
        return { found: false, reason: "parse_error", user };
      }

      if (body.ok === true && body.found === false) {
        console.log(`[${logPrefix}] no admin saved card found for resident phone`);
        return { found: false, reason: "not_found", user };
      }

      if (!isSafeLookupPayload(body)) {
        console.warn(`[${logPrefix}] saved-card lookup returned unusable payload`);
        return { found: false, reason: "invalid_payload", user };
      }

      const cardLast4 = sanitizeLast4(body.cardLast4);
      const updatedUser = await updateBldgUser(user.id, {
        stripeCustomerId: body.stripeCustomerId,
        stripePaymentMethodId: body.stripePaymentMethodId,
        paymentMethodSaved: 1,
        ...(cardLast4 ? { cardLast4 } : {}),
      } as any);

      console.log(`[${logPrefix}] attached admin saved card to resident user #${user.id}`);
      return {
        found: true,
        reason: "found",
        user: updatedUser ?? {
          ...user,
          stripeCustomerId: body.stripeCustomerId,
          stripePaymentMethodId: body.stripePaymentMethodId,
          paymentMethodSaved: 1,
          ...(cardLast4 ? { cardLast4 } : {}),
        },
        card: {
          brand: body.brand,
          expMonth: body.expMonth,
          expYear: body.expYear,
          last4: cardLast4 ?? undefined,
        },
      };
    } catch (error) {
      lastReason = "fetch_error";
      console.warn(`[${logPrefix}] saved-card lookup threw`, error);
    }
  }

  return { found: false, reason: lastReason, user };
}
