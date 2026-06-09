import { describe, expect, it } from "vitest";
import {
  buildPostOrderChiefOfStaffCopy,
  type PostOrderPlan,
} from "./heldPostOrderCopy";

function renderAll(copy: ReturnType<typeof buildPostOrderChiefOfStaffCopy>): string {
  return [
    copy.opening,
    copy.subhead,
    ...copy.serviceRows.flatMap(row => [row.label, row.body]),
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
    expect(copy.serviceRows[0].body).toBe(
      "I’m getting pickup moving and keeping the return protected.",
    );
    expect(copy.closing).toBe("Nothing else needed right now.");
  });

  it("uses real laundry timing when metadata provides it", () => {
    const copy = buildPostOrderChiefOfStaffCopy(
      { services: [{ type: "laundry_pickup", timing: "tomorrow morning" }] },
      "Pick up my laundry tomorrow morning.",
    );
    expect(copy.serviceRows[0].body).toBe(
      "I’m picking it up tomorrow morning and keeping the return protected.",
    );
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
    expect(copy.serviceRows[1].body).toBe(
      "I’m lining up grooming and will come back only if there’s a real decision.",
    );
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
    const bodies = copy.serviceRows.map(r => r.body).join("\n");
    expect(bodies).not.toMatch(/\b(booked|confirmed)\b/i);
  });

  it("allows booked/confirmed for non-laundry only with a real provider confirmation", () => {
    const copy = buildPostOrderChiefOfStaffCopy({
      services: [{ type: "dog_grooming", status: "confirmed", orderId: 9001 }],
    });
    expect(copy.serviceRows[0].body).toMatch(/confirmed/i);
  });

  it("allows laundry confirmed only when a real order exists", () => {
    const unconfirmed = buildPostOrderChiefOfStaffCopy({
      services: [{ type: "laundry_pickup" }],
    });
    expect(unconfirmed.serviceRows[0].body).not.toMatch(/confirmed/i);

    const confirmed = buildPostOrderChiefOfStaffCopy({
      services: [{ type: "laundry_pickup", orderId: 12345 }],
    });
    expect(confirmed.serviceRows[0].body).toMatch(/confirmed/i);
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
    expect(row.body).toContain("Maria");
    expect(row.body).toContain("Saturday at 11");
    expect(row.body).toContain("Jordan");
    expect(copy.closing).not.toContain("Jordan");
    expect(copy.closing).not.toMatch(/consider it handled|non-negotiable/i);
  });

  it("renders THEO label only when dogName metadata exists", () => {
    const withName = buildPostOrderChiefOfStaffCopy({
      services: [{ type: "dog_grooming", dogName: "Theo" }],
    });
    expect(withName.serviceRows[0].label).toBe("THEO’S GROOMING");
    expect(withName.serviceRows[0].body).toContain("Theo");

    const withoutName = buildPostOrderChiefOfStaffCopy({
      services: [{ type: "dog_grooming" }],
    });
    expect(withoutName.serviceRows[0].label).toBe("GROOMING");
    expect(withoutName.serviceRows[0].body).not.toContain("Theo");
  });

  it("extracts a dog name from possessive request text", () => {
    const copy = buildPostOrderChiefOfStaffCopy(
      { services: [{ type: "dog_grooming" }] },
      "Book Rex's grooming.",
    );
    expect(copy.serviceRows[0].label).toBe("REX’S GROOMING");
  });
});
