# Laundry Butler to HELD welcome handoff

Laundry Butler redirects the resident to `https://app.bldg.chat/welcome?token=<JWT>` (or a building HELD host using the same `/welcome` path). The resident app verifies and consumes the token server-side at `GET /api/welcome`.

## JWT contract

- Algorithm: `HS256`
- `iss` (required): `laundry-butler`
- `aud` (required): `held-resident-app`
- `exp` (required): short-lived NumericDate; five minutes is recommended
- `jti` (required): unique nonempty handoff identifier
- `phone` (required): resident phone; must normalize unambiguously to E.164
- `orderId` (required): positive safe integer, supplied as a JSON number or digit string
- `firstName` (optional): string
- `lastName` (optional): string
- `email` (optional): valid email string
- `unit` (optional): string
- `buildingSlug` (optional): canonical HELD building slug

Blank optional values are treated as absent and never erase a stored nonempty profile value. Do not include Stripe customer IDs, payment-method IDs, PAN/card data, billing details, or full street addresses. HELD obtains safe saved-card display metadata only through the existing authenticated server-to-server payment-method lookup.

## Environment variables

Resident app and Laundry Butler/admin signer:

- `APP_SHARED_API_SECRET`: same high-entropy secret on both sides; signs the handoff JWT and authenticates receipt API calls.

Resident app only:

- `JWT_SECRET`: separate high-entropy secret used to sign the resident `bldg_session` cookie.
- `LAUNDRY_API_BASE_URL`: Laundry Butler origin used for server-to-server receipt fetches (production default: `https://laundrybutler.bldg.chat`).
- `DATABASE_URL`: MySQL connection where `bldg_users`, `chat_messages`, and `service_requests` are persisted.

The admin/Laundry Butler repository must not sign handoff tokens with `JWT_SECRET`; that key remains private to the resident app.
