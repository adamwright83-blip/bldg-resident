/**
 * Vendor-neutral receipt view model for BLDG / resident surfaces.
 *
 * **BldgReceiptViewModel** is the only public receipt contract for app.bldg.chat.
 * Branding comes from {@link resolveReceiptBranding} (central tables + env fallback),
 * not from this file or ReceiptPaper.
 */

/** One line on the receipt (vendor-neutral). */
export type BldgReceiptLine = {
  item: string;
  quantity: string;
  unitPrice: string;
  amount: string;
};

/**
 * Vendor-neutral receipt payload rendered by ReceiptPaper.
 * `order.serviceType` is a vendor-defined label key or short code (e.g. wash_fold).
 */
export type BldgReceiptViewModel = {
  schemaVersion: 1;
  branding: {
    title: string;
    serviceSubtitle: string;
    businessName: string;
    addressLine1: string;
    addressLine2: string;
    phoneDisplay: string;
  };
  order: {
    id: number;
    customerName: string;
    serviceType: string;
  };
  meta: {
    /**
     * ISO 8601 — customer order placement (`orders.createdAt`), not charge time.
     */
    orderPlacedAt: string;
    dueDisplay: string;
    paymentDisplay: string;
  };
  lines: BldgReceiptLine[];
  totals: {
    subtotal: string;
    discount: string;
    total: string;
    payment: string;
  };
  footerMessage: string;
};
