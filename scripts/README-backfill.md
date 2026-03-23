# Backfill `bldg_users` from Laundry Butler / admin export

## Command

```bash
export DATABASE_URL='mysql://...'
pnpm run backfill:bldg-users -- path/to/export.json
```

Or:

```bash
pnpm exec tsx scripts/backfill-bldg-users-from-lb.ts path/to/export.json
```

## Input format

**Option A — wrapper object:**

```json
{
  "users": [
    {
      "phone": "+13105551234",
      "firstName": "Alex",
      "lastName": "Rivera",
      "buildingSlug": "opusla"
    }
  ]
}
```

**Option B — plain array:**

```json
[
  { "phone": "3105559876", "firstName": "Sam", "lastName": "Lee", "buildingSlug": "cpe-north" }
]
```

- `phone` is required per row (E.164 or US 10-digit; normalized to `+1…`).
- Other fields optional; only used to **fill empty** columns on existing users.

See [`backfill-bldg-users.example.json`](backfill-bldg-users.example.json).

## Behavior

- **Existing user:** sets `firstName` / `lastName` / `buildingSlug` only when the DB value is blank and the row provides a non-empty value. Never overwrites non-empty data. Never touches Stripe / `paymentMethodSaved`.
- **Missing user:** inserts a row with the provided identity fields; DB defaults apply for payment and onboarding.
- **Idempotent:** second run typically **skips** rows that are already complete (unless new empty fields appeared).

## Example log output

```
[backfill] Loaded 2 row(s) from /path/to/export.json
[backfill] CREATED id=new phone=+13105551234 firstName=Alex lastName=Rivera buildingSlug=opusla
[backfill] UPDATED id=42 phone=+13105559876 patch={"firstName":"Sam"}
[backfill] SKIPPED id=99 phone=+13105550000 (nothing to fill; source had no new data for empty fields)
[backfill] ─── summary ───
[backfill] created: 1
[backfill] updated: 1
[backfill] skipped: 1
[backfill] errors:  0
```

Programmatic use: import `backfillBldgUsersFromLbRows` and `parseInput` from `scripts/backfill-bldg-users-from-lb.ts` (or move exports to `server/` if you prefer).
