/**
 * Backfill bldg_users identity from Laundry Butler / admin export (phone-keyed).
 *
 * Usage:
 *   DATABASE_URL=... pnpm exec tsx scripts/backfill-bldg-users-from-lb.ts path/to/data.json
 *   DATABASE_URL=... pnpm run backfill:bldg-users -- path/to/data.json
 *
 * Does not touch payment columns. Safe to re-run (idempotent).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getDb, getBldgUserByPhone, updateBldgUser } from "../server/db";
import { bldgUsers } from "../drizzle/schema";

export type LbBackfillRow = {
  phone: string;
  firstName?: string | null;
  lastName?: string | null;
  buildingSlug?: string | null;
};

function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 10) digits = "1" + digits;
  if (!digits.startsWith("1")) digits = "1" + digits;
  return "+" + digits;
}

function isBlank(v: string | null | undefined): boolean {
  return v == null || String(v).trim() === "";
}

function trimOrNull(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}

export function parseInput(jsonText: string): LbBackfillRow[] {
  const parsed = JSON.parse(jsonText) as unknown;
  if (Array.isArray(parsed)) return parsed as LbBackfillRow[];
  if (
    parsed &&
    typeof parsed === "object" &&
    "users" in parsed &&
    Array.isArray((parsed as { users: unknown }).users)
  ) {
    return (parsed as { users: LbBackfillRow[] }).users;
  }
  throw new Error("JSON must be an array of rows or { \"users\": [ ... ] }");
}

export type BackfillStats = {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ phone: string; message: string }>;
};

export async function backfillBldgUsersFromLbRows(rows: LbBackfillRow[]): Promise<BackfillStats> {
  const db = await getDb();
  if (!db) {
    throw new Error("DATABASE_URL is not set or database connection failed.");
  }

  const stats: BackfillStats = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawPhone = row?.phone;
    if (rawPhone == null || String(rawPhone).trim() === "") {
      stats.errors.push({ phone: String(rawPhone), message: "missing phone" });
      console.log(`[backfill] ERROR row ${i + 1}: missing phone`);
      continue;
    }

    let phoneE164: string;
    try {
      phoneE164 = normalizePhone(String(rawPhone));
    } catch {
      stats.errors.push({ phone: String(rawPhone), message: "invalid phone" });
      console.log(`[backfill] ERROR row ${i + 1}: invalid phone ${JSON.stringify(rawPhone)}`);
      continue;
    }

    const srcFirst = trimOrNull(row.firstName);
    const srcLast = trimOrNull(row.lastName);
    const srcBuilding = trimOrNull(row.buildingSlug);

    const existing = await getBldgUserByPhone(phoneE164);

    if (!existing) {
      try {
        await db.insert(bldgUsers).values({
          phoneE164,
          firstName: srcFirst,
          lastName: srcLast,
          buildingSlug: srcBuilding,
          lastLoginAt: new Date(),
        });
        stats.created++;
        console.log(
          `[backfill] CREATED id=new phone=${phoneE164} firstName=${srcFirst ?? "∅"} lastName=${srcLast ?? "∅"} buildingSlug=${srcBuilding ?? "∅"}`
        );
      } catch (e: any) {
        const message = e?.message ?? String(e);
        stats.errors.push({ phone: phoneE164, message });
        console.log(`[backfill] ERROR create phone=${phoneE164}: ${message}`);
      }
      continue;
    }

    const updates: {
      firstName?: string | null;
      lastName?: string | null;
      buildingSlug?: string | null;
    } = {};

    if (isBlank(existing.firstName) && srcFirst) {
      updates.firstName = srcFirst;
    }
    if (isBlank(existing.lastName) && srcLast) {
      updates.lastName = srcLast;
    }
    if (isBlank(existing.buildingSlug) && srcBuilding) {
      updates.buildingSlug = srcBuilding;
    }

    if (Object.keys(updates).length === 0) {
      stats.skipped++;
      console.log(
        `[backfill] SKIPPED id=${existing.id} phone=${phoneE164} (nothing to fill; source had no new data for empty fields)`
      );
      continue;
    }

    try {
      await updateBldgUser(existing.id, updates);
      stats.updated++;
      console.log(
        `[backfill] UPDATED id=${existing.id} phone=${phoneE164} patch=${JSON.stringify(updates)}`
      );
    } catch (e: any) {
      const message = e?.message ?? String(e);
      stats.errors.push({ phone: phoneE164, message });
      console.log(`[backfill] ERROR update id=${existing.id} phone=${phoneE164}: ${message}`);
    }
  }

  return stats;
}

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error(
      "Usage: pnpm exec tsx scripts/backfill-bldg-users-from-lb.ts <path-to-json>\n" +
        "See scripts/backfill-bldg-users.example.json for input shape."
    );
    process.exit(1);
  }

  const path = resolve(process.cwd(), fileArg);
  const jsonText = readFileSync(path, "utf8");
  const rows = parseInput(jsonText);

  console.log(`[backfill] Loaded ${rows.length} row(s) from ${path}`);
  const stats = await backfillBldgUsersFromLbRows(rows);

  console.log("[backfill] ─── summary ───");
  console.log(`[backfill] created: ${stats.created}`);
  console.log(`[backfill] updated: ${stats.updated}`);
  console.log(`[backfill] skipped: ${stats.skipped}`);
  console.log(`[backfill] errors:  ${stats.errors.length}`);
  if (stats.errors.length) {
    for (const e of stats.errors) {
      console.log(`[backfill]   - ${e.phone}: ${e.message}`);
    }
  }
}

const invokedAsCli =
  typeof process.argv[1] === "string" &&
  resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);

if (invokedAsCli) {
  main().catch((err) => {
    console.error("[backfill] Fatal:", err);
    process.exit(1);
  });
}
