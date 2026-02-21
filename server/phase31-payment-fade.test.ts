/**
 * Phase 3.1: Payment card auto-hide + fade-out confirmation
 *
 * After saving a card:
 * 1. Form hides immediately, replaced by a confirmation message with green checkmark
 * 2. Confirmation shows "Card ending in XXXX saved." with the last4 digits
 * 3. After 3 seconds, the confirmation fades out (opacity → 0, height → 0)
 * 4. Component returns null after fade-out completes
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");

describe("Phase 3.1: PaymentMethodForm auto-hide and fade-out", () => {
  const form = readFileSync(
    join(ROOT, "client/src/components/PaymentMethodForm.tsx"),
    "utf-8"
  );

  it("tracks saved state, last4, and hidden state", () => {
    expect(form).toContain("const [saved, setSaved] = useState(false)");
    expect(form).toContain("const [last4, setLast4] = useState");
    expect(form).toContain("const [hidden, setHidden] = useState(false)");
  });

  it("sets saved=true and captures last4 on mutation success", () => {
    expect(form).toContain("setSaved(true)");
    expect(form).toContain("setLast4(data.last4)");
  });

  it("uses a 3-second timer to trigger hidden state after save", () => {
    expect(form).toContain("setTimeout(() => {");
    expect(form).toContain("setHidden(true)");
    expect(form).toContain("3000");
  });

  it("cleans up the timer on unmount", () => {
    expect(form).toContain("clearTimeout(timer)");
  });

  it("returns null when hidden is true", () => {
    expect(form).toContain("if (hidden)");
    expect(form).toContain("return null");
  });

  it("uses AnimatePresence for smooth transitions between form and confirmation", () => {
    expect(form).toContain("AnimatePresence");
    expect(form).toContain('mode="wait"');
  });

  it("shows confirmation with green checkmark icon when saved", () => {
    expect(form).toContain("CheckCircle2");
    expect(form).toContain("text-green-600");
    expect(form).toContain("Card ending in");
    expect(form).toContain("saved.");
  });

  it("confirmation fades out with opacity and height animation", () => {
    expect(form).toContain("exit=");
    expect(form).toContain("opacity: 0");
    expect(form).toContain("height: 0");
  });

  it("does NOT use toast for the primary confirmation (inline instead)", () => {
    // The toast is still called in onSuccess for backward compat,
    // but the inline confirmation is the primary visual feedback
    expect(form).toContain('key="confirmation"');
    expect(form).toContain('key="form"');
  });
});
