import { describe, expect, it } from "vitest";
import { mergeWelcomeHandoffIdentity } from "./lib/welcomeHandoffMerge";

describe("mergeWelcomeHandoffIdentity", () => {
  it("uses JWT values when present", () => {
    expect(
      mergeWelcomeHandoffIdentity(null, {
        firstName: "Alex",
        lastName: "Rivera",
        buildingCandidate: "opusla",
        buildingFallback: "3545",
      })
    ).toEqual({
      firstName: "Alex",
      lastName: "Rivera",
      email: null,
      unit: null,
      buildingSlug: "opusla",
    });
  });

  it("keeps existing when JWT omits or sends empty", () => {
    expect(
      mergeWelcomeHandoffIdentity(
        {
          firstName: "Pat",
          lastName: "Kim",
          buildingSlug: "cpe-north",
        },
        {
          firstName: "",
          lastName: undefined,
          buildingCandidate: undefined,
          buildingFallback: "3545",
        }
      )
    ).toEqual({
      firstName: "Pat",
      lastName: "Kim",
      email: null,
      unit: null,
      buildingSlug: "cpe-north",
    });
  });

  it("fills gaps from JWT without clobbering stored building with fallback", () => {
    expect(
      mergeWelcomeHandoffIdentity(
        { firstName: null, lastName: null, buildingSlug: "opusla" },
        {
          firstName: "Sam",
          lastName: "Lee",
          buildingCandidate: undefined,
          buildingFallback: "3545",
        }
      )
    ).toEqual({
      firstName: "Sam",
      lastName: "Lee",
      email: null,
      unit: null,
      buildingSlug: "opusla",
    });
  });

  it("uses fallback building for brand-new identity", () => {
    expect(
      mergeWelcomeHandoffIdentity(null, {
        firstName: "Jo",
        lastName: "Doe",
        buildingCandidate: undefined,
        buildingFallback: "3545",
      })
    ).toEqual({
      firstName: "Jo",
      lastName: "Doe",
      email: null,
      unit: null,
      buildingSlug: "3545",
    });
  });
});
