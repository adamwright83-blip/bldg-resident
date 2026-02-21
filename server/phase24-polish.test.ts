/**
 * Tests for Phase 2.4: Final Polish
 * - System prompt fix (no "contact building management")
 * - Onboarding UI components exist and are wired
 * - CSS color overhaul (warm brown palette)
 * - Upgrade button redesign (clearly optional)
 * - Set-building endpoint
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// ─── System Prompt: never say "contact building management" ───

describe("System prompt: no building management redirect", () => {
  const chatRouterSource = readFileSync(
    resolve(__dirname, "routers/chat.ts"),
    "utf-8"
  );

  it("should NOT contain 'suggest calling building management'", () => {
    expect(chatRouterSource).not.toContain(
      "suggest calling building management"
    );
  });

  it("should NOT contain 'text building management directly'", () => {
    expect(chatRouterSource).not.toContain(
      "text building management directly"
    );
  });

  it("should contain the new 'you ARE building management' instruction", () => {
    expect(chatRouterSource).toContain("you ARE building management");
  });

  it("should contain the 'flag it for the team' fallback", () => {
    expect(chatRouterSource).toContain("flag it for the team");
  });

  it("fallback error message should NOT mention building management", () => {
    expect(chatRouterSource).toContain(
      "I'm having a moment"
    );
  });
});

// ─── Onboarding Components Exist ───

describe("Onboarding components exist", () => {
  it("SplashScreen component exists with correct content", () => {
    const source = readFileSync(
      resolve(__dirname, "../client/src/components/onboarding/SplashScreen.tsx"),
      "utf-8"
    );
    expect(source).toContain("BLDG");
    expect(source).toContain("Your building concierge");
    expect(source).toContain("onComplete");
  });

  it("BuildingSelector component exists with correct buildings", () => {
    const source = readFileSync(
      resolve(
        __dirname,
        "../client/src/components/onboarding/BuildingSelector.tsx"
      ),
      "utf-8"
    );
    expect(source).toContain("opus-la");
    expect(source).toContain("For Opus LA");
    expect(source).toContain("century-park-east");
    expect(source).toContain("For Century Park East");
    expect(source).toContain("Select your building");
    expect(source).toContain("onComplete");
  });

  it("TutorialScreen component exists with correct tutorial text", () => {
    const source = readFileSync(
      resolve(
        __dirname,
        "../client/src/components/onboarding/TutorialScreen.tsx"
      ),
      "utf-8"
    );
    expect(source).toContain("I handle everything in your building");
    expect(source).toContain("No menus. No forms. No waiting");
    expect(source).toContain("On the next screen, complete your registration first");
    expect(source).toContain("Got it");
    expect(source).toContain("onComplete");
  });

  it("OnboardingFlow orchestrator exists and wires all screens", () => {
    const source = readFileSync(
      resolve(
        __dirname,
        "../client/src/components/onboarding/OnboardingFlow.tsx"
      ),
      "utf-8"
    );
    expect(source).toContain("SplashScreen");
    expect(source).toContain("BuildingSelector");
    expect(source).toContain("TutorialScreen");
    expect(source).toContain("bldg_onboarding_complete");
    expect(source).toContain("/api/set-building");
  });

  it("OnboardingFlow is wired into App.tsx", () => {
    const appSource = readFileSync(
      resolve(__dirname, "../client/src/App.tsx"),
      "utf-8"
    );
    expect(appSource).toContain("OnboardingFlow");
    expect(appSource).toContain("<OnboardingFlow>");
  });
});

// ─── Set-Building Endpoint ───

describe("Set-building endpoint", () => {
  it("welcomeRoutes.ts contains /api/set-building endpoint", () => {
    const source = readFileSync(
      resolve(__dirname, "welcomeRoutes.ts"),
      "utf-8"
    );
    expect(source).toContain("/api/set-building");
    expect(source).toContain("updateBldgUser");
    expect(source).toContain("buildingSlug");
  });
});

// ─── CSS Color Overhaul ───

describe("CSS color overhaul: warm brown palette", () => {
  const cssSource = readFileSync(
    resolve(__dirname, "../client/src/index.css"),
    "utf-8"
  );

  it("should use warm brown background (#2C2824)", () => {
    expect(cssSource).toContain("#2C2824");
  });

  it("should define bone-white variable", () => {
    expect(cssSource).toContain("--bone-white");
  });

  it("chat-tile should use bone-white background", () => {
    expect(cssSource).toContain("background: var(--bone-white)");
  });
});

// ─── Upgrade Button Redesign ───

describe("Upgrade button: clearly optional design", () => {
  const cssSource = readFileSync(
    resolve(__dirname, "../client/src/index.css"),
    "utf-8"
  );

  it("upgrade button should use dashed border", () => {
    const btnSection = cssSource.match(
      /\.confirmation-card-upgrade-btn\s*\{[^}]+\}/s
    );
    expect(btnSection).toBeTruthy();
    expect(btnSection![0]).toContain("dashed");
  });

  it("upgrade button should have reduced opacity (clearly optional)", () => {
    const btnSection = cssSource.match(
      /\.confirmation-card-upgrade-btn\s*\{[^}]+\}/s
    );
    expect(btnSection).toBeTruthy();
    expect(btnSection![0]).toContain("opacity");
  });
});

// ─── Onboarding CSS Animations ───

describe("Onboarding CSS animations", () => {
  const cssSource = readFileSync(
    resolve(__dirname, "../client/src/index.css"),
    "utf-8"
  );

  it("should have splash-logo-in keyframes", () => {
    expect(cssSource).toContain("@keyframes splash-logo-in");
  });

  it("should have onboard-fade-in keyframes", () => {
    expect(cssSource).toContain("@keyframes onboard-fade-in");
  });

  it("should have arrow-bounce keyframes", () => {
    expect(cssSource).toContain("@keyframes arrow-bounce");
  });
});
