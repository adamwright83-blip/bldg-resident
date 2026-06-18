import { jwtVerify, type JWTPayload } from "jose";

export const WELCOME_JWT_ISSUER = "laundry-butler";
export const WELCOME_JWT_AUDIENCE = "held-resident-app";

export type WelcomeHandoffClaims = {
  phoneE164: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  unit?: string;
  buildingSlug?: string;
  orderId: number;
  jti: string;
};

const optionalText = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

export function normalizePhoneE164(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (raw.startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export function parseWelcomeClaims(payload: JWTPayload): WelcomeHandoffClaims {
  const phoneE164 = normalizePhoneE164(payload.phone);
  const jti = optionalText(payload.jti);
  const rawOrderId = typeof payload.orderId === "number" ? payload.orderId : Number(optionalText(payload.orderId));
  if (!phoneE164 || !jti || !Number.isSafeInteger(rawOrderId) || rawOrderId <= 0) {
    throw new Error("Token missing or invalid required fields");
  }
  const email = optionalText(payload.email)?.toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Token contains invalid email");
  return {
    phoneE164,
    orderId: rawOrderId,
    jti,
    firstName: optionalText(payload.firstName),
    lastName: optionalText(payload.lastName),
    email,
    unit: optionalText(payload.unit),
    buildingSlug: optionalText(payload.buildingSlug),
  };
}

export async function verifyWelcomeToken(token: string, secret: Uint8Array): Promise<WelcomeHandoffClaims> {
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ["HS256"],
    issuer: WELCOME_JWT_ISSUER,
    audience: WELCOME_JWT_AUDIENCE,
    requiredClaims: ["iss", "aud", "exp", "jti"],
  });
  return parseWelcomeClaims(payload);
}
