import { RECEIPT_VENDOR_IDS, type KnownReceiptVendorId } from "@shared/receipt/types";

/**
 * Vendors with a server-side fetch + map implementation in `expandViewModel.ts`.
 * Add new ids here and implement the switch branch + backend fetcher together.
 */
export const REGISTERED_RECEIPT_VENDOR_IDS: readonly KnownReceiptVendorId[] = [
  RECEIPT_VENDOR_IDS.LAUNDRY_BUTLER,
];

export const registeredReceiptVendorSet = new Set<string>(
  REGISTERED_RECEIPT_VENDOR_IDS
);
