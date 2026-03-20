/**
 * Express routes for the Laundry Butler → BLDG.chat handoff flow.
 *
 * GET /api/welcome?token=JWT
 *   - Verifies the JWT (signed with APP_SHARED_API_SECRET shared with Laundry Butler)
 *   - Extracts: phone, firstName, orderId, buildingSlug
 *   - Upserts bldg_users by phone_e164
 *   - Creates a session cookie (bldg_session)
 *   - Fetches receipt from Laundry Butler API
 *   - Injects receipt as AI's first chat message
 *   - Redirects to / (chat home)
 *
 * GET /api/orders/:orderId/receipt
 *   - Requires bldg_session cookie
 *   - Fetches receipt from Laundry Butler API server-to-server
 *   - Returns JSON receipt data to the frontend
 */
import { Router, Request, Response } from "express";
import { jwtVerify, SignJWT } from "jose";
import { parse as parseCookieHeader } from "cookie";
import axios from "axios";
import {
  upsertBldgUser,
  getBldgUserById,
  insertChatMessage,
  updateBldgUser,
  getServiceRequests,
  getServiceRequestByBldgUserAndOrderId,
  updateServiceRequest,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { resolveBuildingFromHostname } from "@shared/buildingHostMap";
import { RECEIPT_VENDOR_IDS } from "@shared/receipt/types";
import { expandReceiptToViewModel } from "./receipt/expandViewModel";
import {
  parseKnownVendorFromQuery,
  parseReceiptExpansionIdentityFromJwt,
} from "./receipt/parseExpansionIdentity";
import { UnsupportedReceiptVendorError } from "./receipt/errors";

const BLDG_COOKIE_NAME = "bldg_session";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * The shared API secret is used for TWO purposes:
 * 1. Verifying handoff JWTs from Laundry Butler (they sign with this secret)
 * 2. Server-to-server receipt API calls (X-APP-SHARED-SECRET header)
 */
function getSharedApiSecret(): string {
  return process.env.APP_SHARED_API_SECRET ?? "";
}

function getSharedApiSecretBytes(): Uint8Array {
  return new TextEncoder().encode(getSharedApiSecret());
}

/**
 * The internal JWT_SECRET is used only for BLDG session cookies
 * (created by this app, verified by this app — never shared externally).
 */
function getSessionSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? "";
  return new TextEncoder().encode(secret);
}

function getLaundryApiBase(): string {
  return process.env.LAUNDRY_API_BASE_URL ?? "https://laundrybutler.bldg.chat";
}

/** Receipt link JWT — same secret fallbacks as api/receipt/[token].ts */
function getReceiptJwtSecretBytes(): Uint8Array {
  const raw =
    process.env.JWT_SHARED_SECRET ||
    process.env.JWT_SECRET ||
    process.env.APP_SHARED_API_SECRET ||
    "";
  return new TextEncoder().encode(raw);
}

function isSecureRequest(req: Request): boolean {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}

/**
 * Create a BLDG session JWT containing the bldg_user id.
 */
async function createBldgSession(userId: number): Promise<string> {
  const secret = getSessionSecret();
  const issuedAt = Date.now();
  const expirationSeconds = Math.floor(
    (issuedAt + ONE_YEAR_SECONDS * 1000) / 1000
  );

  return new SignJWT({ bldgUserId: userId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secret);
}

/**
 * Verify a BLDG session cookie and return the bldg_user id.
 */
async function verifyBldgSession(
  cookieValue: string | undefined | null
): Promise<number | null> {
  if (!cookieValue) return null;

  try {
    const secret = getSessionSecret();
    const { payload } = await jwtVerify(cookieValue, secret, {
      algorithms: ["HS256"],
    });
    const { bldgUserId } = payload as Record<string, unknown>;
    if (typeof bldgUserId !== "number") return null;
    return bldgUserId;
  } catch {
    return null;
  }
}

/**
 * Extract BLDG session cookie from request.
 */
function getBldgSessionCookie(req: Request): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  const parsed = parseCookieHeader(cookieHeader);
  return parsed[BLDG_COOKIE_NAME];
}

/**
 * Format receipt data into a natural AI message for the chat.
 */
