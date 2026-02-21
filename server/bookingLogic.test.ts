/**
 * bookingLogic.test.ts — Unit tests for booking scheduling logic
 * Updated for Phase 2.5: laundry/dry-cleaning use same-day/next-morning logic
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  normalizeServiceCategory,
  getBookingDefaults,
  updatePreferencesFromBooking,
} from "./bookingLogic";
import * as db from "./db";

vi.mock("./db");

describe("bookingLogic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("normalizeServiceCategory", () => {
    it("should normalize service types to categories", () => {
      expect(normalizeServiceCategory("laundry")).toBe("laundry");
      expect(normalizeServiceCategory("dry-cleaning")).toBe("dry-cleaning");
      expect(normalizeServiceCategory("car-wash")).toBe("car-wash");
      expect(normalizeServiceCategory("car wash")).toBe("car-wash");
      expect(normalizeServiceCategory("cleaning")).toBe("cleaning");
      expect(normalizeServiceCategory("grooming")).toBe("grooming");
      expect(normalizeServiceCategory("pet grooming")).toBe("grooming");
    });

    it("should return original value for unknown types", () => {
      expect(normalizeServiceCategory("unknown")).toBe("unknown");
    });
  });

  describe("getBookingDefaults", () => {
    it("should return same-day or next-morning defaults for laundry (no building defaults)", async () => {
      vi.mocked(db.getPreference).mockResolvedValue(undefined);

      const defaults = await getBookingDefaults(1, "laundry");

      // Laundry now uses real-time pickup logic, not weekly building defaults
      // Window should be either 12:30–1:30 PM (same day) or 7–10 AM (next morning)
      expect(defaults.window).toMatch(/12:30–1:30 PM|7–10 AM/);
      expect(defaults.recurrence).toBe("weekly");
      expect(defaults.date).toMatch(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), [A-Z][a-z]+ \d+$/);
    });

    it("should return same-day or next-morning defaults for dry-cleaning", async () => {
      vi.mocked(db.getPreference).mockResolvedValue(undefined);

      const defaults = await getBookingDefaults(1, "dry-cleaning");

      expect(defaults.window).toMatch(/12:30–1:30 PM|7–10 AM/);
      // Dry cleaning defaults to no recurrence
      expect(defaults.date).toMatch(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), [A-Z][a-z]+ \d+$/);
    });

    it("should return hardcoded defaults for car-wash when no preference exists", async () => {
      vi.mocked(db.getPreference).mockResolvedValue(undefined);

      const defaults = await getBookingDefaults(1, "car-wash");

      expect(defaults.window).toBe("8–11 AM");
      expect(defaults.recurrence).toBeNull();
    });

    it("should return hardcoded defaults for cleaning when no preference exists", async () => {
      vi.mocked(db.getPreference).mockResolvedValue(undefined);

      const defaults = await getBookingDefaults(1, "cleaning");

      expect(defaults.window).toBe("1–4 PM");
      expect(defaults.recurrence).toBe("monthly");
    });

    it("should use preference when available and auto_schedule is enabled", async () => {
      vi.mocked(db.getPreference).mockResolvedValue({
        id: 1,
        bldgUserId: 1,
        serviceCategory: "car-wash",
        autoSchedule: "enabled",
        preferredDay: "Monday",
        preferredWindow: "9–11 AM",
        lastBookedDate: "Monday, Feb 17",
        recurrenceInterval: "weekly",
        vendorId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const defaults = await getBookingDefaults(1, "car-wash");

      expect(defaults.date).toContain("Monday");
      expect(defaults.window).toBe("9–11 AM");
      // Car-wash building default recurrence is null, so even with preference it returns null
      expect(defaults.recurrence).toBeNull();
    });

    it("should fall back to hardcoded defaults when preference exists but auto_schedule is disabled", async () => {
      vi.mocked(db.getPreference).mockResolvedValue({
        id: 1,
        bldgUserId: 1,
        serviceCategory: "car-wash",
        autoSchedule: "disabled",
        preferredDay: "Monday",
        preferredWindow: "9–11 AM",
        lastBookedDate: "Monday, Feb 17",
        recurrenceInterval: "weekly",
        vendorId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const defaults = await getBookingDefaults(1, "car-wash");

      // Should use hardcoded defaults for car-wash (Wednesday)
      expect(defaults.window).toBe("8–11 AM");
    });
  });

  describe("updatePreferencesFromBooking", () => {
    it("should extract day name and upsert preference", async () => {
      vi.mocked(db.getPreference).mockResolvedValue(undefined);
      await updatePreferencesFromBooking(
        1,
        "laundry",
        "Thursday, Feb 20",
        "7–10 AM",
        "weekly"
      );

      expect(db.upsertPreference).toHaveBeenCalledWith({
        bldgUserId: 1,
        serviceCategory: "laundry",
        autoSchedule: "enabled",
        preferredDay: "Thursday",
        preferredWindow: "7–10 AM",
        lastBookedDate: "Thursday, Feb 20",
        recurrenceInterval: "weekly",
        driftWindowCount: 0,
      });
    });

    it("should handle dates without day name", async () => {
      vi.mocked(db.getPreference).mockResolvedValue(undefined);
      await updatePreferencesFromBooking(
        1,
        "car-wash",
        "Feb 20",
        "9–11 AM",
        null
      );

      expect(db.upsertPreference).toHaveBeenCalledWith({
        bldgUserId: 1,
        serviceCategory: "car-wash",
        autoSchedule: "enabled",
        preferredDay: null,
        preferredWindow: "9–11 AM",
        lastBookedDate: "Feb 20",
        recurrenceInterval: null,
        driftWindowCount: 0,
      });
    });

    it("should keep dry-cleaning as its own category when upserting", async () => {
      vi.mocked(db.getPreference).mockResolvedValue(undefined);
      await updatePreferencesFromBooking(
        1,
        "dry-cleaning",
        "Thursday, Feb 20",
        "7–10 AM",
        "weekly"
      );

      expect(db.upsertPreference).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceCategory: "dry-cleaning",
        })
      );
    });
  });
});
