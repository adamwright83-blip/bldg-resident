import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ hasConsent: vi.fn(), twilioCreate: vi.fn(), upsert: vi.fn(), update: vi.fn(), get: vi.fn() }));
vi.mock("twilio", () => ({ default: () => ({ messages: { create: mocks.twilioCreate } }) }));
vi.mock("./db", () => ({ hasActiveSmsConsent: mocks.hasConsent, upsertBldgUser: mocks.upsert, updateBldgUser: mocks.update, getBldgUserByPhone: mocks.get }));

describe("transactional SMS consent guard", () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); process.env.TWILIO_ACCOUNT_SID="AC_test"; process.env.TWILIO_AUTH_TOKEN="token"; process.env.TWILIO_PHONE_NUMBER="+13238074661"; });
  it("rejects a direct OTP send without valid consent", async () => {
    mocks.hasConsent.mockResolvedValue(false);
    const { sendOTP } = await import("./otp");
    await expect(sendOTP("3105551234", "opus-south", "12")).resolves.toEqual({ ok:false, error:"SMS consent is required before sending a verification code." });
    expect(mocks.twilioCreate).not.toHaveBeenCalled(); expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("sends an identified OTP only after consent exists", async () => {
    mocks.hasConsent.mockResolvedValue(true); mocks.upsert.mockResolvedValue({id:1,otpExpiresAt:null}); mocks.update.mockResolvedValue(undefined); mocks.twilioCreate.mockResolvedValue({sid:"SM1"});
    const { sendOTP } = await import("./otp"); const result = await sendOTP("3105551234", "opus-south", "12");
    expect(result.ok).toBe(true); expect(mocks.twilioCreate).toHaveBeenCalledWith(expect.objectContaining({body:expect.stringContaining("HELD by BLDG.chat")}));
  });
});

describe("consent disclosure surfaces", () => {
  it("contains sender, frequency, rates, STOP/HELP, and policy URLs", async () => {
    const fs = await import("node:fs"); const ui=fs.readFileSync("client/src/components/onboarding/IdentityScreen.tsx","utf8");
    for (const text of ["HELD by BLDG.chat","Message frequency varies","Message and data rates may apply","Reply STOP","HELP for help","https://www.bldg.chat/termsofuse","https://www.bldg.chat/privacypolicy"]) expect(ui).toContain(text);
  });
  it("keeps the proof route public", async () => { const fs=await import("node:fs"); const app=fs.readFileSync("client/src/App.tsx","utf8"); expect(app).toContain('location === "/sms-consent"'); expect(app).toContain("isPublicConsent"); });
});
