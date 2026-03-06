/**
 * GET /api/receipt/[token] — Verify receipt JWT and return payload for the /receipt/[token] page.
 * Secret fallback: JWT_SHARED_SECRET → JWT_SECRET → APP_SHARED_API_SECRET.
 * User-facing page fetches this; no server/ imports.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { jwtVerify } from "jose";

function getSecret(): Uint8Array {
  const raw =
    process.env.JWT_SHARED_SECRET ||
    process.env.JWT_SECRET ||
    process.env.APP_SHARED_API_SECRET ||
    "";
  return new TextEncoder().encode(raw);
}

function getTokenFromRequest(req: VercelRequest): string | null {
  const token = req.query.token;
  if (typeof token === "string" && token.length > 0) return token;
  const url = req.url ?? "";
  const path = url.split("?")[0] ?? "";
  const match = path.match(/\/api\/receipt\/([^/?#]+)/);
  return match ? match[1] : null;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const token = getTokenFromRequest(req);
  if (!token) {
    res.status(400).json({ error: "Missing token" });
    return;
  }

  const secret = getSecret();
  if (secret.length === 0) {
    res.status(500).json({ error: "Server misconfigured" });
    return;
  }

  try {
    const { payload } = await jwtVerify(token, secret, {
      clockTolerance: 0,
      maxTokenAge: "365d",
    });
    const orderId = payload.orderId as number | undefined;
    if (orderId == null) {
      res.status(400).json({ error: "Invalid token: missing orderId" });
      return;
    }
    res.status(200).json({
      orderId,
      customerId: payload.customerId ?? null,
      totalWeight: payload.totalWeight ?? null,
      finalAmount: payload.finalAmount ?? null,
      currency: (payload.currency as string) ?? "USD",
      vendorName: (payload.vendorName as string) ?? null,
      iat: payload.iat ?? null,
      exp: payload.exp ?? null,
    });
  } catch (_) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
