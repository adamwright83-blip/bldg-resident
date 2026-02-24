import twilio from "twilio";
import { getBldgUserByPhone, upsertBldgUser, updateBldgUser } from "./db";
import type { BldgUser } from "../drizzle/schema";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;

const twilioClient =
  accountSid && authToken ? twilio(accountSid, authToken) : null;

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX_SENDS = 5;

// Simple in-memory rate limiter (phone -> timestamps[])
const sendLog = new Map<string, number[]>();

function isRateLimited(phone: string): boolean {
  const now = Date.now();
  const timestamps = sendLog.get(phone) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  sendLog.set(phone, recent);
  return recent.length >= RATE_LIMIT_MAX_SENDS;
}

function recordSend(phone: string) {
  const timestamps = sendLog.get(phone) || [];
  timestamps.push(Date.now());
  sendLog.set(phone, timestamps);
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 10) digits = "1" + digits;
  if (!digits.startsWith("1")) digits = "1" + digits;
  return "+" + digits;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  const last2 = digits.slice(-2);
  if (digits.length >= 10) {
    const areaCode = digits.slice(digits.length - 10, digits.length - 7);
    return `(${areaCode}) ***-**${last2}`;
  }
  return `***${last2}`;
}

export type SendOTPResult =
  | { ok: true; maskedPhone: string }
  | { ok: false; error: string };

export type VerifyOTPResult =
  | { ok: true; userId: number }
  | { ok: false; error: string };

export async function sendOTP(
  rawPhone: string,
  buildingSlug: string,
  unit: string
): Promise<SendOTPResult> {
  const phone = normalizePhone(rawPhone);

  if (isRateLimited(phone)) {
    return { ok: false, error: "Too many requests. Try again later." };
  }

  // Upsert user with real phone, building, unit
  const user = await upsertBldgUser({
    phoneE164: phone,
    buildingSlug,
  });

  // Save unit separately (upsertBldgUser doesn't accept unit)
  await updateBldgUser(user.id, { unit } as any);

  // Check resend cooldown
  if (user.otpExpiresAt) {
    const sentAt = new Date(user.otpExpiresAt).getTime() - OTP_EXPIRY_MS;
    if (Date.now() - sentAt < OTP_RESEND_COOLDOWN_MS) {
      return {
        ok: true,
        maskedPhone: maskPhone(phone),
      };
    }
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  await updateBldgUser(user.id, {
    otpCode: code,
    otpExpiresAt: expiresAt,
    otpAttempts: 0,
  } as any);

  // Send SMS via Twilio
  if (twilioClient && fromPhone) {
    try {
      await twilioClient.messages.create({
        body: `BLDG.chat code: ${code}`,
        from: fromPhone,
        to: phone,
      });
      console.log(`[OTP] Sent to ${maskPhone(phone)}`);
    } catch (err) {
      console.error("[OTP] Twilio send failed:", err);
      return { ok: false, error: "Failed to send verification code." };
    }
  } else {
    // No Twilio — log code for dev
    console.log(`[OTP] (no Twilio) Code for ${phone}: ${code}`);
  }

  recordSend(phone);
  return { ok: true, maskedPhone: maskPhone(phone) };
}

export async function verifyOTP(
  rawPhone: string,
  code: string
): Promise<VerifyOTPResult> {
  const phone = normalizePhone(rawPhone);
  const user = await getBldgUserByPhone(phone);

  if (!user) {
    return { ok: false, error: "Phone number not found." };
  }

  // Admin bypass for testing
  const bypass = process.env.OTP_BYPASS_CODE;
  if (bypass && code === bypass) {
    await updateBldgUser(user.id, { onboardingStep: 5, otpCode: null, otpAttempts: 0 } as any);
    return { ok: true, userId: user.id };
  }

  if (!user.otpCode || !user.otpExpiresAt) {
    return { ok: false, error: "No verification code sent." };
  }

  if (new Date() > new Date(user.otpExpiresAt)) {
    return { ok: false, error: "Code expired. Request a new one." };
  }

  if ((user.otpAttempts ?? 0) >= OTP_MAX_ATTEMPTS) {
    return { ok: false, error: "Too many attempts. Request a new code." };
  }

  if (user.otpCode !== code) {
    await updateBldgUser(user.id, {
      otpAttempts: (user.otpAttempts ?? 0) + 1,
    } as any);
    return { ok: false, error: "Incorrect code." };
  }

  // OTP verified — activate user
  await updateBldgUser(user.id, {
    onboardingStep: 5,
    otpCode: null,
    otpAttempts: 0,
  } as any);

  return { ok: true, userId: user.id };
}
