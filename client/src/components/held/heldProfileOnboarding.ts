export const POST_OTP_PROFILE_ONBOARDING_KEY = "bldg_post_otp_profile_onboarding";
export const PROFILE_PAYMENT_SETUP_SKIPPED_KEY = "bldg_profile_payment_setup_skipped";

type ResidentProfile = {
  firstName?: string | null;
  lastName?: string | null;
  paymentMethodSaved?: number | boolean | null;
};

export type ProfileOnboardingStep = "name" | "payment" | null;

function hasSkippedProfilePaymentSetup(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PROFILE_PAYMENT_SETUP_SKIPPED_KEY) === "true";
  } catch {
    return false;
  }
}

function clearSkippedProfilePaymentSetup() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PROFILE_PAYMENT_SETUP_SKIPPED_KEY);
  } catch {
    // Storage can be unavailable in private browsing contexts.
  }
}

export function getProfileOnboardingStep(
  user: ResidentProfile | null | undefined,
  forceFullOnboarding: boolean,
): ProfileOnboardingStep {
  if (forceFullOnboarding || !user?.firstName?.trim() || !user?.lastName?.trim()) {
    return "name";
  }

  if (Number(user.paymentMethodSaved) === 1) {
    clearSkippedProfilePaymentSetup();
    return null;
  }

  return hasSkippedProfilePaymentSetup() ? null : "payment";
}
