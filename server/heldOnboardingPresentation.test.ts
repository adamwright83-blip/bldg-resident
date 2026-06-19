import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "client/src/components/held/PenPullPrototype.tsx"),
  "utf8",
);

describe("HELD onboarding presentation", () => {
  it("uses the HELD logo and suppresses the home headline during profile collection", () => {
    expect(source).not.toContain("HELD.chat");
    expect(source).toContain('logoMark: "/held/held-logo-mark.png"');
    expect(source).toContain('mode !== "collectName" && mode !== "collectPayment"');
  });

  it("does not add a second recovery-card action beneath the name form", () => {
    expect(source).toContain("(onEdit || onRetry) &&");
    expect(source).toContain("{onRetry && <button");
  });
});
