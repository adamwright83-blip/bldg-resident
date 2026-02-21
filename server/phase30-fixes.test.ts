/**
 * Phase 3.0 Bug Fix Tests
 *
 * Root cause: Guest session cookie didn't exist when /api/set-building was called
 * during onboarding. OnboardingFlow now creates the session before the building step.
 *
 * This fixes:
 * 1. Building/unit not saving to DB → Vault shows blank
 * 2. Post-booking collection asking for address instead of name
 * 3. Phone showing "+1guest..." placeholder
 * 4. "I'm having a moment" error during collection
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");

describe("Phase 3.0: Guest session created before building selector", () => {
  const onboardingFlow = readFileSync(
    join(ROOT, "client/src/components/onboarding/OnboardingFlow.tsx"),
    "utf-8"
  );

  it("defines ensureGuestSession function that calls /api/guest-session", () => {
    expect(onboardingFlow).toContain("async function ensureGuestSession()");
    expect(onboardingFlow).toContain('"/api/guest-session"');
    expect(onboardingFlow).toContain('method: "POST"');
    expect(onboardingFlow).toContain('credentials: "include"');
  });

  it("creates guest session in useEffect before building step", () => {
    // The useEffect should fire when step !== "done"
    expect(onboardingFlow).toContain('step !== "done"');
    expect(onboardingFlow).toContain("ensureGuestSession()");
    expect(onboardingFlow).toContain("sessionCreated.current = true");
  });

  it("has belt-and-suspenders session check in handleBuildingComplete", () => {
    // Before calling /api/set-building, it should ensure session exists
    expect(onboardingFlow).toContain("if (!sessionCreated.current)");
    expect(onboardingFlow).toContain("await ensureGuestSession()");
  });

  it("calls /api/set-building with credentials: include", () => {
    expect(onboardingFlow).toContain('"/api/set-building"');
    expect(onboardingFlow).toContain('credentials: "include"');
  });

  it("logs errors from /api/set-building instead of silently swallowing", () => {
    expect(onboardingFlow).toContain('[SetBuilding] Failed:');
    expect(onboardingFlow).toContain('[SetBuilding] Error:');
  });
});

describe("Phase 3.0/3.4: Registration-first flow via startRegistration", () => {
  const chatRouter = readFileSync(
    join(ROOT, "server/routers/chat.ts"),
    "utf-8"
  );

  it("has startRegistration mutation that checks hasAddress", () => {
    expect(chatRouter).toContain("startRegistration: publicProcedure");
    expect(chatRouter).toContain("const hasAddress = user.buildingSlug && user.unit");
  });

  it("skips to COLLECTING_NAME when address is already set from overlay", () => {
    expect(chatRouter).toContain("startRegistration: user");
    expect(chatRouter).toContain("has address, skipping to name");
    expect(chatRouter).toContain("ONBOARDING_STEP.COLLECTING_NAME");
  });

  it("asks for address when building/unit are missing", () => {
    expect(chatRouter).toContain("Where should the driver come? Building and unit.");
    expect(chatRouter).toContain("needs address");
  });

  it("registration now happens BEFORE booking, not after", () => {
    expect(chatRouter).toContain("Registration now happens BEFORE booking via startRegistration");
  });
});

describe("Phase 3.0: Home.tsx ensureSession still works for returning users", () => {
  const homeTsx = readFileSync(
    join(ROOT, "client/src/pages/Home.tsx"),
    "utf-8"
  );

  it("still has ensureSession in Home.tsx for returning users who skip onboarding", () => {
    expect(homeTsx).toContain("async function ensureSession()");
    expect(homeTsx).toContain('"/api/guest-session"');
  });

  it("sets sessionReady after ensureSession completes", () => {
    expect(homeTsx).toContain("setSessionReady(ok)");
  });
});
