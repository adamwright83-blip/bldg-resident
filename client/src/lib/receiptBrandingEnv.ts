import type { BldgReceiptViewModel } from "@shared/receiptViewModel";

/**
 * Client-side receipt branding defaults (Vite env).
 * Override per deployment / building; do not hard-code vendor titles in ReceiptPaper.
 */
export function laundryButlerReceiptBrandingFromEnv(): BldgReceiptViewModel["branding"] {
  return {
    title: import.meta.env.VITE_RECEIPT_BRANDING_TITLE?.trim() || "Laundry Butler",
    serviceSubtitle: import.meta.env.VITE_RECEIPT_SERVICE_SUBTITLE?.trim() || "",
    businessName: import.meta.env.VITE_RECEIPT_BUSINESS_NAME?.trim() || "Laundry Butler",
    addressLine1:
      import.meta.env.VITE_RECEIPT_ADDRESS_LINE1?.trim() || "Los Angeles, CA",
    addressLine2:
      import.meta.env.VITE_RECEIPT_ADDRESS_LINE2?.trim() || "United States",
    phoneDisplay: import.meta.env.VITE_RECEIPT_PHONE?.trim() || "(323) 807-4661",
  };
}
