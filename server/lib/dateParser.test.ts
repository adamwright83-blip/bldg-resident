import { describe, expect, it } from "vitest";
import {
  parseExplicitDateTime,
  parseRelativeDateToISO,
} from "./dateParser";

describe("dateParser relative dates", () => {
  const currentDate = "2026-05-15";

  it("parses in two days from Friday May 15 as Sunday May 17", () => {
    expect(parseRelativeDateToISO("laundry in two days", currentDate)).toBe("2026-05-17");
    expect(parseExplicitDateTime("laundry in two days", currentDate).dateOverride).toBe(
      "Sunday, May 17"
    );
  });

  it("parses two days from now from Friday May 15 as Sunday May 17", () => {
    expect(parseRelativeDateToISO("two days from now", currentDate)).toBe("2026-05-17");
  });

  it("parses in three days from Friday May 15 as Monday May 18", () => {
    expect(parseRelativeDateToISO("in three days", currentDate)).toBe("2026-05-18");
  });

  it("parses tomorrow from Friday May 15 as Saturday May 16", () => {
    expect(parseRelativeDateToISO("laundry tomorrow", currentDate)).toBe("2026-05-16");
  });

  it("treats next Sunday as the upcoming Sunday when Sunday is still ahead this week", () => {
    expect(parseRelativeDateToISO("next Sunday", currentDate)).toBe("2026-05-17");
    expect(parseRelativeDateToISO("this Sunday", currentDate)).toBe("2026-05-17");
  });
});
