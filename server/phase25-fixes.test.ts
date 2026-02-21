/**
 * Phase 2.5 Tests — Bug fixes + new tiles + dry cleaning pricing
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// ─── Helper to read source files ───
function readFile(relativePath: string): string {
  return readFileSync(resolve(__dirname, "..", relativePath), "utf-8");
}

describe("Phase 2.5: Building naming fix", () => {
  it("BuildingSelector uses 'For Opus LA' naming", () => {
    const src = readFile("client/src/components/onboarding/BuildingSelector.tsx");
    expect(src).toContain("For Opus LA");
    expect(src).toContain("For Century Park East");
    // Should NOT use bare building names
    expect(src).not.toMatch(/label:\s*["']The Opus/);
    expect(src).not.toMatch(/label:\s*["']Century Park East["']/);
  });
});

describe("Phase 2.5: Tutorial animation", () => {
  it("TutorialScreen has slower animation delays", () => {
    const src = readFile("client/src/components/onboarding/TutorialScreen.tsx");
    // Should have delays >= 800ms between bubbles (reading pace)
    expect(src).toMatch(/delay.*[89]\d{2}|1[0-9]{3}/);
  });

  it("TutorialScreen arrow points DOWN above Laundry tile", () => {
    const src = readFile("client/src/components/onboarding/TutorialScreen.tsx");
    // Arrow should point downward (▼ or rotate-180 or similar)
    expect(src).toMatch(/▼|arrow.*down|point.*down|rotate/i);
  });

  it("TutorialScreen triggers laundry on click", () => {
    const src = readFile("client/src/components/onboarding/TutorialScreen.tsx");
    expect(src).toMatch(/onComplete|triggerLaundry|autoTrigger/);
  });
});

describe("Phase 2.5: Skip address after onboarding", () => {
  it("startRegistration checks for existing building+unit", () => {
    const src = readFile("server/routers/chat.ts");
    expect(src).toContain("hasAddress");
    expect(src).toContain("user.buildingSlug && user.unit");
    expect(src).toContain("skipping to name");
  });
});

describe("Phase 2.5: Booking date logic", () => {
  it("bookingLogic uses 11:30am cutoff for same-day pickup", () => {
    const src = readFile("server/bookingLogic.ts");
    expect(src).toContain("11 * 60 + 30"); // 11:30am cutoff
    expect(src).toContain("12:30"); // same-day pickup starts at 12:30
  });

  it("bookingLogic handles laundry and dry-cleaning with same pickup logic", () => {
    const src = readFile("server/bookingLogic.ts");
    expect(src).toMatch(/normalized === "laundry" \|\| normalized === "dry-cleaning"/);
  });

  it("bookingLogic returns 'Within 24 hours of pickup' for laundry delivery", () => {
    const src = readFile("server/bookingLogic.ts");
    expect(src).toContain("Within 24 hours of pickup");
  });

  it("bookingLogic returns '2 business days' for dry cleaning delivery", () => {
    const src = readFile("server/bookingLogic.ts");
    expect(src).toContain("2 business days");
  });
});

describe("Phase 2.5: Dry cleaning pricing in system prompt", () => {
  it("System prompt contains dry cleaning pricing", () => {
    const src = readFile("server/routers/chat.ts");
    expect(src).toContain("DRY CLEANING PRICING");
    expect(src).toContain("Dress Shirt $6");
    expect(src).toContain("2pc Suit $25");
    expect(src).toContain("Gown $42");
  });

  it("System prompt contains laundry pricing", () => {
    const src = readFile("server/routers/chat.ts");
    expect(src).toContain("$2.50/lb");
    expect(src).toContain("Hang Dry add-on: +$5.00");
  });

  it("System prompt contains scheduling rules", () => {
    const src = readFile("server/routers/chat.ts");
    expect(src).toContain("before 11:30am LA time");
    expect(src).toContain("SAME DAY 12:30");
    expect(src).toContain("NEXT MORNING 7");
    expect(src).toContain("2 business days from pickup");
    expect(src).toContain("+$2/garment surcharge");
  });

  it("System prompt has dry cleaning booking example", () => {
    const src = readFile("server/routers/chat.ts");
    expect(src).toContain("[SERVICE: dry-cleaning]");
    expect(src).toContain("Dry clean 5 dress shirts");
  });
});

describe("Phase 2.5: Service tiles", () => {
  it("Home.tsx has 6 service tiles including Dry Cleaning and Vault", () => {
    const src = readFile("client/src/pages/Home.tsx");
    expect(src).toContain('"dry-cleaning"');
    expect(src).toContain('"vault"');
    expect(src).toContain("The Vault");
    expect(src).toContain("DryCleanIcon");
    expect(src).toContain("VaultIcon");
  });

  it("serviceToCategory handles dry cleaning before general cleaning", () => {
    const src = readFile("client/src/pages/Home.tsx");
    // dry-cleaning check must come before generic cleaning check
    const dryCleanIdx = src.indexOf('s.includes("dry") && s.includes("clean")');
    const cleanIdx = src.indexOf('s.includes("clean")');
    expect(dryCleanIdx).toBeLessThan(cleanIdx);
    expect(dryCleanIdx).toBeGreaterThan(-1);
  });

  it("Vault tile opens The Vault page", () => {
    const src = readFile("client/src/pages/Home.tsx");
    expect(src).toContain('tile.id === "vault"');
    expect(src).toContain("setShowVault(true)");
  });

  it("Confirmation card shows 'Fulfilled by Laundry Butler' for laundry and dry-cleaning", () => {
    const src = readFile("client/src/pages/Home.tsx");
    expect(src).toContain('category === "dry-cleaning"');
    expect(src).toContain("Fulfilled by Laundry Butler.");
  });
});

describe("Phase 2.5: Dry cleaning onboarding message", () => {
  it("getOnboardingMessage handles dry-cleaning", () => {
    const src = readFile("server/routers/chat.ts");
    expect(src).toContain('serviceCategory === "dry-cleaning"');
    expect(src).toContain("How dry cleaning pickup works");
    expect(src).toContain("2 business days");
    expect(src).toContain("+$2/garment surcharge");
  });
});
