import { describe, expect, it } from "vitest";
import { addDaysYmd, withDefaultReturnBy } from "./intakeReturnBy";

describe("intakeReturnBy", () => {
  it("adds days to a YMD string", () => {
    expect(addDaysYmd("2026-06-01", 2)).toBe("2026-06-03");
    expect(addDaysYmd("2026-06-30", 2)).toBe("2026-07-02"); // month rollover
    expect(addDaysYmd("2026-12-31", 1)).toBe("2027-01-01"); // year rollover
  });

  it("defaults return-by to pickup + 2 when none is provided", () => {
    const out = withDefaultReturnBy({
      pickupDate: "2026-06-01",
      pickupWindow: "7:00am–9:00am",
    });
    expect(out).toMatchObject({
      returnBy: "2026-06-03",
      deliveryDate: "2026-06-03",
    });
  });

  it("preserves an explicit deadline / returnBy / deliveryDate", () => {
    expect(
      withDefaultReturnBy({ pickupDate: "2026-06-01", returnBy: "2026-06-10" })
    ).toMatchObject({ returnBy: "2026-06-10" });
    expect(
      (withDefaultReturnBy({
        pickupDate: "2026-06-01",
        deadlineDate: "2026-06-09",
      }) as Record<string, unknown>).returnBy
    ).toBeUndefined();
    expect(
      withDefaultReturnBy({ pickupDate: "2026-06-01", deliveryDate: "2026-06-08" })
    ).toMatchObject({ deliveryDate: "2026-06-08" });
  });

  it("leaves payload untouched when pickupDate is missing/invalid", () => {
    expect(withDefaultReturnBy({ pickupWindow: "x" })).toEqual({
      pickupWindow: "x",
    });
    expect(
      (withDefaultReturnBy({ pickupDate: "June 1" }) as Record<string, unknown>)
        .returnBy
    ).toBeUndefined();
  });
});
