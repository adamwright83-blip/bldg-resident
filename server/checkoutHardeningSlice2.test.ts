/**
 * Checkout Hardening Slice 2
 *
 * The live resident surface is PenPullPrototype.tsx (Home.tsx/Settings.tsx
 * are unrouted dead code — see App.tsx's PageSwitch). This verifies the
 * no-pending-order card-save messaging actually landed in the live component,
 * and that the genuine pending-order/settings paths were left unchanged.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");
const prototype = readFileSync(
  join(ROOT, "client/src/components/held/PenPullPrototype.tsx"),
  "utf-8"
);

describe("Checkout Hardening Slice 2: PenPullPrototype no-order payment clarity", () => {
  it("shows the exact no-order message when a card is saved with no pending order", () => {
    expect(prototype).toContain(
      "Card saved. Tell HELD what you need to schedule your order."
    );
  });

  it("onboarding card save (finishProfileOnboarding) branches on hasPendingOrder before claiming an order", () => {
    expect(prototype).toContain("const finishProfileOnboarding = async (info?: { hasPendingOrder?: boolean })");
    expect(prototype).toContain("if (info?.hasPendingOrder)");
  });

  it("the collectPayment card routes through finishProfileOnboarding when onboarding, or the no-resend-aware handler otherwise", () => {
    expect(prototype).toContain(
      "onSuccess={profileOnboardingActive ? finishProfileOnboarding : handleCheckoutPaymentSaved}"
    );
  });

  it("renders the no-order confirmation in a dedicated mode, not the generic rest/idle state", () => {
    expect(prototype).toContain('"cardSavedNoOrder"');
    expect(prototype).toContain('mode === "cardSavedNoOrder"');
  });

  it("the settings/payment-drawer card save still makes no order claim at all", () => {
    expect(prototype).toContain("<PaymentMethodForm onSuccess={onClose} />");
  });

  it("the genuine pending-order checkout path still resends via retryPendingOrder, unchanged", () => {
    expect(prototype).toContain("const retryPendingOrder = () => {");
    expect(prototype).toContain("void beginSetInMotion(request, services);");
  });
});

describe("Checkout Hardening Slice 2b: no duplicate order on deferred-booking success", () => {
  it("does not call retryPendingOrder when the server already executed the deferred booking", () => {
    expect(prototype).toContain("const handleCheckoutPaymentSaved = (info?: { deferredBookingExecuted?: boolean })");
    expect(prototype).toContain("if (info?.deferredBookingExecuted) {");
    // Inside the deferredBookingExecuted branch, the function must return
    // before reaching the retryPendingOrder() fallback call below it.
    const handlerStart = prototype.indexOf("const handleCheckoutPaymentSaved");
    const handlerBody = prototype.slice(handlerStart, handlerStart + 900);
    const ifIndex = handlerBody.indexOf("if (info?.deferredBookingExecuted) {");
    const returnIndex = handlerBody.indexOf("return;", ifIndex);
    const retryCallIndex = handlerBody.lastIndexOf("retryPendingOrder();");
    expect(ifIndex).toBeGreaterThan(-1);
    expect(returnIndex).toBeGreaterThan(ifIndex);
    expect(returnIndex).toBeLessThan(retryCallIndex);
  });

  it("falls back to retryPendingOrder only when the server did not execute the deferred booking", () => {
    const handlerStart = prototype.indexOf("const handleCheckoutPaymentSaved");
    const handlerBody = prototype.slice(handlerStart, handlerStart + 900);
    expect(handlerBody).toContain("retryPendingOrder();");
  });
});
