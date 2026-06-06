import { describe, expect, it } from "vitest";
import { planResidentMultiIntents } from "./residentMultiIntentPlanner";

describe("planResidentMultiIntents", () => {
  const currentDate = "2026-05-15";

  it("extracts laundry, dog grooming, car detail, and airport transport from one messy request", () => {
    const plan = planResidentMultiIntents({
      currentDate,
      buildingSlug: "opus",
      buildingName: "Opus LA",
      unit: "12A",
      content:
        "I need a dog groomer before my mother-in-law visits in three days, and a car detail, and an Uber to pick her up from LAX to Opus LA, oh and do my laundry tomorrow.",
    });

    expect(plan.intents.map((intent) => intent.type)).toEqual([
      "dog_grooming",
      "car_detail",
      "airport_transport",
      "laundry",
    ]);
  });

  it("turns mother-in-law visits in three days into a shared deadline", () => {
    const plan = planResidentMultiIntents({
      currentDate,
      content:
        "I need a dog groomer before my mother-in-law visits in three days, and a car detail",
    });

    expect(plan.intents.find((intent) => intent.type === "dog_grooming")).toMatchObject({
      deadlineDate: "2026-05-18",
      deadlineReason: "mother-in-law visit",
    });
    expect(plan.intents.find((intent) => intent.type === "car_detail")).toMatchObject({
      deadlineDate: "2026-05-18",
      deadlineReason: "mother-in-law visit",
    });
  });

  it("gives grooming a concrete requested date and window even with a deadline", () => {
    const plan = planResidentMultiIntents({
      currentDate,
      content: "I need a dog groomer before my mother-in-law visits in three days",
    });

    const grooming = plan.intents.find((intent) => intent.type === "dog_grooming");
    // requestedDate is concrete (never null) and the default window is offered;
    // the deadline rides separately.
    expect(grooming?.requestedDate).toBeTruthy();
    expect(grooming).toMatchObject({
      requestedWindow: "10am–1pm",
      deadlineDate: "2026-05-18",
      deadlineReason: "mother-in-law visit",
    });
  });

  it("backs the demo sentence with structured before-arrival data for laundry and grooming", () => {
    // 2026-06-06 is a Saturday; "Sunday" -> 2026-06-07.
    const plan = planResidentMultiIntents({
      currentDate: "2026-06-06",
      buildingSlug: "opus",
      buildingName: "Opus LA",
      unit: "12A",
      content:
        "My wife's mother is coming over Sunday. I need my laundry done before she gets here and Theo groomed.",
    });

    expect(plan.intents.map((intent) => intent.type).sort()).toEqual(["dog_grooming", "laundry"]);

    expect(plan.intents.find((intent) => intent.type === "dog_grooming")).toMatchObject({
      requestedDate: "2026-06-06",
      requestedWindow: "10am–1pm",
      deadlineDate: "2026-06-07",
      deadlineReason: "wife's mother visit",
      dogName: "Theo",
      guestRelation: "wife's mother",
    });

    // Laundry carries the shared before-arrival deadline so "back before she
    // arrives" is backed by structured data, not just text.
    const laundry = plan.intents.find((intent) => intent.type === "laundry");
    expect(laundry).toMatchObject({
      deadlineDate: "2026-06-07",
      deadlineReason: "wife's mother visit",
    });

    // The guest-arrival date ("Sunday", 2026-06-07) lives in the first
    // sentence; the laundry request lives in the second. Sentence-boundary
    // clause splitting must keep "Sunday" out of the laundry span (which is
    // what executeLaundryIntent receives as its content) so laundry defaults to
    // the next pickup and treats Sunday only as the return-by deadline.
    expect(laundry?.originalTextSpan).toBe("I need my laundry done before she gets here");
    expect(laundry?.originalTextSpan.toLowerCase()).not.toContain("sunday");
    expect(laundry?.requestedDate ?? null).not.toBe("2026-06-07");
  });

  it("splits sentence boundaries so the laundry span excludes the guest-arrival date", () => {
    const plan = planResidentMultiIntents({
      currentDate: "2026-06-06",
      content:
        "My wife's mother is coming over Sunday. I need my laundry done before she gets here and Theo groomed.",
    });

    const laundry = plan.intents.find((intent) => intent.type === "laundry");
    // The span passed to executeLaundryIntent must not carry the arrival
    // sentence or the word "Sunday"...
    expect(laundry?.originalTextSpan).not.toMatch(/sunday/i);
    expect(laundry?.originalTextSpan).not.toMatch(/coming over/i);
    // ...while the structured before-arrival deadline still rides along.
    expect(laundry).toMatchObject({
      deadlineDate: "2026-06-07",
      deadlineReason: "wife's mother visit",
    });
    expect(laundry?.requestedDate ?? null).not.toBe("2026-06-07");
  });

  it("schedules laundry tomorrow using the shared date parser helper", () => {
    const plan = planResidentMultiIntents({
      currentDate,
      content: "do my laundry tomorrow",
    });

    expect(plan.intents[0]).toMatchObject({
      type: "laundry",
      requestedDate: "2026-05-16",
    });
  });

  it("extracts LAX to Opus LA as airport transport origin and destination", () => {
    const plan = planResidentMultiIntents({
      currentDate,
      content: "Uber to pick my mother-in-law up from LAX to Opus LA",
    });

    expect(plan.intents[0]).toMatchObject({
      type: "airport_transport",
      origin: "LAX",
      destination: "Opus LA",
    });
    expect(plan.intents[0].notes).toContain("Passenger");
  });

  it("covers required service trigger phrases", () => {
    const cases = [
      ["wash & fold", "laundry"],
      ["hamper", "laundry"],
      ["dry clean my suit", "dry_cleaning"],
      ["dress shirt", "dry_cleaning"],
      ["pet grooming", "dog_grooming"],
      ["groom my dog", "dog_grooming"],
      ["auto detail", "car_detail"],
      ["wash my car", "car_detail"],
      ["airport pickup at LAX", "airport_transport"],
      ["pick them up from LAX", "airport_transport"],
      ["housekeeper", "apartment_cleaning"],
      ["maid", "apartment_cleaning"],
    ] as const;

    for (const [content, type] of cases) {
      expect(planResidentMultiIntents({ currentDate, content }).intents[0]?.type).toBe(type);
    }
  });
});
