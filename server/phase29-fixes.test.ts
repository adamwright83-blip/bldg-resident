/**
 * Phase 2.9 Bug Fix Tests
 *
 * 1. JWT signing key fix — merged cookie uses JWT_SECRET + bldgUserId claim
 * 2. ActiveBookingsBar removed from bottom area
 * 3. SuggestedChip removed from bottom area
 * 4. Duplicate booking text bubble suppressed (only CONFIRMED card shows)
 * 5. Delivery window added to ConfirmationCard
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");

describe("Phase 2.9: Screen wipe fix", () => {
  it("uses JWT_SECRET (not APP_SHARED_API_SECRET) when reissuing merged session cookie", () => {
    const chatRouter = readFileSync(join(ROOT, "server/routers/chat.ts"), "utf-8");
    // The merge flow should sign with JWT_SECRET
    const mergeSection = chatRouter.slice(
      chatRouter.indexOf("Reissue session cookie if merged"),
      chatRouter.indexOf("Reissue session cookie if merged") + 400
    );
    expect(mergeSection).toContain('process.env.JWT_SECRET');
    expect(mergeSection).not.toContain('APP_SHARED_API_SECRET');
  });

  it("sets bldgUserId claim (not sub) in the merged JWT", () => {
    const chatRouter = readFileSync(join(ROOT, "server/routers/chat.ts"), "utf-8");
    const mergeSection = chatRouter.slice(
      chatRouter.indexOf("Reissue session cookie if merged"),
      chatRouter.indexOf("Reissue session cookie if merged") + 400
    );
    expect(mergeSection).toContain("bldgUserId:");
    // Should NOT use { sub: ... } which getBldgUserIdFromRequest can't parse
    expect(mergeSection).not.toMatch(/new SignJWT\(\s*\{\s*sub:/);
  });
});

describe("Phase 2.9: UI cleanup — bottom area", () => {
  const homeContent = readFileSync(join(ROOT, "client/src/pages/Home.tsx"), "utf-8");

  it("does not render ActiveBookingsBar in the bottom area", () => {
    expect(homeContent).not.toContain("<ActiveBookingsBar");
  });

  it("does not render SuggestedChip in the bottom area", () => {
    expect(homeContent).not.toContain("<SuggestedChip");
  });

  it("does not import ActiveBookingsBar", () => {
    // Should be commented out or removed
    expect(homeContent).not.toMatch(/^import ActiveBookingsBar/m);
  });
});

describe("Phase 2.9: Duplicate booking bubble suppressed", () => {
  const homeContent = readFileSync(join(ROOT, "client/src/pages/Home.tsx"), "utf-8");

  it("skips regular text bubble for booking metadata messages", () => {
    // The condition should include booking type in the skip list
    expect(homeContent).toContain('msg.metadata?.type === "booking"');
    // It should be in the same condition as onboarding_collect
    expect(homeContent).toContain('msg.metadata?.type === "onboarding_collect" || msg.metadata?.type === "booking"');
  });
});

describe("Phase 2.9: Delivery window in ConfirmationCard", () => {
  const homeContent = readFileSync(join(ROOT, "client/src/pages/Home.tsx"), "utf-8");

  it("shows 'Back within 24 hours' for laundry/dry-cleaning", () => {
    expect(homeContent).toContain("Back within 24 hours");
    expect(homeContent).toContain("confirmation-card-delivery");
  });

  it("has CSS for the delivery line", () => {
    const css = readFileSync(join(ROOT, "client/src/index.css"), "utf-8");
    expect(css).toContain(".confirmation-card-delivery");
  });
});
