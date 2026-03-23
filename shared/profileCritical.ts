/**
 * Critical profile fields required before payment UI and laundry/dry-clean intake.
 * Used by chat router and Home for consistent recovery gating.
 */

export type CriticalProfileFields = {
  firstName?: string | null;
  lastName?: string | null;
  paymentMethodSaved?: number | boolean | null;
  stripePaymentMethodId?: string | null;
};

export type CriticalProfileGaps = {
  missingFirstName: boolean;
  missingLastName: boolean;
  missingPayment: boolean;
};

function trimStr(v: string | null | undefined): string {
  return (v ?? "").trim();
}

export function getCriticalProfileGaps(user: CriticalProfileFields | null | undefined): CriticalProfileGaps {
  if (!user) {
    return {
      missingFirstName: true,
      missingLastName: true,
      missingPayment: true,
    };
  }
  const missingFirstName = trimStr(user.firstName) === "";
  const missingLastName = trimStr(user.lastName) === "";
  const pmFlag = Number(user.paymentMethodSaved) === 1;
  const pmId = trimStr(user.stripePaymentMethodId);
  const missingPayment = !pmFlag || pmId === "";
  return { missingFirstName, missingLastName, missingPayment };
}

export function isCriticalProfileComplete(user: CriticalProfileFields | null | undefined): boolean {
  const g = getCriticalProfileGaps(user);
  return !g.missingFirstName && !g.missingLastName && !g.missingPayment;
}

export function needsCriticalProfileRecovery(user: CriticalProfileFields | null | undefined): boolean {
  return !isCriticalProfileComplete(user);
}

/** Saved card on file: flag + Stripe payment method id (names not considered). */
export function isStrictPaymentComplete(user: CriticalProfileFields | null | undefined): boolean {
  if (!user) return false;
  return Number(user.paymentMethodSaved) === 1 && trimStr(user.stripePaymentMethodId) !== "";
}
