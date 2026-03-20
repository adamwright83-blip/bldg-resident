/**
 * Dumb presentational receipt — only BldgReceiptViewModel, no data fetching.
 * Branding strings must come from the model (payload / config), never hard-coded vendor names here.
 */
import type { BldgReceiptViewModel } from "@shared/receiptViewModel";

export type ReceiptPaperProps = {
  model: BldgReceiptViewModel;
  className?: string;
};

function formatReceiptDate(d: Date): string {
  return d.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function orderPlacedLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()) || d.getUTCFullYear() < 1980) {
    return "—";
  }
  return formatReceiptDate(d);
}

export function ReceiptPaper({ model, className = "" }: ReceiptPaperProps) {
  const { branding, order, meta, lines, totals, footerMessage } = model;

  return (
    <div
      className={`min-h-screen bg-neutral-100 py-8 px-4 print:bg-white print:py-4 ${className}`}
    >
      <div className="max-w-md mx-auto bg-white border border-neutral-200 shadow-sm print:shadow-none print:border-neutral-300 font-serif text-black">
        <div className="text-center pt-8 pb-6 px-6 border-b border-neutral-100">
          <h1 className="text-2xl font-semibold tracking-tight">{branding.title}</h1>
          <p className="text-xs text-black/45 mt-1">{branding.serviceSubtitle}</p>
        </div>

        <div className="px-6 py-5">
          <p className="text-center text-2xl font-bold">#{order.id}</p>
          <p className="text-center text-lg font-medium mt-1">{order.customerName}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 px-6 pb-6 text-sm border-b border-neutral-200">
          <div className="text-black/80 leading-relaxed">
            <p className="font-medium text-black">{branding.businessName}</p>
            <p>{branding.addressLine1}</p>
            <p>{branding.addressLine2}</p>
            <p className="mt-1">Tel: {branding.phoneDisplay}</p>
          </div>
          <div className="text-right text-black/80 leading-relaxed text-sm">
            <p>
              <span className="text-black/50">Total: </span>
              <span className="font-semibold text-black">${totals.total}</span>
            </p>
            <p className="mt-1">
              <span className="text-black/50">Order placed: </span>
              {orderPlacedLabel(meta.orderPlacedAt)}
            </p>
            <p className="mt-1">
              <span className="text-black/50">Due: </span>
              {meta.dueDisplay}
            </p>
            <p className="mt-1">
              <span className="text-black/50">Payment: </span>
              {meta.paymentDisplay}
            </p>
          </div>
        </div>

        <div className="px-6 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-300 text-left text-black/50 text-xs uppercase tracking-wide">
                <th className="pb-2 pr-2 font-medium">Item</th>
                <th className="pb-2 pr-2 font-medium w-14">Qty</th>
                <th className="pb-2 pr-2 font-medium w-16 text-right">Unit</th>
                <th className="pb-2 font-medium w-20 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((row, i) => (
                <tr key={i} className="border-b border-neutral-100">
                  <td className="py-2 pr-2 align-top">{row.item}</td>
                  <td className="py-2 pr-2 align-top">{row.quantity}</td>
                  <td className="py-2 pr-2 text-right align-top">{row.unitPrice}</td>
                  <td className="py-2 text-right align-top">{row.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 pb-6 text-sm">
          <div className="flex justify-end">
            <div className="w-48 space-y-1 text-right">
              <div className="flex justify-between gap-8">
                <span className="text-black/50">Subtotal</span>
                <span>${totals.subtotal}</span>
              </div>
              <div className="flex justify-between gap-8">
                <span className="text-black/50">Discount</span>
                <span>${totals.discount}</span>
              </div>
              <div className="flex justify-between gap-8 font-semibold pt-1 border-t border-neutral-200">
                <span>Total</span>
                <span>${totals.total}</span>
              </div>
              <div className="flex justify-between gap-8 text-black/70">
                <span>Payment</span>
                <span>${totals.payment}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 text-center text-sm text-black/55 print:bg-neutral-100">
          {footerMessage}
        </div>
      </div>
    </div>
  );
}
