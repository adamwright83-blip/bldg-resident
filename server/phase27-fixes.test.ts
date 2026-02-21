/**
 * Phase 2.7: Critical Bug Fix Tests
 *
 * Tests verify:
 * 1. Services pill spacing (CSS margin-top)
 * 2. Welcome chips only show in empty state (messages.length === 0)
 * 3. Send button disabled opacity increased for visibility
 * 4. History sync handles refetch data properly
 * 5. Collection step response is handled by frontend
 * 6. Vault profile endpoint returns user data
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// ─── Bug 1: Services pill spacing ───

describe("Services pill spacing", () => {
  const css = readFileSync(
    resolve(__dirname, "../client/src/index.css"),
    "utf-8"
  );

  it("services-drawer-trigger has margin-top for spacing", () => {
    // Should have margin-top > 0 to prevent touching elements above
    const match = css.match(/\.services-drawer-trigger\s*\{[^}]*margin:\s*(\d+)px/);
    expect(match).toBeTruthy();
    const marginTop = parseInt(match![1], 10);
    expect(marginTop).toBeGreaterThanOrEqual(8);
  });
});

// ─── Bug 2: Welcome chips only in empty state ───

describe("Welcome chips visibility", () => {
  const homeSource = readFileSync(
    resolve(__dirname, "../client/src/pages/Home.tsx"),
    "utf-8"
  );

  it("welcome chips condition includes messages.length === 0", () => {
    // The welcome chips should only show when there are no messages
    expect(homeSource).toContain("messages.length === 0");
  });

  it("welcome chips do NOT show alongside services pill", () => {
    // The services pill shows when !showTiles && !isSending
    // Welcome chips must have an additional messages.length === 0 guard
    const chipsBlock = homeSource.match(
      /Welcome Chips.*?messages\.length === 0/s
    );
    expect(chipsBlock).toBeTruthy();
  });
});

// ─── Bug 3: Send button visibility ───

describe("Send button visibility", () => {
  const css = readFileSync(
    resolve(__dirname, "../client/src/index.css"),
    "utf-8"
  );

  it("disabled send button has opacity >= 0.3 for visibility", () => {
    const match = css.match(/\.chat-send-btn:disabled\s*\{[^}]*opacity:\s*([\d.]+)/);
    expect(match).toBeTruthy();
    const opacity = parseFloat(match![1]);
    expect(opacity).toBeGreaterThanOrEqual(0.3);
  });
});

// ─── Bug 4: History sync handles refetch ───

describe("History sync with refetch", () => {
  const homeSource = readFileSync(
    resolve(__dirname, "../client/src/pages/Home.tsx"),
    "utf-8"
  );

  it("history sync uses dataUpdatedAt for change detection", () => {
    expect(homeSource).toContain("dataUpdatedAt");
    expect(homeSource).toContain("lastSyncRef");
  });

  it("history sync preserves _justSent flags during merge", () => {
    expect(homeSource).toContain("_justSent");
    expect(homeSource).toContain("merged");
  });

  it("multiple refetch calls after booking for reliability", () => {
    // Should have two setTimeout calls for refetch after booking
    const bookingRefetchBlock = homeSource.match(
      /if \(response\.booking\)[\s\S]*?setTimeout.*?refetch.*?\n.*?setTimeout.*?refetch/
    );
    expect(bookingRefetchBlock).toBeTruthy();
  });
});

// ─── Bug 5: Collection step immediate rendering ───

describe("Collection step immediate rendering", () => {
  const homeSource = readFileSync(
    resolve(__dirname, "../client/src/pages/Home.tsx"),
    "utf-8"
  );

  it("frontend handles collectStep from sendMessage response", () => {
    expect(homeSource).toContain("collectStep");
    expect(homeSource).toContain("onboarding_collect");
  });

  it("collection message is added to messages immediately", () => {
    // Should create a ChatMsg with onboarding_collect metadata
    const collectBlock = homeSource.match(
      /collectStep[\s\S]*?onboarding_collect[\s\S]*?setMessages/
    );
    expect(collectBlock).toBeTruthy();
  });
});

// ─── Bug 6: Vault profile endpoint ───

describe("Vault profile endpoint", () => {
  const chatRouter = readFileSync(
    resolve(__dirname, "routers/chat.ts"),
    "utf-8"
  );

  it("getVaultProfile returns firstName, lastName, phone, card info", () => {
    expect(chatRouter).toContain("getVaultProfile");
    expect(chatRouter).toContain("firstName");
    expect(chatRouter).toContain("lastName");
    expect(chatRouter).toContain("phoneE164");
    expect(chatRouter).toContain("cardLast4");
    expect(chatRouter).toContain("paymentMethodSaved");
  });
});

// ─── Post-booking collection trigger ───

describe("Registration-first flow (Phase 3.4 update)", () => {
  const chatRouter = readFileSync(
    resolve(__dirname, "routers/chat.ts"),
    "utf-8"
  );

  it("has startRegistration mutation for pre-booking registration", () => {
    expect(chatRouter).toContain("startRegistration: publicProcedure");
    expect(chatRouter).toContain("ONBOARDING_STEP.NOT_STARTED");
    expect(chatRouter).toContain("COLLECTING_NAME");
  });

  it("checks hasAddress in startRegistration", () => {
    expect(chatRouter).toContain("hasAddress");
    expect(chatRouter).toContain("has address, skipping to name");
  });

  it("returns collectStep in the response for immediate frontend rendering", () => {
    expect(chatRouter).toContain("collectStep: collectResult.collectType");
  });
});
