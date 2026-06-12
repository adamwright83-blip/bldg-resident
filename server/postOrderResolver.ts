/**
 * Post-order active-laundry resolver — orderId is the operational truth.
 *
 * Live incident (2026-06-12): service_request #115 (laundry, status=pending,
 * orderId=172) was REJECTED by a status-first filter and the resident was told
 * "I don't see an active laundry order" while their order sat in the admin DB.
 * Root cause: the agent booking path stores orderId without flipping status,
 * so `pending + orderId` is a NORMAL live shape — status must never make an
 * order invisible when an orderId exists.
 *
 * Rules:
 * - candidate = laundry/dry service_request with a non-null orderId
 * - only TERMINAL statuses exclude (cancelled / completed / closed)
 * - dedupe by orderId, prefer the newest service_request per orderId
 * - active = the newest deduped candidate
 * - multiple distinct orderIds for the same user => duplicate creation flag
 */

export type PostOrderServiceRequestRow = {
  id: number;
  serviceType?: string | null;
  status?: string | null;
  orderId?: number | null;
  requestJson?: unknown;
  createdAt?: unknown;
};

export type ResolvedPostOrder<T extends PostOrderServiceRequestRow> = {
  active: T | null;
  /** Compact summaries of every laundry/dry row inspected — ALWAYS log these. */
  candidates: Array<{
    id: number;
    serviceType: string | null;
    status: string | null;
    orderId: number | null;
    rejected: string | null;
  }>;
  /** Distinct extra orderIds beyond the selected one => duplicate creation. */
  duplicateOrderIds: number[];
};

const TERMINAL_STATUSES = new Set(["cancelled", "canceled", "completed", "closed"]);

function isLaundryLike(serviceType: unknown): boolean {
  return /laundry|dry/i.test(String(serviceType ?? ""));
}

export function resolveActiveLaundryServiceRequest<T extends PostOrderServiceRequestRow>(
  requests: T[],
): ResolvedPostOrder<T> {
  const laundryRows = requests.filter((r) => isLaundryLike(r.serviceType));

  const candidates: ResolvedPostOrder<T>["candidates"] = [];
  const eligible: T[] = [];

  for (const row of laundryRows) {
    const status = (row.status ?? null) as string | null;
    let rejected: string | null = null;
    if (row.orderId == null) {
      rejected = "no_orderId";
    } else if (status && TERMINAL_STATUSES.has(status.toLowerCase())) {
      rejected = `terminal_status:${status}`;
    }
    candidates.push({
      id: row.id,
      serviceType: (row.serviceType ?? null) as string | null,
      status,
      orderId: (row.orderId ?? null) as number | null,
      rejected,
    });
    if (!rejected) eligible.push(row);
  }

  // Newest first, then dedupe by orderId (keep the newest row per order).
  const sorted = [...eligible].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  const byOrderId = new Map<number, T>();
  for (const row of sorted) {
    const oid = row.orderId as number;
    if (!byOrderId.has(oid)) byOrderId.set(oid, row);
  }

  const deduped = Array.from(byOrderId.values()).sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  const active = deduped[0] ?? null;
  const duplicateOrderIds = deduped
    .slice(1)
    .map((r) => r.orderId as number)
    .filter((oid) => oid !== (active?.orderId ?? null));

  return { active, candidates, duplicateOrderIds };
}
