# Welcome handoff — richer JWT identity

## 1. Where `lastName` is consumed

- [`server/welcomeRoutes.ts`](server/welcomeRoutes.ts) `GET /api/welcome`: reads `payload.lastName`, trims, and passes it into [`mergeWelcomeHandoffIdentity`](server/lib/welcomeHandoffMerge.ts), then into [`upsertBldgUser`](server/db.ts) so `bldg_users.lastName` is set or preserved per merge rules.
- File header comment documents JWT fields including `lastName`.

## 2. Safe merge behavior

- [`server/lib/welcomeHandoffMerge.ts`](server/lib/welcomeHandoffMerge.ts): for `firstName` and `lastName`, a **non-empty** JWT value wins; otherwise the **existing** row value is kept. Building: non-empty **host slug or JWT `buildingSlug`** wins; else existing `buildingSlug`; else fallback `3545` (same default idea as before, without replacing a known building with the default when JWT/host are empty).
- Welcome handler loads the existing row with [`getBldgUserByPhone`](server/db.ts) before upserting.
- [`upsertBldgUser`](server/db.ts): `undefined` for `firstName` / `lastName` / `buildingSlug` means **omit that column from the duplicate-key update** so OTP/guest flows do not wipe fields they do not pass. The welcome path always passes the merged `firstName`, `lastName`, and `buildingSlug` explicitly (including `null` when both JWT and DB lack a name).

## 3. Payment completeness unchanged

- Welcome / upsert **only** touches identity + `buildingSlug` and `lastLoginAt`. It does **not** set `paymentMethodSaved`, `stripePaymentMethodId`, or `stripeCustomerId`.
- Resident payment completeness remains defined by the resident app (e.g. [`shared/profileCritical.ts`](shared/profileCritical.ts) + Stripe save in [`server/routers/stripe.ts`](server/routers/stripe.ts)). LB checkout is not treated as resident-side saved payment.
