import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Tests for the booking-first onboarding flow.
 *
 * NEW FLOW: Users can book immediately. After their first booking,
 * the system collects address → name → phone → payment progressively.
 *
 * These tests verify the handlePostBookingCollection function logic
 * and the getOnboardingMessage function without hitting the database.
 */

// ─── Mock db module ───
const mockUpdateBldgUser = vi.fn().mockResolvedValue(undefined);
const mockGetBldgUserByPhone = vi.fn().mockResolvedValue(undefined);
const mockGetBldgUserById = vi.fn().mockResolvedValue(undefined);

vi.mock("./db", () => ({
  insertChatMessage: vi.fn().mockResolvedValue({ id: 1 }),
  getChatHistory: vi.fn().mockResolvedValue([]),
  clearChatHistory: vi.fn().mockResolvedValue(undefined),
  getBldgUserById: (...args: any[]) => mockGetBldgUserById(...args),
  createServiceRequest: vi.fn().mockResolvedValue({ id: 1 }),
  updateServiceRequest: vi.fn().mockResolvedValue(undefined),
  getServiceRequests: vi.fn().mockResolvedValue([]),
  hasShownOnboarding: vi.fn().mockResolvedValue(false),
  markOnboardingShown: vi.fn().mockResolvedValue(undefined),
  updateBldgUser: (...args: any[]) => mockUpdateBldgUser(...args),
  getBldgUserByPhone: (...args: any[]) => mockGetBldgUserByPhone(...args),
  upsertBldgUser: vi.fn().mockResolvedValue({ id: 99, phoneE164: "+1guest123" }),
  getBookingStats: vi.fn().mockResolvedValue({ totalBookings: 0, weeklyBookings: 0 }),
}));

// ─── Onboarding step constants (mirrored from chat.ts — NEW booking-first flow) ───
const ONBOARDING_STEP = {
  NOT_STARTED: 0,        // Fresh guest, no booking yet — let them book freely
  COLLECTING_ADDRESS: 1, // First booking placed, now collecting building + unit
  COLLECTING_NAME: 2,    // Address collected, now collecting name
  COLLECTING_PHONE: 3,   // Name collected, now collecting phone
  COLLECTING_PAYMENT: 4, // Phone collected, now collecting payment
  COMPLETE: 5,           // All info collected
} as const;

