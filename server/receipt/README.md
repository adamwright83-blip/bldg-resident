# Receipt expansion (server)

- **`vendorRegistry.ts`** — list of vendors with a fetch+map implementation; keep in sync with `expandViewModel.ts`.
- **`parseExpansionIdentity.ts`** — JWT → `ReceiptExpansionIdentity` (explicit `vendorId`, `buildingSlug`, `orderId`, `serviceType`).
- **`expandViewModel.ts`** — resolve branding → fetch raw JSON per vendor → map to `BldgReceiptViewModel`.

Routes in `welcomeRoutes.ts`: `POST /api/receipt/expand`, `GET /api/receipt/session/:orderId`.
