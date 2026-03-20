import type { JWTPayload } from "jose";
import {
  RECEIPT_VENDOR_IDS,
  type KnownReceiptVendorId,
  type ReceiptExpansionIdentity,
} from "@shared/receipt/types";
import { UnsupportedReceiptVendorError } from "./errors";
import { registeredReceiptVendorSet } from "./vendorRegistry";

function normalizeVendorKey(raw: string): string {
  return String(raw).toLowerCase().replace(/-/g, "_").trim();
}

/**
 * Derives receipt expansion identity from a verified charge / receipt JWT.
 * Legacy tokens: no vendorId → laundry_butler (Laundry Butler was the only integration).
 */
export function parseReceiptExpansionIdentityFromJwt(
  payload: JWTPayload
): ReceiptExpansionIdentity {
  const orderId = payload.orderId;
  if (orderId == null || orderId === "") {
    throw new Error("missing orderId");
  }

  const explicit =
    (payload.vendorId as string | undefined) ??
    (payload.receiptVendorId as string | undefined);

  let vendorId: KnownReceiptVendorId;

  if (explicit != null && String(explicit).trim() !== "") {
    const n = normalizeVendorKey(explicit);
    if (!registeredReceiptVendorSet.has(n)) {
      throw new UnsupportedReceiptVendorError(n);
    }
    vendorId = n as KnownReceiptVendorId;
  } else {
    vendorId = RECEIPT_VENDOR_IDS.LAUNDRY_BUTLER;
  }

  const buildingSlug =
    (payload.buildingSlug as string | undefined)?.trim() ||
    (payload.building as string | undefined)?.trim() ||
    null;

  const serviceType =
    (payload.serviceType as string | undefined)?.trim() || null;

  return {
    orderId: String(orderId),
    vendorId,
    buildingSlug,
    serviceType,
  };
}

export function parseKnownVendorFromQuery(
  raw: string | undefined | null,
  fallback: KnownReceiptVendorId
): KnownReceiptVendorId {
  if (raw == null || String(raw).trim() === "") return fallback;
  const n = normalizeVendorKey(raw);
  if (!registeredReceiptVendorSet.has(n)) {
    throw new UnsupportedReceiptVendorError(n);
  }
  return n as KnownReceiptVendorId;
}
