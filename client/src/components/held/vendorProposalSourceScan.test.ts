import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const heldDir = path.dirname(new URL(import.meta.url).pathname);

function read(file: string): string {
  return fs.readFileSync(path.join(heldDir, file), "utf8");
}

// Forbidden outside the approved truth-copy exceptions ("Available, not booked",
// "Nothing is confirmed until the provider accepts.", "Nothing is confirmed until
// provider acceptance is verified", which all use these words in a negated/safe sense).
const FORBIDDEN_WORDS = ["booked", "confirmed", "accepted", "paid", "dispatched", "completed"];
const APPROVED_EXCEPTION_LINES = [
  /not booked/i,
  /nothing is confirmed/i,
];

function linesWithForbiddenWords(source: string): string[] {
  return source
    .split("\n")
    .filter(line => FORBIDDEN_WORDS.some(word => new RegExp(`\\b${word}\\b`, "i").test(line)))
    .filter(line => !APPROVED_EXCEPTION_LINES.some(pattern => pattern.test(line)));
}

describe("vendor proposal client component source scan", () => {
  const files = ["VendorProposalCard.tsx", "VendorProposalSheet.tsx", "VendorProposalSection.tsx"];

  it("contains no forbidden words outside the approved truth-copy exceptions", () => {
    for (const file of files) {
      const offending = linesWithForbiddenWords(read(file));
      expect(offending).toEqual([]);
    }
  });

  it("never references admin-only/internal fields (evidence ids, hashes, raw audit metadata)", () => {
    const forbiddenFields = [
      "evidence_snapshot_id", "job_card_hash", "evidence_ids", "audit", "admin_explanation",
      "eligibility_details", "raw_payload",
    ];
    for (const file of files) {
      const source = read(file);
      for (const field of forbiddenFields) {
        expect(source).not.toMatch(new RegExp(field, "i"));
      }
    }
  });

  it("does not render a CTA button -- the approval mutation does not exist in this slice", () => {
    for (const file of files) {
      const source = read(file);
      expect(source).not.toMatch(/PROPOSAL_COPY\.ctaPrimary/);
      expect(source).not.toMatch(/<button[^>]*vpc-cta[^>]*>/);
      expect(source).not.toMatch(/"Approve HELD to try to book"/);
      expect(source).not.toMatch(/"Let HELD try to book this"/);
    }
  });

  it("shows the quiet pending-helper copy instead of a CTA when the proposal would have been CTA-eligible", () => {
    const cardSource = read("VendorProposalCard.tsx");
    const sheetSource = read("VendorProposalSheet.tsx");
    expect(cardSource).toMatch(/PROPOSAL_COPY\.helperPending/);
    expect(sheetSource).toMatch(/PROPOSAL_COPY\.helperPending/);
  });

  it("never fires a mutation or POST from any proposal component", () => {
    for (const file of files) {
      const source = read(file);
      expect(source).not.toMatch(/\.mutation\(/);
      expect(source).not.toMatch(/method:\s*["']POST["']/i);
      expect(source).not.toMatch(/fetch\(/);
    }
  });

  it("the proposal copy file reserves the exact approved CTA button text for the future approval slice", () => {
    const copySource = read("../../lib/proposalCopy.ts");
    expect(copySource).toMatch(/ctaPrimary:\s*"Let HELD try to book this"/);
    expect(copySource).toMatch(/ctaReassurance:\s*"Nothing is confirmed until the provider accepts\."/);
    expect(copySource).toMatch(/helperPending:\s*"HELD will ask before trying to book\."/);
    expect(copySource).not.toMatch(/"Approve HELD to try to book"/);
  });
});
