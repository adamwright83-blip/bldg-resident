import { describe, expect, it } from "vitest";
import {
  getHeldCompositePath,
  getPenTracePath,
  getPenTraceSegments,
} from "../client/src/components/held/HeldArtistDrawing";

describe("HELD fountain-pen trace", () => {
  it("keeps every laundry stroke separate so only the nib's active stroke reveals", () => {
    const drawing = getHeldCompositePath("Laundry pickup in two days", [{ type: "laundry" }]);
    const segments = getPenTraceSegments(drawing);

    expect(segments.length).toBeGreaterThan(6);
    expect(segments.every(segment => segment.startsWith("M"))).toBe(true);
    expect(segments.join(" ")).toBe(getPenTracePath(drawing));
  });
});
