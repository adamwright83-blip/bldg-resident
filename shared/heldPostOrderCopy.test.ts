import { describe, expect, it } from "vitest";
import {
  buildPostOrderChiefOfStaffCopy,
  formatPostOrderServiceRow,
  type PostOrderPlan,
} from "./heldPostOrderCopy";

function renderAll(copy: ReturnType<typeof buildPostOrderChiefOfStaffCopy>): string {
  return [
    copy.opening,
    copy.subhead,
    ...copy.serviceRows.flatMap(row => formatPostOrderServiceRow(row).split("\n")),
    copy.closing,
  ].join("\n");
}

const SCRIPTED_LEAKS = [
  "Sunday",
  "wife's mother",
  "mother-in-law",
  "Theo",
  "Maria",
  "Jordan",
  "Saturday at 11",
];

describe("buildPostOrderChiefOfStaffCopy — truth contract", () => {
  // 1
  it("does not render 'Sunday' for a request without Sunday", () => {
    const copy = buildPostOrderChiefOfStaffCopy(
      { services: [{ type: "laundry_pickup" }] },
      "Pick up my laundry tomorrow.",
    );
    expect(renderAll(copy)).not.toMatch(/Sunday/i);
  });

  // 2
  it("does not render 'wife's mother' for a request without it", () => {
    const copy = buildPostOrderChiefOfStaffCopy(
      { services: [{ type: "laundry_pickup" }] },
      "Pick up my laundry tomorrow.",
    );
    expect(renderAll(copy)).not.toMatch(/wife'?s mother/i);
  });

  // 3
  it("does not render 'mother-in-law' for a request without it", () => {
    const copy = buildPostOrderChiefOfStaffCopy(
      { services: [{ type: "laundry_pickup" }] },
      "Pick up my laundry tomorrow.",
    );
    expect(renderAll(copy)).not.toMatch(/mother[\s-]in[\s-]law/i);
  });

  // 4
  it("does not render 'Theo' for a grooming request without a dog name", () => {
    const copy = buildPostOrderChiefOfStaffCopy(
      { services: [{ type: "dog_grooming" }] },
      "Book dog grooming this week.",
    );
    expect(renderAll(copy)).not.toMatch(/Theo/);
  });

  // 5
  it("does not render 'Maria' or 'Jordan' when no provider candidates exist", () => {
    const copy = buildPostOrderChiefOfStaffCopy(
      { services: [{ type: "dog_grooming" }, { type: "laundry_pickup" }] },
      "Laundry and dog grooming please.",
    );
    const rendered = renderAll(copy);
    expect(rendered).not.toMatch(/Maria/);
    expect(rendered).not.toMatch(/Jordan/);
  });

  // 6
  it("produces safe generic laundry copy for a laundry-only request", () => {
    const copy = buildPostOrderChiefOfStaffCopy(
      { services: [{ type: "laundry_pickup" }] },
      "Pick up my laundry.",
    );
    expect(copy.opening).toBe("I’ve taken in the request — I’m moving on it.");
    expect(copy.serviceRows).toHaveLength(1);
    expect(copy.serviceRows[0].label).toBe("LAUNDRY");
    expect(formatPostOrderServiceRow(copy.serviceRows[0])).toContain("Status: In motion");
    expect(formatPostOrderServiceRow(copy.serviceRows[0])).toContain("Pending: Pickup scheduling");
    expect(copy.closing).toBe("Nothing else needed right now.");
  });

  it("uses real laundry timing when metadata provides it", () => {
    const copy = buildPostOrderChiefOfStaffCopy(
      { services: [{ type: "laundry_pickup", timing: "tomorrow morning" }] },
      "Pick up my laundry tomorrow morning.",
    );
    expect(formatPostOrderServiceRow(copy.serviceRows[0])).toContain("Pickup: Tomorrow morning");
  });

  // 7
  it("produces service-specific rows for laundry + grooming without inventing vendors", () => {
    const copy = buildPostOrderChiefOfStaffCopy(
      { services: [{ type: "laundry_pickup" }, { type: "dog_grooming" }] },
      "Laundry and dog grooming.",
    );
    expect(copy.serviceRows).toHaveLength(2);
    expect(copy.serviceRows[0].label).toBe("LAUNDRY");
    expect(copy.serviceRows[1].label).toBe("GROOMING");
    expect(formatPostOrderServiceRow(copy.serviceRows[1])).toContain(
      "Status: Awaiting outside confirmation",
    );
    expect(formatPostOrderServiceRow(copy.serviceRows[1])).toContain(
      "Pending: Groomer availability",
    );
    expect(renderAll(copy)).not.toMatch(/come back only if there’s a real decision/i);
    const rendered = renderAll(copy);
    for (const leak of SCRIPTED_LEAKS) {
      expect(rendered).not.toContain(leak);
    }
  });

  // 8
  it("uses the actual parsed guest relation only", () => {
    const copy = buildPostOrderChiefOfStaffCopy(
      {
        services: [{ type: "laundry_pickup", guestRelation: "my brother" }],
      },
      "Laundry before my brother arrives.",
    );
    const rendered = renderAll(copy);
    expect(rendered).not.toMatch(/mother[\s-]in[\s-]law/i);
    expect(rendered).not.toMatch(/wife'?s mother/i);
  });

  // 9
  it("never says booked/confirmed for non-laundry services without real confirmation", () => {
    const copy = buildPostOrderChiefOfStaffCopy(
      {
        services: [
          { type: "dog_grooming" },
          { type: "car_detail" },
          { type: "ride_airport" },
          { type: "haircut" },
        ],
      },
      "Grooming, car detail, airport ride, and a haircut.",
    );
    const rendered = copy.serviceRows.map(row => formatPostOrderServiceRow(row)).join("\n");
    expect(rendered).not.toMatch(/\bStatus: Booked\b/i);
    expect(rendered).not.toMatch(/\bStatus: Confirmed\b/i);
  });

  it("allows booked/confirmed for non-laundry only with a real provider confirmation", () => {
    const copy = buildPostOrderChiefOfStaffCopy({
      services: [{ type: "dog_grooming", status: "confirmed", orderId: 9001 }],
    });
    expect(formatPostOrderServiceRow(copy.serviceRows[0])).toContain("Status: Confirmed");
  });

  it("allows laundry booked copy only when a real order exists", () => {
    const unconfirmed = buildPostOrderChiefOfStaffCopy({
      services: [{ type: "laundry_pickup" }],
    });
    expect(formatPostOrderServiceRow(unconfirmed.serviceRows[0])).not.toMatch(/LAUNDRY BUTLER/i);

    const confirmed = buildPostOrderChiefOfStaffCopy({
      services: [{ type: "laundry_pickup", orderId: 12345 }],
    });
    const rowText = formatPostOrderServiceRow(confirmed.serviceRows[0]);
    expect(rowText).toContain("Status: Booked");
    expect(rowText).toContain("LAUNDRY BUTLER");
    expect(rowText).toContain("7–9am");
    expect(rowText).toContain("7–9pm");
  });

  it("renders provider names and window ONLY from real candidate metadata", () => {
    const copy = buildPostOrderChiefOfStaffCopy({
      displayRequest: "Groom Theo this weekend.",
      services: [
        {
          type: "dog_grooming",
          dogName: "Theo",
          providerCandidates: [
            { name: "Maria", window: "Saturday at 11" },
            { name: "Jordan" },
          ],
        },
      ],
    });
    const row = copy.serviceRows[0];
    expect(row.label).toBe("THEO’S GROOMING");
    const rowText = formatPostOrderServiceRow(row);
    expect(rowText).toContain("Maria");
    expect(rowText).toContain("Saturday at 11");
    expect(rowText).not.toContain("Jordan");
    expect(copy.closing).not.toContain("Jordan");
    expect(copy.closing).not.toMatch(/consider it handled|non-negotiable/i);
  });

  it("renders THEO label only when dogName metadata exists", () => {
    const withName = buildPostOrderChiefOfStaffCopy({
      services: [{ type: "dog_grooming", dogName: "Theo" }],
    });
    expect(withName.serviceRows[0].label).toBe("THEO’S GROOMING");
    expect(formatPostOrderServiceRow(withName.serviceRows[0])).toContain("Groomer availability");

    const withoutName = buildPostOrderChiefOfStaffCopy({
      services: [{ type: "dog_grooming" }],
    });
    expect(withoutName.serviceRows[0].label).toBe("GROOMING");
    expect(formatPostOrderServiceRow(withoutName.serviceRows[0])).not.toContain("Theo");
  });

  it("extracts a dog name from possessive request text", () => {
    const copy = buildPostOrderChiefOfStaffCopy(
      { services: [{ type: "dog_grooming" }] },
      "Book Rex's grooming.",
    );
    expect(copy.serviceRows[0].label).toBe("REX’S GROOMING");
  });

  it("renders operational detail rows for booked internal car detail", () => {
    const copy = buildPostOrderChiefOfStaffCopy({
      services: [{ type: "car_detail", status: "booked_internal", orderId: "manual-car-detail-1" }],
    });
    const rowText = formatPostOrderServiceRow(copy.serviceRows[0]);
    expect(rowText).toContain("Status: Booked internally");
    expect(rowText).toContain("Window:");
    expect(rowText).not.toMatch(/come back only/i);
  });
});
