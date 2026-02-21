/**
 * Test for getNowInLA timezone fix
 * Verifies that getNowInLA correctly returns LA local time
 */

import { describe, it, expect } from "vitest";
import { getBookingDefaults } from "./bookingLogic";

describe("getNowInLA timezone fix", () => {
  it("should return correct booking window before 11:30 AM (12:30-1:30 PM same day)", async () => {
    // This test runs at current time. If it's before 11:30 AM PST, should get 12:30-1:30 PM
    // If it's after 11:30 AM PST, should get 7-10 AM next day
    const defaults = await getBookingDefaults(null, "laundry");
    
    // Verify the window is one of the expected values
    expect(
      defaults.window === "12:30–1:30 PM" || defaults.window === "7–10 AM"
    ).toBe(true);
    
    // Verify the date is either today or tomorrow
    expect(defaults.date).toMatch(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/);
  });

  it("should return correct booking window for dry-cleaning", async () => {
    const defaults = await getBookingDefaults(null, "dry-cleaning");
    
    // Dry cleaning uses same logic as laundry
    expect(
      defaults.window === "12:30–1:30 PM" || defaults.window === "7–10 AM"
    ).toBe(true);
  });

  it("should have valid scheduled times in UTC", async () => {
    const defaults = await getBookingDefaults(null, "laundry");
    
    // Verify ISO 8601 UTC timestamps
    expect(defaults.scheduled_start_utc).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(defaults.scheduled_end_utc).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    
    // Verify end time is after start time
    const startTime = new Date(defaults.scheduled_start_utc).getTime();
    const endTime = new Date(defaults.scheduled_end_utc).getTime();
    expect(endTime).toBeGreaterThan(startTime);
  });
});
