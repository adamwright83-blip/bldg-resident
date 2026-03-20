/**
 * Maps Laundry Butler GET /api/orders/:id/receipt JSON → BldgReceiptViewModel.
 * Branding must be supplied by caller (env, building config, or payload).
 */
import type { BldgReceiptLine, BldgReceiptViewModel } from "./receiptViewModel";
import { buildLaundryButlerReceiptLines } from "./laundryButlerReceiptLines";

export type LaundryButlerReceiptApiLike = {
  orderId?: string | number;
  serviceType?: string;
  lineItems?: Array<{ name: string; qty?: number; price: number }>;
  subtotal?: number;
  total?: number;
  discountPercent?: number;
  paid?: boolean;
  status?: string;
  address?: string;
  unit?: string;
  pickupWindow?: string;
  deliveryWindow?: string;
  phone?: string;
  timestamps?: { createdAt?: string; paidAt?: string };
  createdAt?: string;
  firstName?: string;
  lastName?: string;
  customerName?: string;
  weightLbs?: string | null;
  upchargesJson?: unknown;
  drycleanItemsJson?: unknown;
};

export type MapLaundryButlerReceiptOptions = {
  /** Required branding for header / business block (from env, config, or API). */
  branding: BldgReceiptViewModel["branding"];
  footerMessage?: string;
};

function fmtMoneyCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function formatReceiptMetaDate(d: Date): string {
  return d.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function linesFromApiLineItems(
  lineItems: NonNullable<LaundryButlerReceiptApiLike["lineItems"]>
): BldgReceiptLine[] {
  return lineItems.map((item) => {
    const qty = item.qty && item.qty > 0 ? item.qty : 1;
    const totalCents = item.price;
    const unitCents = qty > 0 ? Math.round(totalCents / qty) : totalCents;
    return {
      item: item.name,
      quantity: String(qty),
      unitPrice: fmtMoneyCents(unitCents),
      amount: fmtMoneyCents(totalCents),
    };
  });
}

function serviceTypeNormalized(
  raw: string | undefined
): "wash_fold" | "dry_cleaning" | null {
  if (raw === "wash_fold" || raw === "dry_cleaning") return raw;
  if (!raw) return null;
  const s = raw.toLowerCase().replace(/\s+/g, "_");
  if (s.includes("wash") || s.includes("fold")) return "wash_fold";
  if (s.includes("dry") || s.includes("clean")) return "dry_cleaning";
  return null;
}

function serviceSubtitleFor(st: string | undefined): string {
  const n = serviceTypeNormalized(st);
  if (n === "wash_fold") return "Wash & Fold";
  if (n === "dry_cleaning") return "Dry Cleaning";
  return st?.replace(/_/g, " ") || "Service";
}

function shouldUseIntakeLines(api: LaundryButlerReceiptApiLike): boolean {
  const st = serviceTypeNormalized(api.serviceType);
  if (st === "dry_cleaning" && api.drycleanItemsJson && typeof api.drycleanItemsJson === "object")
    return true;
  if (
    st === "wash_fold" &&
    (api.weightLbs != null ||
      (api.upchargesJson && typeof api.upchargesJson === "object"))
  )
    return true;
  return false;
}

function buildLines(api: LaundryButlerReceiptApiLike): BldgReceiptLine[] {
  const st = serviceTypeNormalized(api.serviceType);
  const subtotalCents = api.subtotal ?? 0;
  const subtotalDollars = (subtotalCents / 100).toFixed(2);

  if (st && shouldUseIntakeLines(api)) {
    return buildLaundryButlerReceiptLines({
      serviceType: st,
      weightLbs: api.weightLbs != null ? String(api.weightLbs) : null,
      upchargesJson: api.upchargesJson ?? null,
      drycleanItemsJson: api.drycleanItemsJson ?? null,
      subtotal: subtotalDollars,
    });
  }

  if (api.lineItems && api.lineItems.length > 0) {
    return linesFromApiLineItems(api.lineItems);
  }

  return [];
}

function customerNameFrom(api: LaundryButlerReceiptApiLike): string {
  if (api.customerName?.trim()) return api.customerName.trim();
  const parts = [api.firstName, api.lastName].filter(Boolean);
  const joined = parts.join(" ").trim();
  return joined || "—";
}

function orderIdNumber(api: LaundryButlerReceiptApiLike): number {
  const raw = api.orderId;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function orderPlacedIso(api: LaundryButlerReceiptApiLike): string {
  const raw = api.timestamps?.createdAt ?? api.createdAt;
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date(0).toISOString();
}

function orderPlacedMissing(api: LaundryButlerReceiptApiLike): boolean {
  const raw = api.timestamps?.createdAt ?? api.createdAt;
  if (!raw) return true;
  return Number.isNaN(new Date(raw).getTime());
}

/**
 * Maps LB receipt API response to BldgReceiptViewModel.
 * When `orderPlacedAt` would be unknown (no createdAt), uses epoch ISO; use
 * {@link orderPlacedDisplayIsMissing} in UI if needed, or ensure API sends createdAt.
 */
export function mapLaundryButlerApiToBldgReceipt(
  api: LaundryButlerReceiptApiLike,
  opts: MapLaundryButlerReceiptOptions
): BldgReceiptViewModel {
  const subtotalCents = api.subtotal ?? 0;
  const totalCents = api.total ?? 0;
  const discountCents = Math.max(0, subtotalCents - totalCents);

  const lines = buildLines(api);
  const paidAtRaw = api.timestamps?.paidAt;
  const paidAt = paidAtRaw ? new Date(paidAtRaw) : null;
  const paymentDisplay =
    api.paid && paidAt && !Number.isNaN(paidAt.getTime())
      ? `${formatReceiptMetaDate(paidAt)}, Card`
      : api.paid
        ? "Paid, Card"
        : "Pending";

  const dueDisplay =
    (api.deliveryWindow && api.deliveryWindow.trim()) ||
    (api.pickupWindow && api.pickupWindow.trim()) ||
    "—";

  const serviceSubtitle = serviceSubtitleFor(api.serviceType);

  return {
    schemaVersion: 1,
    branding: {
      ...opts.branding,
      serviceSubtitle:
        opts.branding.serviceSubtitle?.trim() || serviceSubtitle,
    },
    order: {
      id: orderIdNumber(api),
      customerName: customerNameFrom(api),
      serviceType: api.serviceType ?? "unknown",
    },
    meta: {
      orderPlacedAt: orderPlacedIso(api),
      dueDisplay,
      paymentDisplay,
    },
    lines,
    totals: {
      subtotal: fmtMoneyCents(subtotalCents),
      discount: fmtMoneyCents(discountCents),
      total: fmtMoneyCents(totalCents),
      payment: fmtMoneyCents(totalCents),
    },
    footerMessage:
      opts.footerMessage ??
      "Thanks for your business. Have an amazing day!",
  };
}

export function orderPlacedDisplayIsMissing(api: LaundryButlerReceiptApiLike): boolean {
  return orderPlacedMissing(api);
}