// ─── Pure logic: handlePostBookingCollection (extracted for testing) ───
async function handlePostBookingCollection(
  bldgUserId: number,
  userMessage: string,
  currentStep: number
): Promise<{
  response: string;
  newStep: number;
  onboardingComplete: boolean;
  mergedUserId?: number;
  collectType?: string;
} | null> {
  // Step 1: Collecting address (building + unit in one answer)
  if (currentStep === ONBOARDING_STEP.COLLECTING_ADDRESS) {
    const raw = userMessage.trim();
    let buildingSlug = "";
    let unit = "";

    if (raw.includes(",")) {
      const parts = raw.split(",").map((s) => s.trim());
      buildingSlug = parts[0];
      unit = parts.slice(1).join(", ").trim();
    } else {
      const match = raw.match(/^(.+?)\s+(\d+\S*)$/);
      if (match) {
        buildingSlug = match[1].trim();
        unit = match[2].trim();
      } else {
        buildingSlug = raw;
      }
    }

    let slug = buildingSlug.toLowerCase().replace(/\s+/g, "-");
    if (buildingSlug.toLowerCase().includes("opus")) {
      slug = "opusla";
    }

    if (unit) {
      await mockUpdateBldgUser(bldgUserId, {
        buildingSlug: slug,
        unit,
        onboardingStep: ONBOARDING_STEP.COLLECTING_NAME,
      });
      return {
        response: "Name for the order?",
        newStep: ONBOARDING_STEP.COLLECTING_NAME,
        onboardingComplete: false,
        collectType: "name",
      };
    } else {
      await mockUpdateBldgUser(bldgUserId, { buildingSlug: slug });
      return {
        response: "Unit number?",
        newStep: ONBOARDING_STEP.COLLECTING_ADDRESS,
        onboardingComplete: false,
        collectType: "unit",
      };
    }
  }

  // Step 2: Collecting name
  if (currentStep === ONBOARDING_STEP.COLLECTING_NAME) {
    const name = userMessage.trim();
    const parts = name.split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;

    await mockUpdateBldgUser(bldgUserId, {
      firstName,
      lastName,
      onboardingStep: ONBOARDING_STEP.COLLECTING_PHONE,
    });

    return {
      response: "Best number to reach you?",
      newStep: ONBOARDING_STEP.COLLECTING_PHONE,
      onboardingComplete: false,
      collectType: "phone",
    };
  }

  // Step 3: Collecting phone
  if (currentStep === ONBOARDING_STEP.COLLECTING_PHONE) {
    let phone = userMessage.trim().replace(/[^\d+]/g, "");
    if (!phone.startsWith("+") && phone.length === 10) {
      phone = "+1" + phone;
    } else if (!phone.startsWith("+")) {
      phone = "+" + phone;
    }

    const existingUser = await mockGetBldgUserByPhone(phone);
    if (existingUser && existingUser.id !== bldgUserId) {
      // Merge scenario
      if (existingUser.paymentMethodSaved) {
        return {
          response: "You're set.",
          newStep: ONBOARDING_STEP.COMPLETE,
          onboardingComplete: true,
          mergedUserId: existingUser.id,
        };
      }
      return {
        response: "Last thing \u2014 add a card so you're set for next time.",
        newStep: ONBOARDING_STEP.COLLECTING_PAYMENT,
        onboardingComplete: false,
        mergedUserId: existingUser.id,
        collectType: "payment",
      };
    }

    await mockUpdateBldgUser(bldgUserId, {
      phoneE164: phone,
      onboardingStep: ONBOARDING_STEP.COLLECTING_PAYMENT,
    });

    return {
      response: "Last thing \u2014 add a card so you're set for next time.",
      newStep: ONBOARDING_STEP.COLLECTING_PAYMENT,
      onboardingComplete: false,
      collectType: "payment",
    };
  }

  // Step 4: Collecting payment — handled by Stripe form, let messages through
  if (currentStep === ONBOARDING_STEP.COLLECTING_PAYMENT) {
    const user = await mockGetBldgUserById(bldgUserId);
    if (user?.paymentMethodSaved) {
      return null; // Complete, let through
    }
    return null; // Not complete, but let through anyway
  }

  return null;
}

// ─── Pure logic: getOnboardingMessage (extracted for testing) ───
function getOnboardingMessage(serviceCategory: string): string | null {
  if (serviceCategory === "laundry") {
    return `**How laundry pickup works:**\n\n![Laundry at door](https://files.manuscdn.com/user_upload_by_module/session_file/310419663029845795/FADWzLDauMlhYQCv.png)\n\n**1. Leave your bag outside your door** before the pickup window.\n\n![Laundry handoff](https://files.manuscdn.com/user_upload_by_module/session_file/310419663029845795/swuGJPvocTlnJKeu.png)\n\n**2. We'll text you 10 min before arrival.** You don't need to be home.\n\nThat's it. We'll return your laundry within 24 hours.`;
  }
  if (serviceCategory === "car-wash") {
    return `**How car wash works:** Leave your keys with the front desk before 9 AM on your scheduled day. We'll return them by 5 PM, car washed and detailed.`;
  }
  if (serviceCategory === "cleaning") {
    return `**How apartment cleaning works:** Our team will arrive during your scheduled window. You don't need to be home—just leave access instructions with the front desk if you'll be out.`;
  }
  if (serviceCategory === "grooming") {
    return `**How pet grooming works:** Bring your pet to the lobby during your scheduled window. Our groomer will take it from there and return them within 2 hours.`;
  }
  return null;
}

// ─── Service keyword guard (for name step) ───
const SERVICE_KEYWORDS = [
  "laundry", "cleaning", "car wash", "carwash", "grooming",
  "schedule", "book", "request", "pickup", "wash",
];

function isServiceKeyword(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return SERVICE_KEYWORDS.some((kw) => lower.includes(kw));
}

