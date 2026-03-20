/**
 * Central receipt branding data (code-owned today; replace with DB/API later).
 * Merge order: vendor default → building+vendor override → env fallback for blanks.
 */
import type { BldgReceiptBranding } from "../types";
import { RECEIPT_VENDOR_IDS, type KnownReceiptVendorId } from "../types";

export type BrandingPartial = Partial<BldgReceiptBranding>;

/** Full defaults per known vendor (primary source — not env). */
export const RECEIPT_VENDOR_BRANDING_DEFAULTS: Record<
  KnownReceiptVendorId,
  BldgReceiptBranding
> = {
  [RECEIPT_VENDOR_IDS.LAUNDRY_BUTLER]: {
    title: "Laundry Butler",
    serviceSubtitle: "",
    businessName: "Laundry Butler",
    addressLine1: "Los Angeles, CA",
    addressLine2: "United States",
    phoneDisplay: "(323) 807-4661",
  },
};

/**
 * Per-building overrides: buildingSlug → vendorId → partial branding.
 * Example: { "river-north": { laundry_butler: { title: "River North Laundry" } } }
 */
export const RECEIPT_BUILDING_VENDOR_BRANDING: Record<
  string,
  Partial<Record<KnownReceiptVendorId, BrandingPartial>>
> = {
  // Add building-specific receipt branding here as buildings onboard vendors.
};

export const DEFAULT_RECEIPT_FOOTER_MESSAGE =
  "Thanks for your business. Have an amazing day!";
