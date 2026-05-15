import { describe, expect, it } from "vitest";
import { inferResidentIntent, isFutureVendorServiceIntent } from "./intentClassifier";

describe("inferResidentIntent", () => {
  it("detects current laundry booking behavior", () => {
    expect(inferResidentIntent("laundry")).toMatchObject({ type: "laundry" });
    expect(inferResidentIntent("I need laundry pickup")).toMatchObject({
      type: "laundry",
    });
  });

  it("does not turn laundry questions into bookings", () => {
    expect(inferResidentIntent("how much is laundry?")).toMatchObject({
      type: "unknown",
    });
  });

  it("classifies future vendor services as pending vendor work", () => {
    const dogGrooming = inferResidentIntent("can you get a dog groomer Saturday?");
    const carWash = inferResidentIntent("car wash");
    const dryCleaning = inferResidentIntent("dry clean my suit");
    const airport = inferResidentIntent("Uber from LAX");
    const cleaning = inferResidentIntent("clean my apartment");
    const guestPrep = inferResidentIntent("before my mother-in-law visits");

    expect(dogGrooming).toMatchObject({ type: "dog-grooming-request" });
    expect(carWash).toMatchObject({ type: "car-wash-request" });
    expect(dryCleaning).toMatchObject({ type: "dry-cleaning-request" });
    expect(airport).toMatchObject({ type: "airport-transport-request" });
    expect(cleaning).toMatchObject({ type: "cleaning-request" });
    expect(guestPrep).toMatchObject({ type: "guest-preparation-request" });
    expect(isFutureVendorServiceIntent(dogGrooming)).toBe(true);
    expect(isFutureVendorServiceIntent(carWash)).toBe(true);
    expect(isFutureVendorServiceIntent(dryCleaning)).toBe(true);
    expect(isFutureVendorServiceIntent(airport)).toBe(true);
  });
});
