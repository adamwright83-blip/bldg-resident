/**
 * Receipt routing identity — used by expansion + branding resolution.
 * Not shown on ReceiptPaper; drives which vendor backend and branding profile apply.
 */

/** Canonical vendor keys (extend as new adapters ship). */
export const RECEIPT_VENDOR_IDS = {
  LAUNDRY_BUTLER: "laundry_butler",
} as const;

export type KnownReceiptVendorId =
  (typeof RECEIPT_VENDOR_IDS)[keyof typeof RECEIPT_VENDOR_IDS];

/**
 * Normalized claims used after JWT verification for receipt expansion.
 * Legacy tokens may omit vendorId/buildingSlug — resolver applies defaults.
 */
export type ReceiptExpansionIdentity = {
  orderId: string;
  vendorId: KnownReceiptVendorId;
  buildingSlug: string | null;
  serviceType: string | null;
};

export type BldgReceiptBranding = {
  title: string;
  serviceSubtitle: string;
  businessName: string;
  addressLine1: string;
  addressLine2: string;
  phoneDisplay: string;
};
