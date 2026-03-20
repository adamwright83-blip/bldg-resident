import type { BldgReceiptBranding } from "../types";

/**
 * Fills missing branding fields from process.env (server only).
 * Last resort after vendor + building tables; keeps deploys working without DB.
 */
export function receiptBrandingEnvFallback(): Partial<BldgReceiptBranding> {
  return {
    title: process.env.RECEIPT_BRANDING_TITLE?.trim(),
    serviceSubtitle: process.env.RECEIPT_SERVICE_SUBTITLE?.trim(),
    businessName: process.env.RECEIPT_BUSINESS_NAME?.trim(),
    addressLine1: process.env.RECEIPT_ADDRESS_LINE1?.trim(),
    addressLine2: process.env.RECEIPT_ADDRESS_LINE2?.trim(),
    phoneDisplay: process.env.RECEIPT_PHONE?.trim(),
  };
}
