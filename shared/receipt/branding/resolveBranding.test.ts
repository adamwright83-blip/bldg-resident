import { describe, it, expect } from "vitest";
import { resolveReceiptBranding } from "./resolveBranding";
import { RECEIPT_VENDOR_IDS } from "../types";

describe("resolveReceiptBranding", () => {
  it("returns vendor defaults merged with env when set", () => {
    const prevTitle = process.env.RECEIPT_BRANDING_TITLE;
    process.env.RECEIPT_BRANDING_TITLE = "Env Title Override";
    try {
      const b = resolveReceiptBranding({
        vendorId: RECEIPT_VENDOR_IDS.LAUNDRY_BUTLER,
        buildingSlug: null,
      });
      expect(b.title).toBe("Env Title Override");
      expect(b.businessName).toBeTruthy();
    } finally {
      if (prevTitle === undefined) delete process.env.RECEIPT_BRANDING_TITLE;
      else process.env.RECEIPT_BRANDING_TITLE = prevTitle;
    }
  });
});
