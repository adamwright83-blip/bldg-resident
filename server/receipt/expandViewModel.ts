import axios from "axios";
import type { BldgReceiptViewModel } from "@shared/receiptViewModel";
import { resolveReceiptBranding } from "@shared/receipt/branding/resolveBranding";
import { DEFAULT_RECEIPT_FOOTER_MESSAGE } from "@shared/receipt/branding/profiles";
import { RECEIPT_VENDOR_IDS } from "@shared/receipt/types";
import type { ReceiptExpansionIdentity } from "@shared/receipt/types";
import {
  mapLbOrderReceiptJsonToBldgReceipt,
  type LbOrderReceiptJson,
} from "@shared/receipt/vendors/laundry_butler/mapOrderReceiptToBldg";
import { UnsupportedReceiptVendorError } from "./errors";

export type ReceiptBackendContext = {
  sharedApiSecret: string;
  laundryApiBase: string;
};

async function fetchLaundryButlerOrderReceiptJson(
  orderId: string,
  ctx: ReceiptBackendContext
): Promise<unknown> {
  const response = await axios.get(
    `${ctx.laundryApiBase}/api/orders/${orderId}/receipt`,
    {
      headers: { "X-APP-SHARED-SECRET": ctx.sharedApiSecret },
      timeout: 15000,
    }
  );
  return response.data;
}

/**
 * Fetches vendor raw receipt JSON and maps to BldgReceiptViewModel with resolved branding.
 */
export async function expandReceiptToViewModel(
  identity: ReceiptExpansionIdentity,
  backend: ReceiptBackendContext
): Promise<BldgReceiptViewModel> {
  const branding = resolveReceiptBranding({
    vendorId: identity.vendorId,
    buildingSlug: identity.buildingSlug,
    serviceType: identity.serviceType,
  });

  switch (identity.vendorId) {
    case RECEIPT_VENDOR_IDS.LAUNDRY_BUTLER: {
      const raw = await fetchLaundryButlerOrderReceiptJson(
        identity.orderId,
        backend
      );
      return mapLbOrderReceiptJsonToBldgReceipt(raw as LbOrderReceiptJson, {
        branding,
        footerMessage: DEFAULT_RECEIPT_FOOTER_MESSAGE,
      });
    }
    default:
      throw new UnsupportedReceiptVendorError(String(identity.vendorId));
  }
}
