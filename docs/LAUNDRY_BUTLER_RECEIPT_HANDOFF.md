# Receipt handoff (synced from bldg-admin-api)

Canonical updates live in **`bldg-admin-api`** on `main`: `docs/LAUNDRY_BUTLER_RECEIPT_HANDOFF.md`.

This copy was added when implementing `BldgReceiptViewModel` + `ReceiptPaper` in the resident app. If the two diverge, prefer the admin repo version and refresh this file.

**Resident implementation:**

- Types: [`shared/receiptViewModel.ts`](../shared/receiptViewModel.ts)
- Mapper: [`shared/mapLaundryButlerApiToBldgReceipt.ts`](../shared/mapLaundryButlerApiToBldgReceipt.ts)
- Line builder (LB): [`shared/laundryButlerReceiptLines.ts`](../shared/laundryButlerReceiptLines.ts)
- UI: [`client/src/components/receipt/ReceiptPaper.tsx`](../client/src/components/receipt/ReceiptPaper.tsx)
- JWT expansion: `POST /api/receipt/expand` in [`server/welcomeRoutes.ts`](../server/welcomeRoutes.ts)
- Fixtures: [`docs/samples/`](samples/)
