# Intake tower identity and address mapping

Tower identity is **address-number based**. The canonical tower numbers are **3545**, **3650**, **2160**, **2170**. Full addresses feed the driver/admin app.

## Host / subdomain → stored user identity flow

1. **From host**: User visits `3545.bldg.chat` (or `3650.bldg.chat`, etc.).  
   `resolveBuildingFromHostname(hostname)` in `shared/buildingHostMap.ts` extracts the numeric subdomain (e.g. `3545`) and returns `BUILDING_HOST_MAP["3545"]` whose **slug** is the tower number `"3545"`.  
   That slug is stored as **buildingSlug** when creating a guest session or when handoff runs (host wins over JWT payload).

2. **From onboarding (chat)**: User types "Opus, 1204" in chat. The router normalizes to a slug (e.g. `opusla`) and saves it as **buildingSlug**. Intake later normalizes `opusla` → `3545` via `resolveIntakeBuildingKey`.

3. **From OTP**: Client sends **buildingSlug** in the body; it is stored on the user. It may be a tower number (3545, …) or a legacy slug (opusla, opus-south, …). Intake normalizes to tower when building the payload.

4. **From welcome handoff**: JWT may contain **buildingSlug**; host is preferred, then payload, then fallback **3545** (see below).

## Canonical mapping table (implemented)

Addresses are exact from building records; no inferred city/state/ZIP.

| Tower ID | Full address (intake payload) |
|----------|-------------------------------|
| 3545     | 3545 Wilshire Blvd |
| 3650     | 3650 6th St |
| 2160     | 2160 Century Pk E |
| 2170     | 2170 Century Pk E |

Legacy slugs normalize to tower ID:

| Legacy slug  | Resolves to |
|--------------|-------------|
| opusla       | 3545        |
| opus-south   | 3545        |
| opus-north   | 3650        |
| cpe-north    | 2160        |
| cpe-south    | 2170        |

## Intake payload: buildingId and address per tower

| Tower | buildingId | address |
|-------|------------|---------|
| 3545  | `3545`     | `3545 Wilshire Blvd` |
| 3650  | `3650`     | `3650 6th St` |
| 2160  | `2160`     | `2160 Century Pk E` |
| 2170  | `2170`     | `2170 Century Pk E` |

Unknown tower: `address` is sent as `Address unknown` (no guessed address).

Source of truth: `shared/intakeBuilding.ts` (`TOWER_ADDRESSES`, `LEGACY_SLUG_TO_TOWER`) and `shared/buildingHostMap.ts` (host → slug = tower number).

## Default `3545` usage (audit)

| Location | Usage | Intentional? |
|----------|--------|---------------|
| **server/welcomeRoutes.ts** (handoff) | When `hostBuilding?.slug` and JWT `buildingSlug` are both missing, `buildingSlug` is set to `"3545"`. | **Real default**: Allows handoff to complete when user lands without tower context (e.g. app.bldg.chat link with no host/payload). A warning is logged: `[Welcome] No building context from host or JWT; defaulting buildingSlug to 3545`. Consider replacing with hard failure or explicit missing-building handling if silent misrouting is unacceptable. |
| shared/buildingHostMap.ts | Map entry for subdomain `3545` → slug `3545`. | Not a default; defines the 3545 tower. |
| shared/intakeBuilding.ts | Legacy slug `opusla` (and `opus-south`) resolve to tower `3545`. | Not a default; normalization of legacy identifiers. |

## E2E / manual verification

Automated tests in `server/intakeTowerVerification.test.ts` cover: correct `buildingId` and address per tower, legacy slug normalization, unknown → "Address unknown", and firstName-only payload shape.

**Manual checks (run against live/staging):**

1. **Per-tower resident**  
   For each tower (3545, 3650, 2160, 2170), use a resident whose `buildingSlug` is that tower (e.g. visit `3545.bldg.chat` or set user’s `buildingSlug`). Send a laundry booking. In server logs, confirm the intake payload has the correct `buildingId` and exact `address` from the table above. Confirm firstName-only users (no lastName) still succeed.

2. **Admin / driver landing**  
   After each booking, confirm in the admin/driver app that the order appears under the correct tower/building for 3545, 3650, 2160, and 2170. If any tower lands in the wrong place, note the exact intake payload and where it landed before changing code.

3. **app.bldg.chat no-context**  
   Trigger the welcome handoff with no tower context (e.g. request to `app.bldg.chat` with a handoff JWT that has no `buildingSlug`). Confirm the server log line: `[Welcome] No building context from host or JWT; defaulting buildingSlug to 3545`.
