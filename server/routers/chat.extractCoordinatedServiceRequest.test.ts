import { describe, expect, it } from "vitest";
import { extractCoordinatedServiceRequest, parseExplicitRequestedDate } from "./chat";

describe("extractCoordinatedServiceRequest — dog grooming requested date", () => {
  it("preserves a weekday-prefixed explicit requested date in notes and structures scheduledDate", () => {
    const result = extractCoordinatedServiceRequest(
      "Requested date: Tuesday June 23, 2026. Requested window: 11:00 AM to 1:00 PM. Dog name: Butterscotch. Breed/size: Boxer / medium / 78 lbs. Temperament: friendly. Handling notes: no special handling needs. Budget: up to $125 before tip. Service location: mobile grooming at building/unit preferred."
    );

    expect(result).not.toBeNull();
    expect(result!.notes).toContain("Requested date: Tuesday June 23, 2026");
    expect(result!.explicitRequestedDate).toBe("2026-06-23");
  });

  it("preserves and structures a slash-format explicit requested date", () => {
    const result = extractCoordinatedServiceRequest(
      "Requested date: 06/23/2026. Requested window: 11:00 AM to 1:00 PM. Dog name: Butterscotch. Breed/size: Boxer / medium / 78 lbs. Temperament: friendly. Handling notes: no special handling needs. Budget: up to $125 before tip. Service location: mobile grooming at building/unit preferred."
    );

    expect(result).not.toBeNull();
    expect(result!.notes).toContain("Requested date: 06/23/2026");
    expect(result!.explicitRequestedDate).toBe("2026-06-23");
  });

  it("does not invent a date when none is explicitly provided", () => {
    const result = extractCoordinatedServiceRequest(
      "Requested window: 11:00 AM to 1:00 PM. Dog name: Butterscotch. Breed/size: Boxer / medium / 78 lbs. Temperament: friendly. Handling notes: no special handling needs. Budget: up to $125 before tip. Service location: mobile grooming at building/unit preferred."
    );

    expect(result).not.toBeNull();
    expect(result!.explicitRequestedDate).toBeNull();
  });

  it("does not infer a date from a vague timing phrase", () => {
    const result = extractCoordinatedServiceRequest(
      "Dog grooming this week. Dog name: Butterscotch. Breed/size: Boxer / medium / 78 lbs."
    );

    expect(result).not.toBeNull();
    expect(result!.explicitRequestedDate).toBeNull();
    expect(result!.timing).toBe("This week");
  });

  it("preserves all other labeled dog-grooming facts in notes", () => {
    const result = extractCoordinatedServiceRequest(
      "Requested date: Tuesday June 23, 2026. Requested window: 11:00 AM to 1:00 PM. Dog name: Butterscotch. Breed/size: Boxer / medium / 78 lbs. Temperament: friendly. Handling notes: no special handling needs. Budget: up to $125 before tip. Service location: mobile grooming at building/unit preferred."
    );

    expect(result).not.toBeNull();
    const notes = result!.notes;
    expect(notes).toContain("Requested window: 11:00 AM to 1:00 PM");
    expect(notes).toContain("Dog name: Butterscotch");
    expect(notes).toContain("Breed/size: Boxer / medium / 78 lbs");
    expect(notes).toContain("Temperament: friendly");
    expect(notes).toContain("Handling notes: no special handling needs");
    expect(notes).toContain("Budget: up to $125 before tip");
    expect(notes).toContain("Service location: mobile grooming at building/unit preferred");
  });

  it("still drops a bare unlabeled service-trigger leading sentence", () => {
    const result = extractCoordinatedServiceRequest(
      "Dog grooming please. Dog name: Butterscotch."
    );

    expect(result).not.toBeNull();
    expect(result!.notes).toBe("Dog name: Butterscotch");
  });
});

describe("parseExplicitRequestedDate", () => {
  it("parses ISO format", () => {
    expect(parseExplicitRequestedDate("2026-06-23")).toBe("2026-06-23");
  });

  it("parses MM/DD/YYYY format", () => {
    expect(parseExplicitRequestedDate("06/23/2026")).toBe("2026-06-23");
  });

  it("parses 'Month Day, Year' format", () => {
    expect(parseExplicitRequestedDate("June 23, 2026")).toBe("2026-06-23");
  });

  it("parses 'Weekday Month Day, Year' format", () => {
    expect(parseExplicitRequestedDate("Tuesday June 23, 2026")).toBe("2026-06-23");
  });

  it("returns null for a vague phrase", () => {
    expect(parseExplicitRequestedDate("soon")).toBeNull();
    expect(parseExplicitRequestedDate("this week")).toBeNull();
    expect(parseExplicitRequestedDate("Tuesday")).toBeNull();
    expect(parseExplicitRequestedDate("tomorrow")).toBeNull();
  });
});
