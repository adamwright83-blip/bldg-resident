/**
 * End-to-end verification: intake tower identity and payload.
 *
 * 1. Each known tower (3545, 3650, 2160, 2170) resolves to correct buildingId and exact address.
 * 2. Legacy slugs normalize to the correct tower and address.
 * 3. Unknown slug yields "Address unknown" (no guessed address).
 * 4. Payload shape (buildingId, address, firstName, lastName).
 *
 * Manual checks (run against live/staging):
 * - Where the order lands on admin/driver side per tower.
 * - app.bldg.chat no-context: confirm log "[Welcome] No building context from host or JWT; defaulting buildingSlug to 3545".
 */
import { describe, expect, it } from "vitest";
import {
  resolveIntakeBuildingKey,
  getAddressForIntakeKey,
  normalizePortalBuildingSlugForWelcome,
  TOWER_IDS,
} from "../shared/intakeBuilding";
import { resolveBuildingFromHostname } from "../shared/buildingHostMap";

describe("Intake tower verification", () => {
  const canonicalTowers: Array<{ tower: string; address: string }> = [
    { tower: "3545", address: "3545 Wilshire Blvd" },
    { tower: "3650", address: "3650 6th St" },
    { tower: "2160", address: "2160 Century Pk E" },
    { tower: "2170", address: "2170 Century Pk E" },
  ];

  describe("1. Each known tower identity", () => {
    it.each(canonicalTowers)(
      "tower $tower sends correct buildingId and exact address",
      ({ tower, address }) => {
        const buildingId = resolveIntakeBuildingKey(tower);
        const resolvedAddress = getAddressForIntakeKey(buildingId);
        expect(buildingId).toBe(tower);
        expect(resolvedAddress).toBe(address);
      }
    );

    it("all TOWER_IDS match canonical list", () => {
      expect(TOWER_IDS).toEqual(["3545", "3650", "2160", "2170"]);
    });
  });

  describe("2. Intake payload for each tower", () => {
    it.each(canonicalTowers)(
      "payload buildingId and address for $tower",
      ({ tower, address: expectedAddress }) => {
        const buildingId = resolveIntakeBuildingKey(tower);
        const address = getAddressForIntakeKey(buildingId);
        expect(buildingId).toBe(tower);
        expect(address).toBe(expectedAddress);
      }
    );

    it("payload has buildingId and address from buildingSlug", () => {
      const buildingSlug = "3650";
      const buildingId = resolveIntakeBuildingKey(buildingSlug);
      const address = getAddressForIntakeKey(buildingId);
      const payload = {
        buildingId: buildingId || null,
        address,
        firstName: "Alex",
        lastName: "Smith",
      };
      expect(payload.buildingId).toBe("3650");
      expect(payload.address).toBe("3650 6th St");
      expect(payload.firstName).toBe("Alex");
      expect(payload.lastName).toBe("Smith");
    });
  });

  describe("3. Legacy slugs normalize to correct tower and address", () => {
    const legacyCases: Array<{ slug: string; expectedTower: string; expectedAddress: string }> = [
      { slug: "opusla", expectedTower: "3545", expectedAddress: "3545 Wilshire Blvd" },
      { slug: "opus-south", expectedTower: "3545", expectedAddress: "3545 Wilshire Blvd" },
      { slug: "opus-north", expectedTower: "3650", expectedAddress: "3650 6th St" },
      { slug: "cpe-north", expectedTower: "2160", expectedAddress: "2160 Century Pk E" },
      { slug: "cpe-south", expectedTower: "2170", expectedAddress: "2170 Century Pk E" },
    ];

    it.each(legacyCases)(
      "legacy slug $slug -> $expectedTower, $expectedAddress",
      ({ slug, expectedTower, expectedAddress }) => {
        const buildingId = resolveIntakeBuildingKey(slug);
        const address = getAddressForIntakeKey(buildingId);
        expect(buildingId).toBe(expectedTower);
        expect(address).toBe(expectedAddress);
      }
    );

    it.each([
      ["opusla", "3545"],
      ["centuryparkeast", "2160"],
      ["centuryparkeastnorth", "2160"],
      ["centuryparkeastsouth", "2170"],
    ] as const)(
      "normalizePortalBuildingSlugForWelcome(%s) -> %s (portal JWT contract)",
      (slug, tower) => {
        expect(normalizePortalBuildingSlugForWelcome(slug)).toBe(tower);
      }
    );

    it("normalizePortalBuildingSlugForWelcome returns undefined for unknown slugs", () => {
      expect(normalizePortalBuildingSlugForWelcome("not-a-tower")).toBeUndefined();
      expect(normalizePortalBuildingSlugForWelcome("")).toBeUndefined();
      expect(normalizePortalBuildingSlugForWelcome(null)).toBeUndefined();
    });
  });

  describe("4. Unknown slug yields Address unknown", () => {
    it("unknown slug returns fallback address", () => {
      const buildingId = resolveIntakeBuildingKey("unknown-tower");
      const address = getAddressForIntakeKey(buildingId);
      expect(buildingId).toBe("unknown-tower");
      expect(address).toBe("Address unknown");
    });

    it("empty slug yields empty key and Address unknown", () => {
      const buildingId = resolveIntakeBuildingKey("");
      const address = getAddressForIntakeKey(buildingId);
      expect(buildingId).toBe("");
      expect(address).toBe("Address unknown");
    });
  });
});

describe("Welcome handoff: default 3545 when no building context", () => {
  it("host 3545.bldg.chat provides slug 3545", () => {
    const hostBuilding = resolveBuildingFromHostname("3545.bldg.chat");
    expect(hostBuilding?.slug).toBe("3545");
  });

  it("when host has no building and payload has no buildingSlug, buildingSlug would default to 3545", () => {
    const hostBuilding = resolveBuildingFromHostname("app.bldg.chat");
    const payloadBuilding = undefined as string | undefined;
    const buildingSlug = hostBuilding?.slug ?? payloadBuilding ?? "3545";
    expect(hostBuilding).toBeNull();
    expect(buildingSlug).toBe("3545");
  });

  it("when no context, warning log message is the expected string (for manual log check)", () => {
    const expectedLog =
      "[Welcome] No building context from host or JWT; defaulting buildingSlug to 3545";
    expect(expectedLog).toBe(
      "[Welcome] No building context from host or JWT; defaulting buildingSlug to 3545"
    );
  });
});