function formatReceiptMessage(
  receiptData: any,
  firstName?: string | null,
  orderId?: string
): string {
  const name = firstName || "there";

  if (!receiptData) {
    return `Hey ${name}! Your laundry order${orderId ? ` (#${orderId})` : ""} has been placed. I'll have the full details once it's processed. Anything else I can help with?`;
  }

  const {
    lineItems,
    subtotal,
    total,
    discountPercent,
    pickupWindow,
    deliveryWindow,
    status,
    paid,
  } = receiptData;

  let msg = `Hey ${name}! Here's your laundry order receipt:\n\n`;
  msg += `**Order #${orderId || receiptData.orderId || "—"}**\n`;

  if (lineItems && lineItems.length > 0) {
    for (const item of lineItems) {
      const price =
        typeof item.price === "number"
          ? `$${(item.price / 100).toFixed(2)}`
          : item.price;
      msg += `• ${item.name}${item.qty && item.qty > 1 ? ` × ${item.qty}` : ""} — ${price}\n`;
    }
    msg += "\n";
  }

  if (subtotal !== undefined) {
    msg += `Subtotal: $${(subtotal / 100).toFixed(2)}\n`;
  }
  if (discountPercent && discountPercent > 0) {
    msg += `Discount: ${discountPercent}% off\n`;
  }
  if (total !== undefined) {
    msg += `**Total: $${(total / 100).toFixed(2)}**\n`;
  }

  msg += "\n";
  if (pickupWindow) msg += `Pickup: ${pickupWindow}\n`;
  if (deliveryWindow) msg += `Delivery: ${deliveryWindow}\n`;

  if (paid) {
    msg += "\nAll paid up. Anything else I can help with?";
  } else {
    msg += "\nLet me know if you have any questions about your order.";
  }

  return msg;
}

/**
 * Create a guest BLDG user with a placeholder phone and return the session.
 * Used for first-time visitors who arrive directly at app.bldg.chat.
 */
async function createGuestUser(req: Request): Promise<{ userId: number; sessionToken: string }> {
  const guestPhone = `+1guest${Date.now()}`;
  const hostBuilding = resolveBuildingFromHostname(req.hostname || "");
  const bldgUser = await upsertBldgUser({
    phoneE164: guestPhone,
    firstName: null,
    buildingSlug: hostBuilding?.slug ?? null,
  });
  const sessionToken = await createBldgSession(bldgUser.id);
  return { userId: bldgUser.id, sessionToken };
}

export function registerWelcomeRoutes(app: Router): void {
  app.get("/api/session", async (req: Request, res: Response) => {
    try {
      const existingCookie = getBldgSessionCookie(req);
      const userId = await verifyBldgSession(existingCookie);
      if (!userId) {
        return res.json({ authenticated: false });
      }

      const user = await getBldgUserById(userId);
      if (!user) {
        return res.json({ authenticated: false });
      }

      return res.json({
        authenticated: true,
        userId: user.id,
        onboardingStep: user.onboardingStep,
      });
    } catch (err) {
      console.error("[Session] Error:", err);
      return res.status(500).json({ authenticated: false });
    }
  });

  // ─── OTP Endpoints (v2 onboarding) ───

  app.post("/api/otp/send", async (req: Request, res: Response) => {
    try {
      const { phone, buildingSlug, unit } = req.body || {};
      if (!phone || !unit) {
        return res.status(400).json({ error: "Phone and unit are required." });
      }
      const slug = buildingSlug || "unknown";

      const { sendOTP } = await import("./otp");
      const result = await sendOTP(phone, slug, unit);

      if (!result.ok) {
        return res.status(429).json({ error: result.error });
      }
      return res.json({ ok: true, maskedPhone: result.maskedPhone });
    } catch (err) {
      console.error("[OTP Send] Error:", err);
      return res.status(500).json({ error: "Failed to send code." });
    }
  });

  app.post("/api/otp/verify", async (req: Request, res: Response) => {
    try {
      const { phone, code } = req.body || {};
      if (!phone || !code) {
        return res.status(400).json({ error: "Phone and code are required." });
      }

      const { verifyOTP } = await import("./otp");
      const result = await verifyOTP(phone, code);

      if (!result.ok) {
        return res.status(401).json({ error: result.error });
      }

      const sessionToken = await createBldgSession(result.userId);
      res.cookie(BLDG_COOKIE_NAME, sessionToken, {
        ...getSessionCookieOptions(req),
        maxAge: ONE_YEAR_SECONDS * 1000,
      });

      console.log(`[OTP] Verified user ${result.userId}`);
      return res.json({ ok: true, userId: result.userId });
    } catch (err) {
      console.error("[OTP Verify] Error:", err);
      return res.status(500).json({ error: "Verification failed." });
    }
  });

  // ─── Guest Session (legacy fallback) ───

  /**
   * POST /api/guest-session
   *
   * Creates a guest user and returns a session cookie.
   * Used for first-time visitors who don't come from Laundry Butler.
   */
  app.post("/api/guest-session", async (req: Request, res: Response) => {
    try {
      // Check if user already has a valid session
      const existingCookie = getBldgSessionCookie(req);
      const existingUserId = await verifyBldgSession(existingCookie);
      
      if (existingUserId) {
        // Verify the user still exists in the database
        const existingUser = await getBldgUserById(existingUserId);
        if (existingUser) {
          return res.json({ userId: existingUserId, alreadyExists: true });
        }
        // User was deleted — clear stale cookie and create a new guest
        console.log(`[GuestSession] Stale session for deleted user ${existingUserId}, creating new guest`);
      }

      // Create a new guest user
      const { userId, sessionToken } = await createGuestUser(req);

      res.cookie(BLDG_COOKIE_NAME, sessionToken, {
        ...getSessionCookieOptions(req),
        maxAge: ONE_YEAR_SECONDS * 1000,
      });

      console.log(`[GuestSession] Created guest user ${userId}`);
      return res.json({ userId, alreadyExists: false });
    } catch (err) {
      console.error("[GuestSession] Error:", err);
      return res.status(500).json({ error: "Failed to create session" });
    }
  });
  /**
   * GET /api/welcome?token=JWT
   *
   * The Laundry Butler project redirects here after a successful order.
   * The JWT contains: phone, firstName, orderId, buildingSlug.
   *
   * Flow:
   * 1. Verify JWT → upsert user → create session cookie
   * 2. Fetch receipt from Laundry Butler API (best-effort)
   * 3. Inject receipt as AI's first chat message
   * 4. Redirect to / (chat home)
   */
  app.get("/api/welcome", async (req: Request, res: Response) => {
    try {
      const token = req.query.token as string | undefined;

      if (!token) {
        console.error("[Welcome] Missing token query parameter");
        return res.status(400).json({ error: "Missing token parameter" });
      }

      // Verify the JWT from Laundry Butler (signed with APP_SHARED_API_SECRET)
      const sharedSecret = getSharedApiSecretBytes();
      let payload: Record<string, unknown>;

      try {
        const result = await jwtVerify(token, sharedSecret, {
          algorithms: ["HS256"],
        });
        payload = result.payload as Record<string, unknown>;
      } catch (err) {
        console.error("[Welcome] JWT verification failed:", err);
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      // Extract fields from the JWT
      const phone = payload.phone as string | undefined;
      const firstName = payload.firstName as string | undefined;
      const orderId = payload.orderId as string | undefined;
      const hostBuilding = resolveBuildingFromHostname(req.hostname || "");
      const payloadBuilding = payload.buildingSlug as string | undefined;
      const buildingSlug =
        hostBuilding?.slug ?? payloadBuilding ?? "3545";

      if (!hostBuilding?.slug && payloadBuilding == null) {
        console.warn("[Welcome] No building context from host or JWT; defaulting buildingSlug to 3545");
      }

      if (!phone || !orderId) {
        console.error("[Welcome] JWT missing required fields (phone, orderId)");
        return res
          .status(400)
          .json({ error: "Token missing required fields" });
      }

      console.log(
        `[Welcome] Handoff for phone=${phone}, orderId=${orderId}, building=${buildingSlug}`
      );

      // Upsert the BLDG resident user by phone
      const bldgUser = await upsertBldgUser({
        phoneE164: phone,
        firstName: firstName ?? null,
        buildingSlug,
      });

      // Create a session cookie
      const sessionToken = await createBldgSession(bldgUser.id);

      res.cookie(BLDG_COOKIE_NAME, sessionToken, {
        ...getSessionCookieOptions(req),
        maxAge: ONE_YEAR_SECONDS * 1000,
      });

      // Fetch receipt from Laundry Butler API (best-effort, don't block on failure)
      let receiptData = null;
      try {
        const laundryApiBase = getLaundryApiBase();
        const response = await axios.get(
          `${laundryApiBase}/api/orders/${orderId}/receipt`,
          {
            headers: {
              "X-APP-SHARED-SECRET": getSharedApiSecret(),
            },
            timeout: 10000,
          }
        );
        receiptData = response.data;
      } catch (err: any) {
        console.warn(
          `[Welcome] Could not fetch receipt for orderId=${orderId}:`,
          err.message
        );
      }

      // Inject receipt as AI's first chat message
      try {
        const content = formatReceiptMessage(
          receiptData,
          firstName,
          orderId
        );
        await insertChatMessage({
          bldgUserId: bldgUser.id,
          role: "assistant",
          content,
          metadata: {
            type: "receipt",
            orderId,
            receiptData,
          },
        });
        console.log(
          `[Welcome] Injected receipt message for user ${bldgUser.id}`
        );
      } catch (err: any) {
        console.error("[Welcome] Failed to inject receipt message:", err);
        // Non-fatal — still redirect to chat
      }

      // Redirect to chat home (not /orders/:orderId anymore)
      return res.redirect("/");
    } catch (err) {
      console.error("[Welcome] Unexpected error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * GET /api/orders/:orderId/receipt
   *
   * Fetches the receipt from Laundry Butler's API server-to-server.
   * Requires the bldg_session cookie (user must be logged in).
   * Kept for direct links and the standalone /orders/:orderId page.
   */
  app.get(
    "/api/orders/:orderId/receipt",
    async (req: Request, res: Response) => {
      try {
        // Verify session
        const sessionCookie = getBldgSessionCookie(req);
        const bldgUserId = await verifyBldgSession(sessionCookie);

        if (!bldgUserId) {
          return res.status(401).json({ error: "Not authenticated" });
        }

        // Verify user exists
        const user = await getBldgUserById(bldgUserId);
        if (!user) {
          return res.status(401).json({ error: "User not found" });
        }

        const { orderId } = req.params;
        if (!orderId) {
          return res.status(400).json({ error: "Missing orderId" });
        }

        // Fetch receipt from Laundry Butler API
        const laundryApiBase = getLaundryApiBase();
        const sharedSecret = getSharedApiSecret();

        console.log(
          `[Orders] Fetching receipt for orderId=${orderId} from ${laundryApiBase}`
        );

        const response = await axios.get(
          `${laundryApiBase}/api/orders/${orderId}/receipt`,
          {
            headers: {
              "X-APP-SHARED-SECRET": sharedSecret,
            },
            timeout: 15000,
          }
        );

        return res.json(response.data);
      } catch (err: any) {
        if (err.response) {
          console.error(
            `[Orders] Laundry Butler API error: ${err.response.status}`,
            err.response.data
          );
          return res.status(err.response.status).json({
            error: "Failed to fetch receipt",
            details: err.response.data,
          });
        }
        console.error("[Orders] Unexpected error:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  /**
   * GET /api/receipt/session/:orderId
   *
   * Authenticated BldgReceiptViewModel for /orders/:orderId.
   * Query: ?vendor=laundry_butler (default), optional ?serviceType=
   * Branding from central resolver (building + vendor tables + env fallback).
   */
  app.get(
    "/api/receipt/session/:orderId",
    async (req: Request, res: Response) => {
      try {
        const sessionCookie = getBldgSessionCookie(req);
        const bldgUserId = await verifyBldgSession(sessionCookie);

        if (!bldgUserId) {
          return res.status(401).json({ error: "Not authenticated" });
        }

        const user = await getBldgUserById(bldgUserId);
        if (!user) {
          return res.status(401).json({ error: "User not found" });
        }

        const { orderId } = req.params;
        if (!orderId) {
          return res.status(400).json({ error: "Missing orderId" });
        }

        let vendorId;
        try {
          vendorId = parseKnownVendorFromQuery(
            typeof req.query.vendor === "string" ? req.query.vendor : null,
            RECEIPT_VENDOR_IDS.LAUNDRY_BUTLER
          );
        } catch (e) {
          if (e instanceof UnsupportedReceiptVendorError) {
            return res.status(400).json({ error: e.message });
          }
          throw e;
        }

        const serviceType =
          typeof req.query.serviceType === "string"
            ? req.query.serviceType.trim() || null
            : null;

        const sharedSecret = getSharedApiSecret();
        if (!sharedSecret) {
          console.error("[ReceiptSession] APP_SHARED_API_SECRET not set");
          return res.status(500).json({ error: "Server misconfigured" });
        }

        const model = await expandReceiptToViewModel(
          {
            orderId,
            vendorId,
            buildingSlug: user.buildingSlug ?? null,
            serviceType,
          },
          {
            sharedApiSecret: sharedSecret,
            laundryApiBase: getLaundryApiBase(),
          }
        );

        return res.json(model);
      } catch (err: any) {
        if (err.response) {
          console.error(
            `[ReceiptSession] Vendor API ${err.response.status}:`,
            err.response.data
          );
          return res.status(err.response.status || 502).json({
            error: "Failed to load receipt",
          });
        }
        console.error("[ReceiptSession] Unexpected error:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  /**
   * POST /api/set-building
   *
   * Called during onboarding to save the user's building + unit selection.
   * Requires an existing bldg_session cookie.
   */
  app.post("/api/set-building", async (req: Request, res: Response) => {
    try {
      const existingCookie = getBldgSessionCookie(req);
      const userId = await verifyBldgSession(existingCookie);

      if (!userId) {
        return res.status(401).json({ error: "No session" });
      }

      const { building, unit } = req.body || {};
      if (!building || !unit) {
        return res.status(400).json({ error: "Missing building or unit" });
      }

      await updateBldgUser(userId, {
        buildingSlug: building,
        unit: String(unit),
      });

      console.log(`[SetBuilding] User ${userId} → ${building} unit ${unit}`);
      return res.json({ ok: true });
    } catch (err) {
      console.error("[SetBuilding] Error:", err);
      return res.status(500).json({ error: "Failed to save building" });
    }
  });

  /**
   * POST /api/receipt/expand
   * Verifies receipt JWT → explicit vendor + order identity → vendor fetch + mapper → BldgReceiptViewModel.
   * Claims: orderId (required); vendorId | receiptVendorId (optional, default laundry_butler);
   * buildingSlug | building (optional); serviceType (optional).
   */
  app.post("/api/receipt/expand", async (req: Request, res: Response) => {
    try {
      const token =
        typeof req.body?.token === "string" ? req.body.token.trim() : "";
      if (!token) {
        return res.status(400).json({ error: "Missing token" });
      }

      const secret = getReceiptJwtSecretBytes();
      if (secret.length === 0) {
        console.error("[ReceiptExpand] No JWT secret configured");
        return res.status(500).json({ error: "Server misconfigured" });
      }

      let payload: import("jose").JWTPayload;
      try {
        const verified = await jwtVerify(token, secret, {
          clockTolerance: 0,
          maxTokenAge: "365d",
        });
        payload = verified.payload;
      } catch (e: any) {
        const code = e?.code;
        if (code === "ERR_JWT_EXPIRED") {
          return res.status(401).json({ error: "Token expired" });
        }
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      let identity;
      try {
        identity = parseReceiptExpansionIdentityFromJwt(payload);
      } catch (e) {
        if (e instanceof UnsupportedReceiptVendorError) {
          return res.status(501).json({ error: e.message });
        }
        if (e instanceof Error && e.message === "missing orderId") {
          return res.status(400).json({ error: "Invalid token: missing orderId" });
        }
        throw e;
      }

      const sharedSecret = getSharedApiSecret();
      if (!sharedSecret) {
        console.error("[ReceiptExpand] APP_SHARED_API_SECRET not set");
        return res.status(500).json({ error: "Server misconfigured" });
      }

      try {
        const model = await expandReceiptToViewModel(identity, {
          sharedApiSecret: sharedSecret,
          laundryApiBase: getLaundryApiBase(),
        });
        return res.json(model);
      } catch (err: any) {
        if (err instanceof UnsupportedReceiptVendorError) {
          return res.status(501).json({ error: err.message });
        }
        if (err.response) {
          console.error(
            `[ReceiptExpand] Vendor API ${err.response.status}:`,
            err.response.data
          );
          return res.status(err.response.status || 502).json({
            error: "Failed to load receipt details",
          });
        }
        console.error("[ReceiptExpand] Unexpected error:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    } catch (err) {
      console.error("[ReceiptExpand] Error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/webhooks/receipt - Receipt notification webhook (bldg-admin-api after charging card)
  app.post("/api/webhooks/receipt", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        console.error("[ReceiptWebhook] Missing Authorization header");
        return res.status(401).json({ error: "Missing Authorization header" });
      }

      const secret = process.env.APP_SHARED_API_SECRET || process.env.JWT_SHARED_SECRET || "";
      if (!secret) {
        console.error("[ReceiptWebhook] No secret configured");
        return res.status(500).json({ error: "Server misconfigured" });
      }

      if (authHeader !== secret) {
        console.error("[ReceiptWebhook] Invalid Authorization header");
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { bldgUserId, receiptUrl, orderId } = req.body;

      if (!bldgUserId || !receiptUrl || !orderId) {
        console.error("[ReceiptWebhook] Missing required fields:", { bldgUserId, receiptUrl, orderId });
        return res.status(400).json({ error: "Missing required fields: bldgUserId, receiptUrl, orderId" });
      }

      const userId = Number(bldgUserId);
      const orderIdNum = Number(orderId);
      if (!Number.isFinite(userId) || !Number.isFinite(orderIdNum)) {
        return res.status(400).json({ error: "bldgUserId and orderId must be numbers" });
      }

      const user = await getBldgUserById(userId);
      if (!user) {
        console.error("[ReceiptWebhook] User not found:", userId);
        return res.status(404).json({ error: "User not found" });
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
        return res.status(404).json({ error: "Booking not found" });
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
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[ReceiptWebhook] Error:", err);
      return res.status(500).json({ error: "Failed to process receipt webhook" });
    }
  });
}
