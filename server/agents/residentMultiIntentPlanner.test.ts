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
