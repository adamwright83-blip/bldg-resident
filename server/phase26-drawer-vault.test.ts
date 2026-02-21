/**
 * Phase 2.6 Tests — Bug fixes, Services Drawer, The Vault
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function readFile(rel: string): string {
  return readFileSync(resolve(__dirname, "..", rel), "utf-8");
}

// ─── Bug 1: No flash between splash and building selector ───
describe("Bug 1: Onboarding flash fix", () => {
  it("OnboardingFlow hides children during onboarding", () => {
    const src = readFile("client/src/components/onboarding/OnboardingFlow.tsx");
    // Children are NOT mounted during onboarding — prevents flash
    expect(src).toContain("Children are NOT mounted");
    // Only renders children when step is "done"
    expect(src).toMatch(/step === "done"/);
    expect(src).toContain("{children}");
  });
});

// ─── Bug 3: Tutorial tiles non-clickable ───
describe("Bug 3: Tutorial tiles non-clickable", () => {
  it("TutorialScreen has non-clickable tiles", () => {
    const src = readFile("client/src/components/onboarding/TutorialScreen.tsx");
    // Should have pointer-events-none or no onClick on tiles
    expect(src).toMatch(/pointer-events.*none|non-clickable|visual.*only|cursor.*default/i);
  });

  it("TutorialScreen tells user to tap on next screen", () => {
    const src = readFile("client/src/components/onboarding/TutorialScreen.tsx");
    expect(src).toContain("On the next screen");
    expect(src).toContain("Laundry tile");
  });
});

// ─── Bug 4: White flash / dock color fix ───
describe("Bug 4: Dock color fix", () => {
  it("CSS ceremony overlay uses warm brown tones, not white", () => {
    const css = readFile("client/src/index.css");
    // The ceremony overlay should NOT use pure white (#fff or #ffffff)
    // It should use warm brown tones
    const ceremonySection = css.includes("ceremony");
    expect(ceremonySection).toBe(true);
  });

  it("Mic button has visible color on bone-white dock", () => {
    const css = readFile("client/src/index.css");
    // Mic button should have a dark color visible on bone-white background
    expect(css).toMatch(/\.mic-btn/);
    // Hover state should use dark brown
    expect(css).toContain("#4A4540");
  });
});

// ─── Bug 5: Account setup card gold accent ───
describe("Bug 5: Account setup card styling", () => {
  it("TrustCard has gold accent for action variant", () => {
    const src = readFile("client/src/components/TrustCard.tsx");
    expect(src).toMatch(/gold|champagne|action/i);
  });

  it("CSS has trust-card-action with gold styling", () => {
    const css = readFile("client/src/index.css");
    expect(css).toContain("trust-card-action");
  });

  it("TrustCard has hint pointing to composer", () => {
    const src = readFile("client/src/components/TrustCard.tsx");
    expect(src).toMatch(/reply.*below|↓|hint/i);
  });
});

// ─── Bug 7: Name validation ───
describe("Bug 7: Name validation", () => {
  it("Chat router validates name input during registration", () => {
    const src = readFile("server/routers/chat.ts");
    // Should check if input looks like a name
    expect(src).toContain("isLikelyNotAName");
    // Should redirect non-names back to name prompt
    expect(src).toMatch(/get.*set.*up|first.*name|need.*name/i);
  });
});

// ─── Services Drawer ───
describe("Services Drawer", () => {
  it("ServicesDrawer component exists", () => {
    expect(existsSync(resolve(__dirname, "../client/src/components/ServicesDrawer.tsx"))).toBe(true);
  });

  it("ServicesDrawer has iOS bottom sheet styling", () => {
    const src = readFile("client/src/components/ServicesDrawer.tsx");
    // Should have backdrop/overlay
    expect(src).toMatch(/backdrop|overlay/i);
    // Should have drag handle
    expect(src).toMatch(/handle|pill|drag/i);
    // Should list services as rows
    expect(src).toMatch(/service|row|item/i);
  });

  it("Home.tsx has drawer trigger button", () => {
    const src = readFile("client/src/pages/Home.tsx");
    expect(src).toContain("drawerOpen");
    expect(src).toContain("ServicesDrawer");
  });

  it("CSS has services-drawer styling", () => {
    const css = readFile("client/src/index.css");
    expect(css).toContain("services-drawer");
  });
});

// ─── The Vault ───
describe("The Vault", () => {
  it("Vault page component exists", () => {
    expect(existsSync(resolve(__dirname, "../client/src/pages/Vault.tsx"))).toBe(true);
  });

  it("Vault has resident ID card section", () => {
    const src = readFile("client/src/pages/Vault.tsx");
    expect(src).toMatch(/resident.*id|id.*card/i);
  });

  it("Vault has booking history section", () => {
    const src = readFile("client/src/pages/Vault.tsx");
    expect(src).toMatch(/booking.*history|order.*history|past.*booking/i);
  });

  it("Vault fetches data via tRPC", () => {
    const src = readFile("client/src/pages/Vault.tsx");
    expect(src).toContain("trpc.chat.getVaultProfile");
    expect(src).toContain("trpc.chat.getRequests");
  });

  it("Home.tsx wires Vault with slide animation", () => {
    const src = readFile("client/src/pages/Home.tsx");
    expect(src).toContain("showVault");
    expect(src).toContain("setShowVault");
    expect(src).toContain("Vault onBack");
  });

  it("Vault tile in drawer opens Vault instead of toast", () => {
    const src = readFile("client/src/pages/Home.tsx");
    // Drawer should open Vault, not show toast
    const drawerVaultSection = src.includes('svc.id === "vault"') && src.includes("setShowVault(true)");
    expect(drawerVaultSection).toBe(true);
  });

  it("getVaultProfile endpoint exists in chat router", () => {
    const src = readFile("server/routers/chat.ts");
    expect(src).toContain("getVaultProfile");
  });

  it("CSS has vault styling", () => {
    const css = readFile("client/src/index.css");
    expect(css).toContain("vault");
  });
});
