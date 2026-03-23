import { describe, expect, it } from "vitest";
import {
  getCriticalProfileGaps,
  isCriticalProfileComplete,
  isStrictPaymentComplete,
  needsCriticalProfileRecovery,
} from "./profileCritical";

describe("profileCritical", () => {
  it("requires both names and strict payment", () => {
    expect(
      isCriticalProfileComplete({
        firstName: "A",
        lastName: "B",
        paymentMethodSaved: 1,
        stripePaymentMethodId: "pm_x",
      })
    ).toBe(true);
    expect(needsCriticalProfileRecovery(null)).toBe(true);
    expect(
      getCriticalProfileGaps({
        firstName: "A",
        lastName: "",
        paymentMethodSaved: 1,
        stripePaymentMethodId: "pm_x",
      }).missingLastName
    ).toBe(true);
    expect(
      getCriticalProfileGaps({
        firstName: "A",
        lastName: "B",
        paymentMethodSaved: 1,
        stripePaymentMethodId: "  ",
      }).missingPayment
    ).toBe(true);
    expect(
      getCriticalProfileGaps({
        firstName: "A",
        lastName: "B",
        paymentMethodSaved: 0,
        stripePaymentMethodId: "pm_x",
      }).missingPayment
    ).toBe(true);
  });

  it("isStrictPaymentComplete ignores names", () => {
    expect(
      isStrictPaymentComplete({
        paymentMethodSaved: 1,
        stripePaymentMethodId: "pm_1",
      })
    ).toBe(true);
    expect(
      isStrictPaymentComplete({
        paymentMethodSaved: 1,
        stripePaymentMethodId: null,
      })
    ).toBe(false);
  });
});
