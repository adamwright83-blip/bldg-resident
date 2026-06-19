export const POST_OTP_PROFILE_ONBOARDING_KEY = "bldg_post_otp_profile_onboarding";

type ResidentProfile = {
  firstName?: string | null;
  lastName?: string | null;
  paymentMethodSaved?: number | boolean | null;
};

export type ProfileOnboardingStep = "name" | "payment" | null;

export function getProfileOnboardingStep(
  user: ResidentProfile | null | undefined,
  forceFullOnboarding: boolean,
): ProfileOnboardingStep {
  if (forceFullOnboarding || !user?.firstName?.trim() || !user?.lastName?.trim()) {
    return "name";
  }

  return Number(user.paymentMethodSaved) === 1 ? null : "payment";
}
