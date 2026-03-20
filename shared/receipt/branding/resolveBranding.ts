import type { BldgReceiptBranding } from "../types";
import type { KnownReceiptVendorId } from "../types";
import {
  RECEIPT_BUILDING_VENDOR_BRANDING,
  RECEIPT_VENDOR_BRANDING_DEFAULTS,
} from "./profiles";
import { receiptBrandingEnvFallback } from "./envFallback";

function mergeBranding(
  base: BldgReceiptBranding,
  ...partials: (Partial<BldgReceiptBranding> | undefined)[]
): BldgReceiptBranding {
  let out = { ...base };
  for (const p of partials) {
    if (!p) continue;
    out = {
      title: p.title?.trim() || out.title,
      serviceSubtitle:
        p.serviceSubtitle !== undefined
          ? p.serviceSubtitle
          : out.serviceSubtitle,
      businessName: p.businessName?.trim() || out.businessName,
      addressLine1: p.addressLine1?.trim() || out.addressLine1,
      addressLine2: p.addressLine2?.trim() || out.addressLine2,
      phoneDisplay: p.phoneDisplay?.trim() || out.phoneDisplay,
    };
  }
  return out;
}

export type ResolveReceiptBrandingInput = {
  vendorId: KnownReceiptVendorId;
  buildingSlug?: string | null;
  /** Reserved for future subtitle rules; order payload still drives line subtitles. */
  serviceType?: string | null;
};

/**
 * Canonical branding resolver for BLDG receipts.
 * Swap in DB/API reads here when ready; keep the same signature.
 */
export function resolveReceiptBranding(
  ctx: ResolveReceiptBrandingInput
): BldgReceiptBranding {
  const vendorKey = ctx.vendorId;
  const vendorBase = RECEIPT_VENDOR_BRANDING_DEFAULTS[vendorKey];
  const slug = ctx.buildingSlug?.trim();
  const buildingSlice =
    slug && RECEIPT_BUILDING_VENDOR_BRANDING[slug]
      ? RECEIPT_BUILDING_VENDOR_BRANDING[slug][vendorKey]
      : undefined;

  return mergeBranding(vendorBase, buildingSlice, receiptBrandingEnvFallback());
}
