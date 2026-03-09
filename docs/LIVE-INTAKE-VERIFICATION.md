# Live intake verification checklist

Minimal real-world checks. No code changes unless a live test shows a mismatch.

---

## 1. Resident app: what to watch when placing a laundry booking

**Request:** User sends a message that triggers a laundry (or dry-cleaning) booking, e.g. “laundry” or “schedule laundry”.

**Log points:**

| What to confirm | Where to look |
|-----------------|----------------|
| **buildingId** sent | Resident server stdout. Search for a log line that starts with `[INTAKE][FastPath] sending` or `[INTAKE][LLM] sending`. The next lines are the full JSON payload. In that JSON, check `buildingId`. |
| **address** sent | Same payload JSON; check `address`. |
| **firstName / lastName shape** | Same payload JSON; check `firstName` (string) and `lastName` (string; may be `""` for firstName-only). |

**Exact log line(s):**

- Either: `[INTAKE][FastPath] sending` then the payload JSON (pretty-printed).
- Or: `[INTAKE][LLM] sending` then the payload JSON (pretty-printed).

If intake succeeds, you’ll also see:

- `[BookingConfirm][FastPath] stored orderId=...` or `[BookingConfirm][LLM] stored orderId=...`

---

## 2. Admin / driver app: where to confirm the order landed

- Open the admin/driver app and go to the **place where orders are listed or filtered by building/tower** (e.g. by address, building id, or tower number 3545 / 3650 / 2160 / 2170).
- For each test booking, confirm the new order appears under the **expected tower** (same as the `buildingId` you sent from the resident app).

If your admin uses a different label (e.g. address or name), the order should still be associated with the same physical tower as that `buildingId`.

---

## 3. Four-case test matrix (3545, 3650, 2160, 2170)

For each tower, use a resident whose **buildingSlug** is that tower (e.g. visit `3545.bldg.chat` or ensure the user’s stored `buildingSlug` is that number). Place **one laundry booking** (e.g. send “laundry”).

| Tower | Resident-side expected payload | Admin-side expected landing | Log line(s) to look for |
|-------|--------------------------------|-----------------------------|--------------------------|
| **3545** | `buildingId`: `"3545"`<br>`address`: `"3545 Wilshire Blvd"`<br>`firstName`: string (e.g. resident’s name)<br>`lastName`: string (may be `""`) | Order appears under tower **3545** (or 3545 Wilshire / south tower, per your admin UI). | `[INTAKE][FastPath] sending` or `[INTAKE][LLM] sending` → payload with `"buildingId": "3545"`, `"address": "3545 Wilshire Blvd"`. Then `[BookingConfirm][...] stored orderId=...`. |
| **3650** | `buildingId`: `"3650"`<br>`address`: `"3650 6th St"`<br>`firstName` / `lastName`: as above | Order appears under tower **3650** (or 3650 6th St / north tower). | Same pattern; payload has `"buildingId": "3650"`, `"address": "3650 6th St"`. |
| **2160** | `buildingId`: `"2160"`<br>`address`: `"2160 Century Pk E"`<br>`firstName` / `lastName`: as above | Order appears under tower **2160** (or 2160 Century Pk E / north). | Same pattern; payload has `"buildingId": "2160"`, `"address": "2160 Century Pk E"`. |
| **2170** | `buildingId`: `"2170"`<br>`address`: `"2170 Century Pk E"`<br>`firstName` / `lastName`: as above | Order appears under tower **2170** (or 2170 Century Pk E / south). | Same pattern; payload has `"buildingId": "2170"`, `"address": "2170 Century Pk E"`. |

If any case shows a **mismatch** (wrong buildingId/address in payload, or order under wrong tower in admin), note the exact payload and where the order landed before changing code.

---

## 4. No-context test: app.bldg.chat default to 3545

**What to trigger:**

- Use the **welcome handoff** flow so the resident is created or updated with **no** tower context: e.g. open the handoff URL on **app.bldg.chat** (not 3545.bldg.chat, etc.) with a JWT that either has no `buildingSlug` or is from a link that doesn’t set building. The server will then use the default.

**Log line that should appear:**

```
[Welcome] No building context from host or JWT; defaulting buildingSlug to 3545
```

**Expected outcome:**

- Handoff completes; the resident’s `buildingSlug` is set to `3545`.
- A later laundry booking from that resident should send `buildingId`: `"3545"` and `address`: `"3545 Wilshire Blvd"` (same as the 3545 case in the matrix above).

No further code changes unless a live landing test shows a mismatch.