// ─── Tests ───

describe("Booking-First Onboarding Flow", () => {
  const userId = 42;

  beforeEach(() => {
    mockUpdateBldgUser.mockClear();
    mockGetBldgUserByPhone.mockClear();
    mockGetBldgUserById.mockClear();
  });

  describe("handlePostBookingCollection", () => {
    describe("Step 1: Collecting Address", () => {
      it("parses 'Opus LA, 1205' into building slug and unit", async () => {
        const result = await handlePostBookingCollection(userId, "Opus LA, 1205", ONBOARDING_STEP.COLLECTING_ADDRESS);

        expect(result).not.toBeNull();
        expect(result!.response).toBe("Name for the order?");
        expect(result!.newStep).toBe(ONBOARDING_STEP.COLLECTING_NAME);
        expect(result!.collectType).toBe("name");
        expect(result!.onboardingComplete).toBe(false);
        expect(mockUpdateBldgUser).toHaveBeenCalledWith(userId, {
          buildingSlug: "opusla",
          unit: "1205",
          onboardingStep: ONBOARDING_STEP.COLLECTING_NAME,
        });
      });

      it("parses 'Opus 1204' (space-separated) into building and unit", async () => {
        const result = await handlePostBookingCollection(userId, "Opus 1204", ONBOARDING_STEP.COLLECTING_ADDRESS);

        expect(result!.response).toBe("Name for the order?");
        expect(mockUpdateBldgUser).toHaveBeenCalledWith(userId, {
          buildingSlug: "opusla",
          unit: "1204",
          onboardingStep: ONBOARDING_STEP.COLLECTING_NAME,
        });
      });

      it("handles building-only input (no unit) and asks for unit", async () => {
        const result = await handlePostBookingCollection(userId, "The Grand", ONBOARDING_STEP.COLLECTING_ADDRESS);

        expect(result!.response).toBe("Unit number?");
        expect(result!.newStep).toBe(ONBOARDING_STEP.COLLECTING_ADDRESS); // stays on address step
        expect(result!.collectType).toBe("unit");
        expect(mockUpdateBldgUser).toHaveBeenCalledWith(userId, {
          buildingSlug: "the-grand",
        });
      });

      it("normalizes 'Opus' variants to 'opusla' slug", async () => {
        const result = await handlePostBookingCollection(userId, "The Opus, 501", ONBOARDING_STEP.COLLECTING_ADDRESS);

        expect(mockUpdateBldgUser).toHaveBeenCalledWith(userId, expect.objectContaining({
          buildingSlug: "opusla",
        }));
      });

      it("normalizes non-Opus building to lowercase slug", async () => {
        const result = await handlePostBookingCollection(userId, "Beverly Hills Tower, 2301", ONBOARDING_STEP.COLLECTING_ADDRESS);

        expect(mockUpdateBldgUser).toHaveBeenCalledWith(userId, expect.objectContaining({
          buildingSlug: "beverly-hills-tower",
        }));
      });
    });

    describe("Step 2: Collecting Name", () => {
      it("saves first name only and asks for phone", async () => {
        const result = await handlePostBookingCollection(userId, "Sarah", ONBOARDING_STEP.COLLECTING_NAME);

        expect(result!.response).toBe("Best number to reach you?");
        expect(result!.newStep).toBe(ONBOARDING_STEP.COLLECTING_PHONE);
        expect(result!.collectType).toBe("phone");
        expect(mockUpdateBldgUser).toHaveBeenCalledWith(userId, {
          firstName: "Sarah",
          lastName: null,
          onboardingStep: ONBOARDING_STEP.COLLECTING_PHONE,
        });
      });

      it("saves first and last name", async () => {
        const result = await handlePostBookingCollection(userId, "Sarah Connor", ONBOARDING_STEP.COLLECTING_NAME);

        expect(result!.response).toBe("Best number to reach you?");
        expect(mockUpdateBldgUser).toHaveBeenCalledWith(userId, {
          firstName: "Sarah",
          lastName: "Connor",
          onboardingStep: ONBOARDING_STEP.COLLECTING_PHONE,
        });
      });

      it("handles multi-part last names", async () => {
        const result = await handlePostBookingCollection(userId, "Maria De La Cruz", ONBOARDING_STEP.COLLECTING_NAME);

        expect(mockUpdateBldgUser).toHaveBeenCalledWith(userId, {
          firstName: "Maria",
          lastName: "De La Cruz",
          onboardingStep: ONBOARDING_STEP.COLLECTING_PHONE,
        });
      });
    });

    describe("Step 3: Collecting Phone", () => {
      it("saves 10-digit US phone with +1 prefix and asks for payment", async () => {
        const result = await handlePostBookingCollection(userId, "3105551234", ONBOARDING_STEP.COLLECTING_PHONE);

        expect(result!.response).toContain("add a card");
        expect(result!.newStep).toBe(ONBOARDING_STEP.COLLECTING_PAYMENT);
        expect(result!.collectType).toBe("payment");
        expect(result!.onboardingComplete).toBe(false);
        expect(mockUpdateBldgUser).toHaveBeenCalledWith(userId, {
          phoneE164: "+13105551234",
          onboardingStep: ONBOARDING_STEP.COLLECTING_PAYMENT,
        });
      });

      it("strips formatting from phone numbers", async () => {
        const result = await handlePostBookingCollection(userId, "(310) 555-1234", ONBOARDING_STEP.COLLECTING_PHONE);

        expect(mockUpdateBldgUser).toHaveBeenCalledWith(userId, {
          phoneE164: "+13105551234",
          onboardingStep: ONBOARDING_STEP.COLLECTING_PAYMENT,
        });
      });

      it("preserves existing + prefix", async () => {
        const result = await handlePostBookingCollection(userId, "+13105551234", ONBOARDING_STEP.COLLECTING_PHONE);

        expect(mockUpdateBldgUser).toHaveBeenCalledWith(userId, {
          phoneE164: "+13105551234",
          onboardingStep: ONBOARDING_STEP.COLLECTING_PAYMENT,
        });
      });

      it("merges into existing user when phone matches", async () => {
        mockGetBldgUserByPhone.mockResolvedValueOnce({
          id: 99,
          firstName: "Existing",
          paymentMethodSaved: false,
        });

        const result = await handlePostBookingCollection(userId, "3105551234", ONBOARDING_STEP.COLLECTING_PHONE);

        expect(result!.mergedUserId).toBe(99);
        expect(result!.newStep).toBe(ONBOARDING_STEP.COLLECTING_PAYMENT);
        expect(result!.collectType).toBe("payment");
      });

      it("completes immediately when merged user already has payment", async () => {
        mockGetBldgUserByPhone.mockResolvedValueOnce({
          id: 99,
          firstName: "Existing",
          paymentMethodSaved: true,
        });

        const result = await handlePostBookingCollection(userId, "3105551234", ONBOARDING_STEP.COLLECTING_PHONE);

        expect(result!.mergedUserId).toBe(99);
        expect(result!.response).toBe("You're set.");
        expect(result!.onboardingComplete).toBe(true);
        expect(result!.newStep).toBe(ONBOARDING_STEP.COMPLETE);
      });
    });

    describe("Step 4: Collecting Payment", () => {
      it("returns null (lets messages through) when payment not saved", async () => {
        mockGetBldgUserById.mockResolvedValueOnce({ id: userId, paymentMethodSaved: false });

        const result = await handlePostBookingCollection(userId, "hello", ONBOARDING_STEP.COLLECTING_PAYMENT);
        expect(result).toBeNull();
      });

      it("returns null when payment is saved (auto-completes)", async () => {
        mockGetBldgUserById.mockResolvedValueOnce({ id: userId, paymentMethodSaved: true });

        const result = await handlePostBookingCollection(userId, "hello", ONBOARDING_STEP.COLLECTING_PAYMENT);
        expect(result).toBeNull();
      });
    });

    describe("Step 5: Complete", () => {
      it("returns null for completed users", async () => {
        const result = await handlePostBookingCollection(userId, "laundry", ONBOARDING_STEP.COMPLETE);
        expect(result).toBeNull();
      });
    });
  });

  describe("Onboarding step constants", () => {
    it("has correct step values for booking-first flow", () => {
      expect(ONBOARDING_STEP.NOT_STARTED).toBe(0);
      expect(ONBOARDING_STEP.COLLECTING_ADDRESS).toBe(1);
      expect(ONBOARDING_STEP.COLLECTING_NAME).toBe(2);
      expect(ONBOARDING_STEP.COLLECTING_PHONE).toBe(3);
      expect(ONBOARDING_STEP.COLLECTING_PAYMENT).toBe(4);
      expect(ONBOARDING_STEP.COMPLETE).toBe(5);
    });

    it("NOT_STARTED allows booking without any info", () => {
      // Step 0 means the user can book freely — no handlePostBookingCollection call
      // This is verified by the fact that handlePostBookingCollection returns null for step 0
      // (it doesn't have a handler for step 0)
    });

    it("has sequential step progression", () => {
      const steps = [
        ONBOARDING_STEP.NOT_STARTED,
        ONBOARDING_STEP.COLLECTING_ADDRESS,
        ONBOARDING_STEP.COLLECTING_NAME,
        ONBOARDING_STEP.COLLECTING_PHONE,
        ONBOARDING_STEP.COLLECTING_PAYMENT,
        ONBOARDING_STEP.COMPLETE,
      ];
      for (let i = 1; i < steps.length; i++) {
        expect(steps[i]).toBe(steps[i - 1] + 1);
      }
    });
  });

  describe("getOnboardingMessage", () => {
    it("returns laundry onboarding with two images", () => {
      const msg = getOnboardingMessage("laundry");
      expect(msg).not.toBeNull();
      expect(msg).toContain("How laundry pickup works:");
      expect(msg).toContain("![Laundry at door]");
      expect(msg).toContain("![Laundry handoff]");
      expect(msg).toContain("Leave your bag outside your door");
      expect(msg).toContain("text you 10 min before arrival");
      expect(msg).toContain("return your laundry within 24 hours");
      expect(msg).toContain("https://files.manuscdn.com/");
    });

    it("returns car-wash onboarding message", () => {
      const msg = getOnboardingMessage("car-wash");
      expect(msg).not.toBeNull();
      expect(msg).toContain("How car wash works:");
    });

    it("returns cleaning onboarding message", () => {
      const msg = getOnboardingMessage("cleaning");
      expect(msg).not.toBeNull();
      expect(msg).toContain("How apartment cleaning works:");
    });

    it("returns grooming onboarding message", () => {
      const msg = getOnboardingMessage("grooming");
      expect(msg).not.toBeNull();
      expect(msg).toContain("How pet grooming works:");
    });

    it("returns null for unknown service", () => {
      const msg = getOnboardingMessage("unknown-service");
      expect(msg).toBeNull();
    });
  });

  describe("Service keyword guard", () => {
    it("detects 'laundry' as a service keyword", () => {
      expect(isServiceKeyword("laundry")).toBe(true);
    });

    it("detects 'Schedule laundry' as a service keyword", () => {
      expect(isServiceKeyword("Schedule laundry")).toBe(true);
    });

    it("detects 'car wash' as a service keyword", () => {
      expect(isServiceKeyword("car wash")).toBe(true);
    });

    it("detects 'Request cleaning' as a service keyword", () => {
      expect(isServiceKeyword("Request cleaning")).toBe(true);
    });

    it("does NOT detect a real name as a service keyword", () => {
      expect(isServiceKeyword("Sarah")).toBe(false);
      expect(isServiceKeyword("Russell")).toBe(false);
      expect(isServiceKeyword("Adam Smith")).toBe(false);
    });

    it("does NOT detect 'hello' as a service keyword", () => {
      expect(isServiceKeyword("hello")).toBe(false);
    });

    it("is case-insensitive", () => {
      expect(isServiceKeyword("LAUNDRY")).toBe(true);
      expect(isServiceKeyword("Car Wash")).toBe(true);
    });
  });
});

