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

  it("VendorProposalCard stays passive -- no CTA button, no mutation hook, only the helper copy", () => {
    const cardSource = read("VendorProposalCard.tsx");
    expect(cardSource).not.toMatch(/PROPOSAL_COPY\.ctaPrimary/);
    expect(cardSource).not.toMatch(/<button[^>]*vpc-cta[^>]*>/);
    expect(cardSource).not.toMatch(/useMutation/);
    expect(cardSource).toMatch(/PROPOSAL_COPY\.helperPending/);
  });

  it("VendorProposalSection stays passive -- no CTA button, no mutation hook", () => {
    const sectionSource = read("VendorProposalSection.tsx");
    expect(sectionSource).not.toMatch(/PROPOSAL_COPY\.ctaPrimary/);
    expect(sectionSource).not.toMatch(/<button[^>]*vpc-cta[^>]*>/);
    expect(sectionSource).not.toMatch(/useMutation/);
  });

  it("VendorProposalSheet renders exactly one CTA button, using the exact approved button text", () => {
    const sheetSource = read("VendorProposalSheet.tsx");
    const buttonMatches = sheetSource.match(/<button[^>]*vpc-cta[^>]*>/g) ?? [];
    expect(buttonMatches).toHaveLength(1);
    expect(sheetSource).toMatch(/PROPOSAL_COPY\.ctaPrimary/);
    expect(sheetSource).toMatch(/PROPOSAL_COPY\.ctaReassurance/);
    expect(sheetSource).not.toMatch(/"Approve HELD to try to book"/);
  });

  it("the Sheet's mutation hook is only invoked inside an onClick handler, never as a top-level render effect", () => {
    const sheetSource = read("VendorProposalSheet.tsx");
    const useMutationCalls = sheetSource.match(/useMutation\(/g) ?? [];
    expect(useMutationCalls).toHaveLength(1);
    // .mutate( must appear, and the only call site must be inside the button's onClick prop.
    expect(sheetSource).toMatch(/onClick=\{\(\)\s*=>\s*approveMutation\.mutate\(/);
    expect(sheetSource).not.toMatch(/useEffect\([^)]*approveMutation\.mutate/);
  });

  it("renders the same success copy for both a fresh consent and an idempotent replay", () => {
    const sheetSource = read("VendorProposalSheet.tsx");
    const successNoticeMatches = sheetSource.match(/PROPOSAL_COPY\.consentRecordedNotice/g) ?? [];
    // A single render branch (hasApprovedThisProposal) covers both consent_recorded and
    // consent_already_recorded -- there is exactly one reference to the success copy, not two
    // separate branches with potentially different wording.
    expect(successNoticeMatches).toHaveLength(1);
  });

  it("renders safe, non-leaking copy for not-allowed and network-failure states", () => {
    const sheetSource = read("VendorProposalSheet.tsx");
    expect(sheetSource).toMatch(/PROPOSAL_COPY\.consentUnavailableNotice/);
    expect(sheetSource).toMatch(/PROPOSAL_COPY\.consentFailedNotice/);
  });

  it("never fires a write HTTP method directly from any proposal client component", () => {
    for (const file of files) {
      const source = read(file);
      expect(source).not.toMatch(/method:\s*["']POST["']/i);
      expect(source).not.toMatch(/\bfetch\(/);
    }
  });

  it("the proposal copy file contains the exact approved strings and no forbidden-claim copy", () => {
    const copySource = read("../../lib/proposalCopy.ts");
    expect(copySource).toMatch(/ctaPrimary:\s*"Let HELD try to book this"/);
    expect(copySource).toMatch(/ctaReassurance:\s*"Nothing is confirmed until the provider accepts\."/);
    expect(copySource).toMatch(/helperPending:\s*"HELD will ask before trying to book\."/);
    expect(copySource).toMatch(/consentRecordedNotice:\s*"HELD will try to book this\."/);
    expect(copySource).toMatch(/consentUnavailableNotice:\s*"This option is no longer available\."/);
    expect(copySource).toMatch(/consentFailedNotice:\s*"We couldn't send that/);
    expect(copySource).not.toMatch(/"Approve HELD to try to book"/);
    const offending = linesWithForbiddenWords(copySource);
    expect(offending).toEqual([]);
  });

  it("introduces no Stripe or LLM call identifiers", () => {
    for (const file of [...files, "../../lib/proposalCopy.ts"]) {
      const source = read(file);
      expect(source).not.toMatch(/\bstripe\b/i);
      expect(source).not.toMatch(/openai|anthropic|chatgpt/i);
    }
  });
});
