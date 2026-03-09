# Intake tower identity and address mapping

Tower identity is **address-number based**. The canonical tower numbers are **3545**, **3650**, **2160**, **2170**. Full addresses feed the driver/admin app.

## Host / subdomain → stored user identity flow

1. **From host**: User visits `3545.bldg.chat` (or `3650.bldg.chat`, etc.).  
   `resolveBuildingFromHostname(hostname)` in `shared/buildingHostMap.ts` extracts the numeric subdomain (e.g. `3545`) and returns `BUILDING_HOST_MAP["3545"]` whose **slug** is the tower number `"3545"`.  
   That slug is stored as **buildingSlug** when creating a guest session or when handoff runs (host wins over JWT payload).

2. **From onboarding (chat)**: User types "Opus, 1204" in chat. The router normalizes to a slug (e.g. `opusla`) and saves it as **buildingSlug**. Intake later normalizes `opusla` → `3545` via `resolveIntakeBuildingKey`.

3. **From OTP**: Client sends **buildingSlug** in the body; it is stored on the user. It may be a tower number (3545, …) or a legacy slug (opusla, opus-south, …). Intake normalizes to tower when building the payload.

4. **From welcome handoff**: JWT may contain **buildingSlug**; host is preferred, then payload, then fallback **3545**.

## Canonical mapping table (implemented)

| Tower ID | Full address (intake payload) |
|----------|-------------------------------|
| 3545     | 3545 Wilshire Blvd, Los Angeles, CA 90048 |
| 3650     | 3650 6th St, Los Angeles, CA 90014       |
| 2160     | 2160 Century Pk E, Los Angeles, CA 90067 |
| 2170     | 2170 Century Pk E, Los Angeles, CA 90067 |

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
| 3545  | `3545`     | `3545 Wilshire Blvd, Los Angeles, CA 90048` |
| 3650  | `3650`     | `3650 6th St, Los Angeles, CA 90014` |
| 2160  | `2160`     | `2160 Century Pk E, Los Angeles, CA 90067` |
| 2170  | `2170`     | `2170 Century Pk E, Los Angeles, CA 90067` |

Source of truth: `shared/intakeBuilding.ts` (`TOWER_ADDRESSES`, `LEGACY_SLUG_TO_TOWER`) and `shared/buildingHostMap.ts` (host → slug = tower number).
