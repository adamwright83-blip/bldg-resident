import { describe, expect, it } from "vitest";
import { getHeldCompositePath } from "../client/src/components/held/HeldArtistDrawing";

describe("getHeldCompositePath", () => {
  it("uses the shirt and dog weave when laundry and dog are requested without car", () => {
    const drawing = getHeldCompositePath("Pickup laundry and book Theo's grooming.", [
      { type: "laundry_pickup" },
      { type: "dog_grooming" },
    ]);

    expect(drawing.id).toBe("woven_shirt_dog");
  });

  it("preserves the shirt, dog, and car weave for true three-service requests", () => {
    const drawing = getHeldCompositePath(
      "Pickup laundry, book dog grooming, and detail the car.",
      [{ type: "laundry_pickup" }, { type: "dog_grooming" }, { type: "car_detail" }]
    );

    expect(drawing.id).toBe("woven_shirt_dog_car");
  });
});
