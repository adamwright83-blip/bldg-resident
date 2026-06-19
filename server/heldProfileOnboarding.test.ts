import { describe, expect, it } from "vitest";
import { getProfileOnboardingStep } from "../client/src/components/held/heldProfileOnboarding";

describe("HELD profile onboarding", () => {
  it("replays name then payment after a fresh OTP even for a known resident", () => {
    expect(getProfileOnboardingStep({
      firstName: "Known",
      lastName: "Resident",
      paymentMethodSaved: 1,
    }, true)).toBe("name");
  });

  it("recovers only the missing profile step on an ordinary session", () => {
    expect(getProfileOnboardingStep({ paymentMethodSaved: 0 }, false)).toBe("name");
    expect(getProfileOnboardingStep({
      firstName: "New",
      lastName: "Resident",
      paymentMethodSaved: 0,
    }, false)).toBe("payment");
    expect(getProfileOnboardingStep({
      firstName: "Ready",
      lastName: "Resident",
      paymentMethodSaved: 1,
    }, false)).toBeNull();
  });
});
