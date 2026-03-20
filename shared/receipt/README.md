# BLDG receipt layer (shared)

Canonical **public** contract: `BldgReceiptViewModel` in [`../receiptViewModel.ts`](../receiptViewModel.ts).

| Area | Location |
|------|-----------|
| Vendor + expansion identity | [`types.ts`](./types.ts) |
| Branding resolver (tables + env fallback) | [`branding/resolveBranding.ts`](./branding/resolveBranding.ts) |
| Default + per-building branding data | [`branding/profiles.ts`](./branding/profiles.ts) |
| First vendor mapper (LB API JSON → Bldg) | [`vendors/laundry_butler/mapOrderReceiptToBldg.ts`](./vendors/laundry_butler/mapOrderReceiptToBldg.ts) |

Server orchestration: [`server/receipt/`](../../server/receipt/) (`expandViewModel.ts`, `parseExpansionIdentity.ts`, `vendorRegistry.ts`).
