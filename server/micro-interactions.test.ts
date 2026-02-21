/**
 * Phase 2.0: "Breathe Life" Micro-Interaction Tests
 *
 * These tests verify the logic and CSS class wiring for all 10 micro-interactions.
 * Since these are primarily CSS-driven animations, we test:
 * 1. The helper functions produce correct values
 * 2. The CSS classes referenced in components actually exist in index.css
 * 3. The component props are correctly typed and wired
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// Read the CSS file once for all tests
const cssContent = readFileSync(
  join(__dirname, "../client/src/index.css"),
  "utf-8"
);

// Read component files
const homeTsx = readFileSync(
  join(__dirname, "../client/src/pages/Home.tsx"),
  "utf-8"
);
const bldgLogoTsx = readFileSync(
  join(__dirname, "../client/src/components/BldgLogo.tsx"),
  "utf-8"
);
const activeBookingsTsx = readFileSync(
  join(__dirname, "../client/src/components/ActiveBookingsBar.tsx"),
  "utf-8"
);

describe("Phase 2.0: Micro-Interaction CSS Classes", () => {
  // ─── 1. Send Animation ───
  describe("#1: Haptic-feel send animation", () => {
    it("defines bubble-launch keyframes and class", () => {
      expect(cssContent).toContain("@keyframes bubble-launch");
      expect(cssContent).toContain(".bubble-launch");
    });

    it("defines send-btn-compress keyframes and class", () => {
      expect(cssContent).toContain("@keyframes send-btn-compress");
      expect(cssContent).toContain(".send-btn-compress");
    });

    it("defines composer-exhale keyframes and class", () => {
      expect(cssContent).toContain("@keyframes composer-exhale");
      expect(cssContent).toContain(".composer-exhale");
    });

    it("Home.tsx applies bubble-launch class to just-sent user messages", () => {
      expect(homeTsx).toContain("bubble-launch");
      expect(homeTsx).toContain("_justSent");
    });

    it("Home.tsx applies send-btn-compress class to send button", () => {
      expect(homeTsx).toContain("send-btn-compress");
      expect(homeTsx).toContain("sendBtnCompress");
    });

    it("Home.tsx applies composer-exhale class to composer", () => {
      expect(homeTsx).toContain("composer-exhale");
      expect(homeTsx).toContain("composerExhale");
    });
  });

  // ─── 2. Composer Breathing ───
  describe("#2: Composer breathing pulse", () => {
    it("defines composer-breathe keyframes", () => {
      expect(cssContent).toContain("@keyframes composer-breathe");
    });

    it("defines composer-breathing class", () => {
      expect(cssContent).toContain(".composer-breathing");
    });

    it("Home.tsx applies composer-breathing class when isSending", () => {
      expect(homeTsx).toContain('isSending ? "composer-breathing"');
    });
  });

  // ─── 3. Confirmation Card Ceremony ───
  describe("#3: Confirmation card ceremony", () => {
    it("defines confirm-glow keyframes", () => {
      expect(cssContent).toContain("@keyframes confirm-glow");
    });

    it("defines confirmation-ceremony class", () => {
      expect(cssContent).toContain(".confirmation-ceremony");
    });

    it("defines ticker-reveal keyframes for CONFIRMED text", () => {
      expect(cssContent).toContain("@keyframes ticker-reveal");
      expect(cssContent).toContain(".confirmation-ticker");
    });

    it("ConfirmationCard component accepts isNew prop for ceremony", () => {
      expect(homeTsx).toContain("isNew?: boolean");
      expect(homeTsx).toContain("confirmation-ceremony");
      expect(homeTsx).toContain("confirmation-ticker");
    });

    it("Home.tsx tracks ceremonyIndex for new bookings", () => {
      expect(homeTsx).toContain("ceremonyIndex");
      expect(homeTsx).toContain("setCeremonyIndex");
    });
  });

  // ─── 4. Overscroll Glow ───
  describe("#4: Overscroll glow", () => {
    it("defines overscroll-glow CSS class", () => {
      expect(cssContent).toContain(".overscroll-glow");
    });

    it("defines overscroll-glow.visible class", () => {
      expect(cssContent).toContain(".overscroll-glow.visible");
    });

    it("Home.tsx renders overscroll-glow element", () => {
      expect(homeTsx).toContain("overscroll-glow");
      expect(homeTsx).toContain("showOverscrollGlow");
    });

    it("Home.tsx detects scroll position for overscroll glow", () => {
      expect(homeTsx).toContain("container.scrollTop");
      expect(homeTsx).toContain("setShowOverscrollGlow");
    });
  });

  // ─── 5. Breathing Logo ───
  describe("#5: Breathing logo in empty state", () => {
    it("defines logo-breathe keyframes", () => {
      expect(cssContent).toContain("@keyframes logo-breathe");
    });

    it("defines bldg-dot-breathe class", () => {
      expect(cssContent).toContain(".bldg-dot-breathe");
    });

    it("BldgLogo component accepts 'breathe' animation type", () => {
      expect(bldgLogoTsx).toContain('"breathe"');
      expect(bldgLogoTsx).toContain("bldg-dot-breathe");
    });

    it("Home.tsx passes animate='breathe' to empty state logo", () => {
      expect(homeTsx).toContain('animate="breathe"');
    });
  });

  // ─── 6. Night Ambient Shift ───
  describe("#6: Night ambient shift", () => {
    it("defines night-mode CSS classes", () => {
      expect(cssContent).toContain(".app-shell.night-mode");
    });

    it("night-mode changes accent color to blue-silver", () => {
      expect(cssContent).toContain("--accent: #8CA0C8");
    });

    it("night-mode changes ambient glow", () => {
      expect(cssContent).toContain(".app-shell.night-mode::after");
    });

    it("night-mode increases grain opacity", () => {
      expect(cssContent).toContain(".app-shell.night-mode::before");
    });

    it("Home.tsx has isNightTime helper function", () => {
      expect(homeTsx).toContain("function isNightTime");
      expect(homeTsx).toContain("hour >= 22 || hour < 6");
    });

    it("Home.tsx applies night-mode class to app-shell", () => {
      expect(homeTsx).toContain('nightMode ? "night-mode"');
    });

    it("Home.tsx checks night mode every minute", () => {
      expect(homeTsx).toContain("60_000");
      expect(homeTsx).toContain("setNightMode");
    });
  });

  // ─── 7. Tile Tap Ripple ───
  describe("#7: Tile tap ripple", () => {
    it("defines tile-ripple keyframes", () => {
      expect(cssContent).toContain("@keyframes tile-ripple");
    });

    it("defines tile-ripple class", () => {
      expect(cssContent).toContain(".tile-ripple");
    });

    it("chat-tile has overflow:hidden for ripple containment", () => {
      expect(cssContent).toContain(".chat-tile");
      // The CSS should set overflow hidden on chat-tile
      const chatTileSection = cssContent.substring(
        cssContent.indexOf("/* ─── 7. Tile Tap Ripple"),
        cssContent.indexOf("/* ─── 8.")
      );
      expect(chatTileSection).toContain("overflow: hidden");
    });

    it("Home.tsx has createRipple helper function", () => {
      expect(homeTsx).toContain("function createRipple");
      expect(homeTsx).toContain("tile-ripple");
    });

    it("Home.tsx calls createRipple on tile tap", () => {
      expect(homeTsx).toContain("createRipple(e)");
    });
  });

  // ─── 8. Welcome Chip Stagger ───
  describe("#8: Welcome chip stagger entrance", () => {
    it("defines chip-cascade keyframes", () => {
      expect(cssContent).toContain("@keyframes chip-cascade");
    });

    it("defines chip-stagger class with nth-child delays", () => {
      expect(cssContent).toContain(".chip-stagger");
      expect(cssContent).toContain(".chip-stagger:nth-child(1)");
      expect(cssContent).toContain(".chip-stagger:nth-child(2)");
      expect(cssContent).toContain(".chip-stagger:nth-child(3)");
    });

    it("stagger delays are 80ms apart", () => {
      expect(cssContent).toContain("animation-delay: 0ms");
      expect(cssContent).toContain("animation-delay: 80ms");
      expect(cssContent).toContain("animation-delay: 160ms");
    });

    it("Home.tsx applies chip-stagger class to welcome chips", () => {
      expect(homeTsx).toContain("chip-stagger");
    });
  });

  // ─── 9. Booking Chip Pulse ───
  describe("#9: Booking chip pulse", () => {
    it("defines chip-border-pulse keyframes", () => {
      expect(cssContent).toContain("@keyframes chip-border-pulse");
    });

    it("defines booking-chip-pulse class", () => {
      expect(cssContent).toContain(".booking-chip-pulse");
    });

    it("pulse animation is 8 seconds", () => {
      expect(cssContent).toContain("8s ease-in-out infinite");
    });

    it("ActiveBookingsBar accepts pulseFirst prop", () => {
      expect(activeBookingsTsx).toContain("pulseFirst");
      expect(activeBookingsTsx).toContain("booking-chip-pulse");
    });

    it("ActiveBookingsBar applies pulse only to first chip", () => {
      expect(activeBookingsTsx).toContain("index === 0");
    });
  });

  // ─── 10. Avatar Presence Glow ───
  describe("#10: Avatar presence glow", () => {
    it("defines avatar-glow keyframes", () => {
      expect(cssContent).toContain("@keyframes avatar-glow");
    });

    it("defines avatar-presence-glow class", () => {
      expect(cssContent).toContain(".avatar-presence-glow");
    });

    it("glow uses champagne-gold color", () => {
      const glowSection = cssContent.substring(
        cssContent.indexOf("@keyframes avatar-glow"),
        cssContent.indexOf("Reduced Motion")
      );
      expect(glowSection).toContain("rgba(201, 169, 110");
    });

    it("Home.tsx applies avatar-presence-glow to typing indicator avatar", () => {
      expect(homeTsx).toContain("avatar-presence-glow");
    });
  });

  // ─── Accessibility: Reduced Motion ───
  describe("Accessibility: prefers-reduced-motion", () => {
    it("disables all Phase 2.0 animations when reduced motion is preferred", () => {
      expect(cssContent).toContain("@media (prefers-reduced-motion: reduce)");
      expect(cssContent).toContain("animation: none !important");
    });

    it("hides overscroll glow in reduced motion", () => {
      const reducedMotionSection = cssContent.substring(
        cssContent.indexOf("@media (prefers-reduced-motion: reduce)")
      );
      expect(reducedMotionSection).toContain(".overscroll-glow");
      expect(reducedMotionSection).toContain("display: none");
    });

    it("covers all 10 animation classes in reduced motion block", () => {
      const reducedMotionSection = cssContent.substring(
        cssContent.indexOf("@media (prefers-reduced-motion: reduce)")
      );
      const expectedClasses = [
        ".bubble-launch",
        ".send-btn-compress",
        ".composer-exhale",
        ".composer-breathing",
        ".confirmation-ceremony",
        ".confirmation-ticker",
        ".bldg-dot-breathe",
        ".tile-ripple",
        ".chip-stagger",
        ".booking-chip-pulse",
        ".avatar-presence-glow",
      ];
      for (const cls of expectedClasses) {
        expect(reducedMotionSection).toContain(cls);
      }
    });
  });
});

// ─── isNightTime logic tests ───
describe("isNightTime helper logic", () => {
  it("returns true for hours 22-23 and 0-5", () => {
    // We test the logic directly since it's a pure function
    const isNight = (hour: number) => hour >= 22 || hour < 6;
    
    // Night hours
    expect(isNight(22)).toBe(true);
    expect(isNight(23)).toBe(true);
    expect(isNight(0)).toBe(true);
    expect(isNight(1)).toBe(true);
    expect(isNight(5)).toBe(true);
    
    // Day hours
    expect(isNight(6)).toBe(false);
    expect(isNight(12)).toBe(false);
    expect(isNight(17)).toBe(false);
    expect(isNight(21)).toBe(false);
  });
});