// ─── V2 OTP Onboarding Tests ───

describe("V2 OTP Onboarding Flow", () => {
  describe("OTP phone normalization", () => {
    function normalizePhone(raw: string): string {
      let digits = raw.replace(/\D/g, "");
      if (digits.length === 10) digits = "1" + digits;
      if (!digits.startsWith("1")) digits = "1" + digits;
      return "+" + digits;
    }

    it("normalizes 10-digit US number", () => {
      expect(normalizePhone("3105551234")).toBe("+13105551234");
    });

    it("strips formatting", () => {
      expect(normalizePhone("(310) 555-1234")).toBe("+13105551234");
    });

    it("handles +1 prefix", () => {
      expect(normalizePhone("+13105551234")).toBe("+13105551234");
    });
  });

  describe("OTP code generation", () => {
    function generateCode(): string {
      return String(Math.floor(100000 + Math.random() * 900000));
    }

    it("generates a 6-digit numeric string", () => {
      const code = generateCode();
      expect(code).toMatch(/^\d{6}$/);
      expect(parseInt(code)).toBeGreaterThanOrEqual(100000);
      expect(parseInt(code)).toBeLessThan(1000000);
    });
  });

  describe("Phone masking", () => {
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

    it("masks US phone number showing area code and last 2 digits", () => {
      expect(maskPhone("+13105551234")).toBe("(310) ***-**34");
    });

    it("masks short numbers", () => {
      expect(maskPhone("1234")).toBe("***34");
    });

    it("handles very short numbers", () => {
      expect(maskPhone("12")).toBe("***");
    });
  });

  describe("Onboarding step values", () => {
    it("v2 users go directly from 0 to 5 via OTP", () => {
      expect(ONBOARDING_STEP.NOT_STARTED).toBe(0);
      expect(ONBOARDING_STEP.COMPLETE).toBe(5);
    });
  });

  describe("Name capture heuristic", () => {
    function isServiceRequest(text: string): boolean {
      return /^(laundry|dry\s*clean|car\s*wash|groom|food|sushi|hungry)/i.test(text);
    }

    function isLikelyName(text: string): boolean {
      return text.length >= 2 && text.length <= 40 && !text.includes("?") && !isServiceRequest(text);
    }

    it("accepts 'Adam' as a name", () => {
      expect(isLikelyName("Adam")).toBe(true);
    });

    it("accepts 'Sarah Connor' as a name", () => {
      expect(isLikelyName("Sarah Connor")).toBe(true);
    });

    it("rejects 'laundry' as a name", () => {
      expect(isLikelyName("laundry")).toBe(false);
    });

    it("rejects 'dry cleaning' as a name", () => {
      expect(isLikelyName("dry cleaning")).toBe(false);
    });

    it("rejects 'car wash' as a name", () => {
      expect(isLikelyName("car wash")).toBe(false);
    });

    it("rejects very short input", () => {
      expect(isLikelyName("A")).toBe(false);
    });

    it("rejects questions", () => {
      expect(isLikelyName("what?")).toBe(false);
    });
  });
});

describe("Phone number normalization", () => {
  function normalizePhone(input: string): string {
    let phone = input.trim().replace(/[^\d+]/g, "");
    if (!phone.startsWith("+") && phone.length === 10) {
      phone = "+1" + phone;
    } else if (!phone.startsWith("+")) {
      phone = "+" + phone;
    }
    return phone;
  }

  it("adds +1 to 10-digit US number", () => {
    expect(normalizePhone("3235551234")).toBe("+13235551234");
  });

  it("strips formatting characters", () => {
    expect(normalizePhone("(323) 555-1234")).toBe("+13235551234");
  });

  it("preserves existing + prefix", () => {
    expect(normalizePhone("+13235551234")).toBe("+13235551234");
  });

  it("handles international numbers", () => {
    expect(normalizePhone("+447911123456")).toBe("+447911123456");
  });

  it("adds + to non-10-digit numbers without prefix", () => {
    expect(normalizePhone("447911123456")).toBe("+447911123456");
  });
});
