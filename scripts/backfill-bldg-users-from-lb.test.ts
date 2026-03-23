import { describe, expect, it } from "vitest";
import { parseInput } from "./backfill-bldg-users-from-lb";

describe("parseInput", () => {
  it("accepts { users: [...] }", () => {
    const rows = parseInput(JSON.stringify({ users: [{ phone: "+1" }] }));
    expect(rows).toEqual([{ phone: "+1" }]);
  });

  it("accepts a bare array", () => {
    const rows = parseInput(JSON.stringify([{ phone: "x" }]));
    expect(rows).toEqual([{ phone: "x" }]);
  });

  it("rejects invalid shape", () => {
    expect(() => parseInput(JSON.stringify({ foo: [] }))).toThrow();
  });
});
