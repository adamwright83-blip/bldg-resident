import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getHeldCompositePath,
  getPenTraceSegments,
} from "../client/src/components/held/HeldArtistDrawing";
import { mergeHeldServices } from "../client/src/components/held/heldServiceCollection";

describe("HELD dry-cleaning second order", () => {
  it("ships and routes the supplied dry-cleaning clay token", () => {
    const tokenPath = join(process.cwd(), "client/public/held/token-dry-cleaning.png");
    const prototypeSource = readFileSync(
      join(process.cwd(), "client/src/components/held/PenPullPrototype.tsx"),
      "utf8",
    );
    expect(existsSync(tokenPath)).toBe(true);
    expect(prototypeSource).toContain('tokenDryCleaning: "/held/token-dry-cleaning.png"');
    expect(prototypeSource).toContain('type: "dry_cleaning"');
    expect(prototypeSource).toContain('"h-[120px] w-[120px]"');
  });

  it("uses the dedicated pen-trace drawing", () => {
    const drawing = getHeldCompositePath("Dry cleaning in two days", [
      { type: "dry_cleaning" },
    ]);
    expect(drawing.id).toBe("dry_cleaning");
    expect(getPenTraceSegments(drawing).length).toBeGreaterThan(3);
    expect(drawing.main).toContain("C329 78 331 66 341 60");
  });

  it("keeps laundry and adds dry cleaning as a distinct service", () => {
    const merged = mergeHeldServices(
      [{ type: "wash_fold", orderId: 101 }],
      [{ type: "dry-cleaning", orderId: 202 }],
    );
    expect(merged.map(service => service.type)).toEqual(["wash_fold", "dry-cleaning"]);
  });

  it("updates an existing family without duplicating its token", () => {
    const merged = mergeHeldServices(
      [{ type: "dry_cleaning", orderId: 101 }],
      [{ type: "dry-cleaning", orderId: 202 }],
    );
    expect(merged).toEqual([{ type: "dry-cleaning", orderId: 202 }]);
  });
});
