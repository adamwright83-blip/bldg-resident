import type { Express, Request, Response } from "express";
import {
  getServiceRequestByBldgUserAndOrderId,
  getServiceRequests,
  updateServiceRequest,
} from "./db";

/**
 * Inbound operator-reply channel (admin → resident, shared-secret S2S).
 *
 * When the operator answers a resident post-order follow-up on
 * admin.bldg.chat / driver.bldg.chat, the admin server POSTs the reply here.
 * We mark the matching followups[] entry on the resident's service_request as
 * "answered" and attach the reply payload. The resident client polls its own
 * server (chat.getFollowupReplies) — so the returning courier works even if
 * the Twilio SMS never arrives or is ignored.
 */

export type FollowupReplyPayload = {
  bldgUserId: number | null;
  orderId: number | null;
  operatorTaskId: string;
  followupType: string;
  requestedWindow: string | null;
  message: string;
  decision: "approved" | "declined" | null;
  newPickupTimeWindow: string | null;
  newDeliveryTimeWindow: string | null;
  repliedAt: string;
};

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as JsonObject;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as JsonObject;
    } catch {
      /* fallthrough */
    }
  }
  return {};
}

/**
 * Pure merge: mark the matching followup entry answered with the reply.
 * Match by operatorTaskId first; fall back to the newest awaiting entry of the
 * same type; append a fresh answered entry if nothing matches. NEVER drops
 * existing requestJson keys (clientRequestId, recurrence, windows, …).
 */
export function mergeFollowupReply(
  existingRequestJson: unknown,
  payload: FollowupReplyPayload,
): JsonObject {
  const existing = asObject(existingRequestJson);
  const followups = Array.isArray(existing.followups) ? ([...existing.followups] as JsonObject[]) : [];

  const reply = {
    message: payload.message,
    decision: payload.decision,
    newPickupTimeWindow: payload.newPickupTimeWindow,
    newDeliveryTimeWindow: payload.newDeliveryTimeWindow,
    repliedAt: payload.repliedAt,
  };

  let matched = false;
  let next = followups.map((entry) => {
    if (matched || !entry || typeof entry !== "object") return entry;
    const sameTask =
      entry.operatorTaskId != null && String(entry.operatorTaskId) === payload.operatorTaskId;
    if (sameTask) {
      matched = true;
      return { ...entry, state: "answered", reply };
    }
    return entry;
  });

  if (!matched) {
    // Fallback: newest awaiting entry of the same type.
    for (let i = next.length - 1; i >= 0; i--) {
      const entry = next[i];
      if (
        entry &&
        typeof entry === "object" &&
        entry.state === "awaiting_operator" &&
        entry.type === payload.followupType
      ) {
        next[i] = { ...entry, state: "answered", operatorTaskId: payload.operatorTaskId, reply };
        matched = true;
        break;
      }
    }
  }

  if (!matched) {
    next = [
      ...next,
      {
        type: payload.followupType,
        requestedWindow: payload.requestedWindow,
        operatorTaskId: payload.operatorTaskId,
        state: "answered",
        reply,
        at: payload.repliedAt,
      },
    ];
  }

  return { ...existing, followups: next };
}

export function registerHeldFollowupRoutes(app: Express) {
  app.post("/api/held/followup-reply", async (req: Request, res: Response) => {
    const provided = req.headers["x-app-shared-secret"];
    const expected = process.env.APP_SHARED_API_SECRET || "";
    const providedValue = Array.isArray(provided) ? provided[0] : provided;
    if (!expected || !providedValue || providedValue !== expected) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    const body = asObject(req.body);
    const bldgUserId = Number(body.bldgUserId);
    const orderId = Number(body.orderId);
    const operatorTaskId = String(body.operatorTaskId ?? "");
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!Number.isFinite(bldgUserId) || !operatorTaskId || !message) {
      return res.status(400).json({ ok: false, error: "bldgUserId, operatorTaskId, message required" });
    }

    const payload: FollowupReplyPayload = {
      bldgUserId,
      orderId: Number.isFinite(orderId) ? orderId : null,
      operatorTaskId,
      followupType: typeof body.followupType === "string" ? body.followupType : "timing_constraint",
      requestedWindow: typeof body.requestedWindow === "string" ? body.requestedWindow : null,
      message,
      decision: body.decision === "approved" || body.decision === "declined" ? body.decision : null,
      newPickupTimeWindow:
        typeof body.newPickupTimeWindow === "string" ? body.newPickupTimeWindow : null,
      newDeliveryTimeWindow:
        typeof body.newDeliveryTimeWindow === "string" ? body.newDeliveryTimeWindow : null,
      repliedAt: typeof body.repliedAt === "string" ? body.repliedAt : new Date().toISOString(),
    };

    try {
      // Find the service_request: by (user, order) first, then by scanning the
      // user's recent requests for the matching followup entry.
      let target =
        payload.orderId != null
          ? await getServiceRequestByBldgUserAndOrderId(bldgUserId, payload.orderId)
          : undefined;
      if (!target) {
        const requests = await getServiceRequests(bldgUserId, 50);
        target = requests.find((r) => {
          const json = asObject((r as { requestJson?: unknown }).requestJson);
          const followups = Array.isArray(json.followups) ? (json.followups as JsonObject[]) : [];
          return followups.some(
            (f) => f && String(f.operatorTaskId ?? "") === payload.operatorTaskId,
          );
        });
      }
      if (!target) {
        console.warn(
          `[FollowupReply] no service_request found user=${bldgUserId} order=${payload.orderId} task=${payload.operatorTaskId}`,
        );
        return res.status(404).json({ ok: false, error: "service_request not found" });
      }

      const merged = mergeFollowupReply((target as { requestJson?: unknown }).requestJson, payload);
      await updateServiceRequest(target.id, { requestJson: merged });
      console.log(
        `[FollowupReply] stored reply on service_request #${target.id} (task=${payload.operatorTaskId}, decision=${payload.decision ?? "none"})`,
      );
      return res.status(200).json({ ok: true, serviceRequestId: target.id });
    } catch (err) {
      console.error("[FollowupReply] failed:", err);
      return res.status(500).json({ ok: false, error: "internal" });
    }
  });
}
