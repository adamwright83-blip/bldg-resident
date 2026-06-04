/**
 * Default a return-by / delivery date onto admin-intake payloads.
 *
 * The Laundry Butler admin marks a forwarded order "new" (visible in /admin and
 * /driver) only when it has pickupDate + pickupWindow + a return-by date
 * (bldg-admin-api: server/residentIntake.ts → `actionable`). The resident app
 * historically sent pickup info but no return-by, so every order was filed as
 * `intake-pending` and never appeared in the driver feed.
 *
 * This applies a sane default when the resident didn't specify a deadline, so
 * orders become actionable. A user/parsed deadline (returnBy / deliveryDate /
 * deadlineDate already on the payload) is always preserved. Tunable.
 */
export const DEFAULT_WASH_FOLD_TURNAROUND_DAYS = 2;

/** Add days to a "YYYY-MM-DD" string, returning the same format. */
export function addDaysYmd(ymd: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return ymd;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

export function withDefaultReturnBy<T extends object>(
  payload: T,
  days = DEFAULT_WASH_FOLD_TURNAROUND_DAYS
): T {
  const p = payload as Record<string, unknown>;
  const alreadyHas =
    (typeof p.returnBy === "string" && p.returnBy) ||
    (typeof p.deliveryDate === "string" && p.deliveryDate) ||
    (typeof p.deadlineDate === "string" && p.deadlineDate);
  if (alreadyHas) return payload;

  const pickup = typeof p.pickupDate === "string" ? p.pickupDate : null;
  if (!pickup || !/^\d{4}-\d{2}-\d{2}$/.test(pickup)) return payload;

  const returnBy = addDaysYmd(pickup, days);
  return { ...payload, returnBy, deliveryDate: returnBy } as T;
}
