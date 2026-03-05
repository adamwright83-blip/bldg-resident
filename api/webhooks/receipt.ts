/**
 * Vercel serverless API route: POST /api/webhooks/receipt
 * Called by bldg-admin-api after charging a customer's card.
 * Authorization header must contain raw APP_SHARED_API_SECRET.
 * Self-contained: uses DATABASE_URL and drizzle/mysql2 only (no server/ imports).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
} from "drizzle-orm/mysql-core";

// Minimal table definitions matching production schema (no server/ or drizzle/ imports)
const bldgUsers = mysqlTable("bldg_users", {
  id: int("id").autoincrement().primaryKey(),
  phoneE164: varchar("phoneE164", { length: 20 }).notNull(),
  firstName: varchar("firstName", { length: 100 }),
  lastName: varchar("lastName", { length: 100 }),
  unit: varchar("unit", { length: 50 }),
  buildingSlug: varchar("buildingSlug", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastLoginAt: timestamp("lastLoginAt").defaultNow().notNull(),
});

const serviceRequests = mysqlTable("service_requests", {
  id: int("id").autoincrement().primaryKey(),
  bldgUserId: int("bldgUserId").notNull(),
  serviceType: mysqlEnum("serviceType", [
    "laundry",
    "dry-cleaning",
    "car-wash",
    "cleaning",
    "grooming",
    "amenity",
    "maintenance",
    "other",
  ]).notNull(),
  status: mysqlEnum("status", [
    "pending",
    "paid",
    "confirmed",
    "in-progress",
    "completed",
    "cancelled",
  ])
    .default("pending")
    .notNull(),
  scheduledDate: varchar("scheduledDate", { length: 32 }),
  scheduledWindow: varchar("scheduledWindow", { length: 64 }),
  receiptUrl: varchar("receiptUrl", { length: 512 }),
  orderId: int("orderId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  bldgUserId: int("bldgUserId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return drizzle(url);
}

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

    const secret =
      process.env.APP_SHARED_API_SECRET || process.env.JWT_SHARED_SECRET || "";
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

    const body = req.body as {
      bldgUserId?: number;
      receiptUrl?: string;
      orderId?: number;
    };
    const { bldgUserId, receiptUrl, orderId } = body;

    if (!bldgUserId || !receiptUrl || !orderId) {
      console.error("[ReceiptWebhook] Missing required fields:", {
        bldgUserId,
        receiptUrl,
        orderId,
      });
      res
        .status(400)
        .json({ error: "Missing required fields: bldgUserId, receiptUrl, orderId" });
      return;
    }

    const userId = Number(bldgUserId);
    const orderIdNum = Number(orderId);
    if (!Number.isFinite(userId) || !Number.isFinite(orderIdNum)) {
      res.status(400).json({ error: "bldgUserId and orderId must be numbers" });
      return;
    }

    const db = getDb();
    if (!db) {
      console.error("[ReceiptWebhook] DATABASE_URL not configured");
      res.status(500).json({ error: "Database not configured" });
      return;
    }

    const users = await db
      .select()
      .from(bldgUsers)
      .where(eq(bldgUsers.id, userId))
      .limit(1);
    if (!users.length) {
      console.error("[ReceiptWebhook] User not found:", userId);
      res.status(404).json({ error: "User not found" });
      return;
    }

    let booking = await db
      .select()
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.bldgUserId, userId),
          eq(serviceRequests.orderId, orderIdNum)
        )
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!booking) {
      const pending = await db
        .select()
        .from(serviceRequests)
        .where(
          and(
            eq(serviceRequests.bldgUserId, userId),
            eq(serviceRequests.status, "pending")
          )
        )
        .orderBy(desc(serviceRequests.createdAt))
        .limit(1)
        .then((rows) => rows[0]);
      if (pending) {
        booking = pending;
        console.warn(
          `[ReceiptWebhook] No booking with orderId=${orderIdNum}; using most recent pending booking #${booking.id} for user ${userId}`
        );
      }
    }

    if (!booking) {
      console.error(
        "[ReceiptWebhook] No booking found for user:",
        userId,
        "orderId:",
        orderIdNum
      );
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    await db
      .update(serviceRequests)
      .set({
        receiptUrl: String(receiptUrl),
        orderId: orderIdNum,
        status: "paid",
      })
      .where(eq(serviceRequests.id, booking.id));

    await db.insert(chatMessages).values({
      bldgUserId: userId,
      role: "assistant",
      content: `Order #${orderId} processed. View your digital receipt here: ${receiptUrl}`,
      metadata: { orderId: orderIdNum },
    });

    console.log(
      `[ReceiptWebhook] Updated booking #${booking.id} for user ${userId}, order ${orderIdNum}`
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[ReceiptWebhook] Error:", err);
    res.status(500).json({ error: "Failed to process receipt webhook" });
  }
}
