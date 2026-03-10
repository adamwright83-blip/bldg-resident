# Verification: Coordinated Requests & Payment-Update-via-Chat

## 1. Diff summary (cloud-agent branch vs main)

**Branch compared:** `origin/cursor/development-environment-setup-2c41` vs `main` (local).

### UI (Home.tsx)
- **Services grid:** Cloud branch had 5 tiles (Laundry, Dry Cleaning, Car Wash, Dog Grooming, Other) and removed Cleaning, Handyman, Assembly, Pet Sitting. "Other" used `MoreHorizontal` icon and tapping it switched to chat with placeholder "Tell us what you need...".
- **Local was missing:** The 8-tile grid; all of the above changes are now applied locally.

### Backend (chat.ts)
- **COORDINATED_SERVICES:** Replaced manual-service list with Car Wash, Dog Grooming, Other (pattern-based for car-wash/grooming; Other has no text pattern).
- **Coordinated path:** Creates a `service_request` row via `createServiceRequest` with `status: "new"`, `buildingId`, `buildingLabel`, `residentName`, `residentPhone`, `source: "BLDG.chat"`, then sends owner alert and returns: `[Service] request received.\nWe're checking availability and will text you shortly.`
- **Payment intent:** Fast-path when user says "yes" after a `payment_update_offer` message → respond with payment_collection and `collectStep: "payment"`. LLM prompt instructs model to output `[PAYMENT_INTENT: trigger]` for add/update payment phrases; post-LLM handler checks `hasPaymentIntent()`, returns payment status message and optionally `collectStep: "payment"`.
- **Local was missing:** All of the above; now implemented. In addition, **Other** is implemented via `isOtherRequest` input flag when user taps Other and sends a message (cloud branch had no way to create an "other" request from chat).

### Backend (stripe.ts, stripeHelper.ts)
- **replacePaymentMethod:** New helper to attach new PM, set default, detach old. Used when user already has `stripeCustomerId`.
- **savePaymentMethod:** If `user.stripeCustomerId` exists, call `replacePaymentMethod`; else create customer as before.
- **Local was missing:** Both changes; now applied.

### Schema (drizzle/schema.ts + migration)
- **service_requests:** New status enum values: `new`, `contacting-vendor`, `awaiting-vendor`, `scheduled`, `closed`. New columns: `buildingId`, `buildingLabel`, `residentName`, `residentPhone`, `source`.
- **Local was missing:** Schema and migration; added as `0014_coordinated_requests.sql`.

---

## 2. Is the local app missing those changes?

**Before this work:** Yes. Main had the 8-tile grid, no coordinated DB persistence, no payment-intent routing, and no replacePaymentMethod.

**After this work:** No. All intended resident-app changes from the cloud-agent branch are applied locally, plus a proper **Other** path (tap Other → type message → send with `isOtherRequest` → creates one "other" coordinated request).

---

## 3. Verification checklist (browser)

Run the app (`pnpm dev` or equivalent). Ensure DB migration has run (`pnpm db:push` or apply `drizzle/0014_coordinated_requests.sql`).

- [ ] **Services grid**  
  - Open Services view. You should see exactly 5 tiles: **Laundry**, **Dry Cleaning**, **Car Wash**, **Dog Grooming**, **Other**.  
  - No Cleaning, Handyman, Assembly, Pet Sitting.

- [ ] **Car wash request**  
  - In chat, send e.g. "car wash tomorrow".  
  - Expect: "Car Wash request received. We're checking availability and will text you shortly."  
  - In DB, `service_requests` should have a new row: `serviceType: 'car-wash'`, `status: 'new'`, `source: 'BLDG.chat'`, plus `buildingId`/`buildingLabel`/`residentName`/`residentPhone` if available.

- [ ] **Dog grooming request**  
  - Send e.g. "dog grooming asap".  
  - Same style message and a new row with `serviceType: 'grooming'`, `status: 'new'`, `source: 'BLDG.chat'`.

- [ ] **Other request**  
  - Tap **Other** in the services grid. You should land in chat with placeholder "Tell us what you need...".  
  - Type e.g. "I need a handyman" and send.  
  - Expect: "Other request received. We're checking availability and will text you shortly."  
  - DB: new row with `serviceType: 'other'`, `status: 'new'`, `requestSummary` containing your text, `source: 'BLDG.chat'`.

- [ ] **Add card / update payment flow**  
  - Send "add card" (or "update payment", "payment method", "pay").  
  - If no card on file: response should ask for a card and a Stripe card element should appear in chat.  
  - If card on file: response like "Your card on file ending in **** is all set... Want to update it?"  
  - Reply "yes" → Stripe card element appears. Save a (test) card → "Card saved. You're all set." (or equivalent) and, if a tutorial pending intent exists, that booking should execute.

---

## 4. Payment flow wiring (audit)

- **Chat routing:** "add card", "update payment", "payment method", "pay" (and similar) are in the LLM instructions; model should output `[PAYMENT_INTENT: trigger]`; `hasPaymentIntent()` detects it and the post-LLM block returns the appropriate message and `collectStep: "payment"` when no card. Affirmative reply after `payment_update_offer` is handled by the fast-path and returns the payment_collection message with `collectStep: "payment"`.
- **Frontend:** Messages with `metadata.type === "payment_collection"` or `onboarding_collect` with `collectType === "payment"` render the existing Stripe card element in chat. So the UI path is wired.
- **After save:** Stripe router already runs deferred `pendingBookingIntentJson` execution and intake forward; success message is shown. No change required for "Card saved. You're all set."
