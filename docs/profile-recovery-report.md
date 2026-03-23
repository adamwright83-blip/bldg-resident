# Profile recovery (strict guards) — implementation report

## 1. Where missing-critical-data checks live

- **[`shared/profileCritical.ts`](../shared/profileCritical.ts)** — `getCriticalProfileGaps`, `needsCriticalProfileRecovery`, `isStrictPaymentComplete`. Rules: trimmed non-empty `firstName` and `lastName`; payment requires `paymentMethodSaved === 1` and non-empty `stripePaymentMethodId`.
- **[`server/routers/chat.ts`](../server/routers/chat.ts)** — Payment-intent paths (`detectPaymentIntentFromUserInput`, `payment_update_offer` affirmative, LLM `hasPaymentIntent`); laundry/dry-clean fast path and LLM path use `needsCriticalProfileRecovery` instead of loose `tutorialMode`; post-booking follow-up messages use `getCriticalProfileGaps` (name before payment); `getHistory` filters payment prompts using `isStrictPaymentComplete` and returns `lastName` + `stripePaymentMethodId` on the `user` object.
- **[`client/src/pages/Home.tsx`](../client/src/pages/Home.tsx)** — Laundry/dry-clean confirmation gate uses `getCriticalProfileGaps` on `historyQuery.data?.user`; payment-after-name handoff in `handleNameSubmit`; inline `NameInputCard` for `onboarding_collect` when `collectType === "name"` and `resumeWithPayment` is true.

## 2. What triggers recovery

Any gap among: missing first name, missing last name, payment flag not `1`, or missing/empty `stripePaymentMethodId`. Laundry/dry-clean bookings defer to `pendingBookingIntentJson` + tutorial-style confirmation (`serviceRequestId: 0`) until the profile is complete; real `service_request` creation and admin intake run only when recovery is not needed.

## 3. “Add card” (and similar) when name is missing

Server returns the name-first message (`insertRecoveryNameBeforePayment`), `collectStep: "name"`, and `resumeWithPaymentAfterName: true`. The client shows the inline name card, then after save runs strict gap checks and shows the existing Stripe payment UI if payment is still incomplete.

## 4. Service ordering when name/payment is missing

Same deferred path as before, but with stricter eligibility: incomplete/corrupt rows stay on the pending-intent + client post-booking sequence (name → payment). After a successful card save, existing logic in [`server/routers/stripe.ts`](../server/routers/stripe.ts) still creates the deferred service request and runs post-payment intake.

## 5. Complete users

Users who satisfy all strict checks keep prior behavior: real bookings with intake, payment update offer when they already have a saved card, and no extra name step before the card UI.
