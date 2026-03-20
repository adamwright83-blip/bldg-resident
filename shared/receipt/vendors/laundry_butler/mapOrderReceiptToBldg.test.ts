import { describe, it, expect } from "vitest";
import dryCleaningFixture from "../../../../docs/samples/laundry-butler-receipt.sample.json";
import washFoldFixture from "../../../../docs/samples/laundry-butler-receipt-wash-fold.sample.json";
import type { BldgReceiptViewModel } from "../../../receiptViewModel";
import { mapLbOrderReceiptJsonToBldgReceipt } from "./mapOrderReceiptToBldg";

const testBranding: BldgReceiptViewModel["branding"] = {
  title: "Test Vendor",
  serviceSubtitle: "",
  businessName: "Test Vendor LLC",
  addressLine1: "A",
  addressLine2: "B",
  phoneDisplay: "555",
};

describe("mapLbOrderReceiptJsonToBldgReceipt", () => {
  it("maps lineItems + cents totals and order placed from timestamps.createdAt", () => {
    const vm = mapLbOrderReceiptJsonToBldgReceipt(
      {
        orderId: 42,
        serviceType: "dry_cleaning",
        lineItems: [
          { name: "Dress", qty: 1, price: 1200 },
          { name: "Shirt", qty: 2, price: 1000 },
        ],
        subtotal: 7500,
        total: 6000,
        paid: true,
        timestamps: {
          createdAt: "2026-03-15T15:29:00.000Z",
          paidAt: "2026-03-18T01:55:00.000Z",
        },
        deliveryWindow: "03/17/26 11:00am – 1:00pm",
        customerName: "bailey darger",
      },
      { branding: testBranding }
    );

    expect(vm.schemaVersion).toBe(1);
    expect(vm.order.id).toBe(42);
    expect(vm.order.customerName).toBe("bailey darger");
    expect(vm.meta.orderPlacedAt).toBe("2026-03-15T15:29:00.000Z");
    expect(vm.meta.dueDisplay).toBe("03/17/26 11:00am – 1:00pm");
    expect(vm.totals.subtotal).toBe("75.00");
    expect(vm.totals.discount).toBe("15.00");
    expect(vm.totals.total).toBe("60.00");
    expect(vm.lines).toHaveLength(2);
    expect(vm.lines[0].item).toBe("Dress");
    expect(vm.lines[0].amount).toBe("12.00");
    expect(vm.branding.title).toBe("Test Vendor");
    expect(vm.branding.serviceSubtitle).toBe("Dry Cleaning");
  });

  it("fixture JSON matches BldgReceiptViewModel shape (dry cleaning)", () => {
    const m = dryCleaningFixture as BldgReceiptViewModel;
    expect(m.schemaVersion).toBe(1);
    expect(m.lines.length).toBeGreaterThan(0);
    expect(m.meta.orderPlacedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("fixture JSON matches BldgReceiptViewModel shape (wash & fold)", () => {
    const m = washFoldFixture as BldgReceiptViewModel;
    expect(m.schemaVersion).toBe(1);
    expect(m.totals.discount).toBe("5.00");
  });
});
