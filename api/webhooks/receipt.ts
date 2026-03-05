/**
 * Vercel serverless API route: POST /api/webhooks/receipt
 * Called by bldg-admin-api after charging a customer's card.
 * Authorization header must contain raw APP_SHARED_API_SECRET.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getBldgUserById,
  getServiceRequestByBldgUserAndOrderId,
  getServiceRequests,
  updateServiceRequest,
  insertChatMessage,
} from "../../server/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.error("[ReceiptWebhook] Missing Authorization header");
      res.status(401).json({ error: "Missing Authorization header" });
      return;
    }

    const secret = process.env.APP_SHARED_API_SECRET || process.env.JWT_SHARED_SECRET || "";
    if (!secret) {
      console.error("[ReceiptWebhook] No secret configured");
      res.status(500).json({ error: "Server misconfigured" });
      return;
    }

    if (authHeader !== secret) {
      console.error("[ReceiptWebhook] Invalid Authorization header");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const body = req.body as { bldgUserId?: number; receiptUrl?: string; orderId?: number };
    const { bldgUserId, receiptUrl, orderId } = body;

    if (!bldgUserId || !receiptUrl || !orderId) {
      console.error("[ReceiptWebhook] Missing required fields:", { bldgUserId, receiptUrl, orderId });
      res.status(400).json({ error: "Missing required fields: bldgUserId, receiptUrl, orderId" });
      return;
    }

    const userId = Number(bldgUserId);
    const orderIdNum = Number(orderId);
    if (!Number.isFinite(userId) || !Number.isFinite(orderIdNum)) {
      res.status(400).json({ error: "bldgUserId and orderId must be numbers" });
      return;
    }

    const user = await getBldgUserById(userId);
    if (!user) {
      console.error("[ReceiptWebhook] User not found:", userId);
      res.status(404).json({ error: "User not found" });
      return;
    }

    let booking = await getServiceRequestByBldgUserAndOrderId(userId, orderIdNum);
    if (!booking) {
      const requests = await getServiceRequests(userId, 50);
      const pending = requests.filter((r) => r.status === "pending");
      if (pending.length > 0) {
        booking = pending[0];
        console.warn(
          `[ReceiptWebhook] No booking with orderId=${orderIdNum}; using most recent pending booking #${booking.id} for user ${userId}`
        );
      }
    }
    if (!booking) {
      console.error("[ReceiptWebhook] No booking found for user:", userId, "orderId:", orderIdNum);
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    await updateServiceRequest(booking.id, {
      receiptUrl: String(receiptUrl),
      orderId: orderIdNum,
      status: "paid",
    });

    await insertChatMessage({
      bldgUserId: userId,
      role: "assistant",
      content: `Order #${orderId} processed. View your digital receipt here: ${receiptUrl}`,
      metadata: {
        orderId: orderIdNum,
      },
    });

    console.log(`[ReceiptWebhook] Updated booking #${booking.id} for user ${userId}, order ${orderIdNum}`);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[ReceiptWebhook] Error:", err);
    res.status(500).json({ error: "Failed to process receipt webhook" });
  }
}
