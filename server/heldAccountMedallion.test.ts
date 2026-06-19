import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "client/src/components/held/PenPullPrototype.tsx"),
  "utf8",
);

describe("HELD account medallion", () => {
  it("does not render the obsolete top-right crest beneath the initials", () => {
    expect(source).not.toContain('aria-label="Return to held services"');
    expect(source.match(/src=\{HELD_ASSETS\.crest\}/g)).toHaveLength(1);
  });
});
