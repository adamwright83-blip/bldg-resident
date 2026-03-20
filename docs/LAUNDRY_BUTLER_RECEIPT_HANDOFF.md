# Receipt handoff (BLDG resident)

Canonical contract: **`BldgReceiptViewModel`** only — see [`shared/receiptViewModel.ts`](../shared/receiptViewModel.ts).

## Resident architecture (multi-vendor)

1. **Branding** — [`shared/receipt/branding/resolveBranding.ts`](../shared/receipt/branding/resolveBranding.ts)  
   Merges vendor defaults ([`profiles.ts`](../shared/receipt/branding/profiles.ts)), per-building overrides, then `RECEIPT_*` env as **fallback** only.

2. **Session receipts** — `GET /api/receipt/session/:orderId`  
   Uses logged-in user’s `buildingSlug` + `?vendor=` (default `laundry_butler`) → `expandReceiptToViewModel`.

3. **JWT expansion** — `POST /api/receipt/expand` `{ token }`  
   Parses `orderId`, optional `vendorId` / `receiptVendorId`, optional `buildingSlug`, optional `serviceType` → same expansion pipeline.

4. **Vendor registry** — [`server/receipt/vendorRegistry.ts`](../server/receipt/vendorRegistry.ts) + switch in [`server/receipt/expandViewModel.ts`](../server/receipt/expandViewModel.ts).

5. **Raw order API (legacy / integrations)** — `GET /api/orders/:orderId/receipt` still returns vendor JSON for chat injection and tools.

6. **Laundry Butler mapper** — [`shared/receipt/vendors/laundry_butler/mapOrderReceiptToBldg.ts`](../shared/receipt/vendors/laundry_butler/mapOrderReceiptToBldg.ts).

7. **Fixtures** — [`docs/samples/`](samples/).

Admin repo handoff doc may contain LB-specific notes; this file describes **bldg-resident** behavior.
