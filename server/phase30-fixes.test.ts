import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");

describe("Phase 3.0 (v2): Identity + OTP onboarding", () => {
  const onboardingFlow = readFileSync(
    join(ROOT, "client/src/components/onboarding/OnboardingFlow.tsx"),
    "utf-8"
  );
  const welcomeRoutes = readFileSync(
    join(ROOT, "server/welcomeRoutes.ts"),
    "utf-8"
  );

  it("uses identity/otp/done step model", () => {
    expect(onboardingFlow).toContain("type OnboardingStep = \"identity\" | \"otp\" | \"done\"");
    expect(onboardingFlow).toContain("setStep(\"otp\")");
    expect(onboardingFlow).toContain("setStep(\"done\")");
  });

  it("calls OTP send and verify endpoints with credentials", () => {
    expect(onboardingFlow).toContain("/api/otp/send");
    expect(onboardingFlow).toContain("/api/otp/verify");
    expect(onboardingFlow).toContain("credentials: \"include\"");
  });

  it("checks backend session endpoint for returning users", () => {
    expect(onboardingFlow).toContain("/api/session");
    expect(welcomeRoutes).toContain("app.get(\"/api/session\"");
  });
});
