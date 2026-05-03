import {
  createServiceRequest,
  getBldgUserById,
  insertChatMessage,
  updateBldgUser,
  updateServiceRequest,
} from "../db";
import type { BldgUser } from "../../drizzle/schema";
import { findDuplicateBooking, getBookingDefaults } from "../bookingLogic";
import { parseExplicitDateTime } from "../lib/dateParser";
import { resolveIntakeBuildingKey, getAddressForIntakeKey } from "../../shared/intakeBuilding";
import { needsCriticalProfileRecovery } from "../../shared/profileCritical";
import { inferResidentIntent, isFutureVendorServiceIntent } from "./intentClassifier";
import {
  createAdminAgentClient,
  postToAdminIntakeFallbackAndVerify,
  shouldUseIntakeFallbackForAgentFailure,
  shouldTryNextIntakeBaseUrl,
  type LaundryOrderToolInput,
} from "./residentAgentClient";
import { getAdminIntakeApiBaseUrlCandidates, hasAdminIntakeSharedSecret } from "./adminIntakeConfig";
import {
  getOrCreateResidentAgentSession,
  withResidentAgentMetadata,
  type ResidentAgentSession,
} from "./session";

const INTAKE_FAILURE_MESSAGE =
  "Your request did not go through. Please try again in a moment.";

function parseDisplayDateToISO(displayDate: string): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const match = displayDate.match(/([A-Za-z]+),\s+([A-Za-z]+)\s+(\d+)/);
  if (!match) return displayDate;

  const [, , monthStr, dayStr] = match;
  const monthMap: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };

  const month = monthMap[monthStr];
  const day = parseInt(dayStr, 10);
  if (month === undefined || isNaN(day)) return displayDate;

  const date = new Date(currentYear, month, day);
  const todayAtMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date < todayAtMidnight) date.setFullYear(currentYear + 1);

  return date.toISOString().split("T")[0];
}

function detectSameDay(text: string): boolean {
  return /same[\s-]?day/i.test(text);
}

function splitPickupWindow(window: string): {
  pickupWindowStart: string;
  pickupWindowEnd: string;
} {
  const windowParts = window.match(/(\d+(?::\d+)?)\s*[–\-]\s*(\d+(?::\d+)?)\s*(AM|PM)?/i);
  return {
    pickupWindowStart: windowParts ? `${windowParts[1]} ${windowParts[3] || "AM"}`.trim() : window,
    pickupWindowEnd: windowParts ? `${windowParts[2]} ${windowParts[3] || "AM"}`.trim() : window,
  };
}

export interface ResidentAgentResponse {
  handled: boolean;
  role?: "assistant";
  content?: string;
  booking?: {
    serviceRequestId: number | null;
    service: string;
    date: string;
    window: string;
    recurrence: string | null;
  } | null;
}

export async function runResidentAgent(input: {
  bldgUserId: number;
  content: string;
  user: BldgUser;
}): Promise<ResidentAgentResponse> {
  const intent = inferResidentIntent(input.content);
  const session = await getOrCreateResidentAgentSession(input.bldgUserId);

  if (intent.type === "laundry") {
    return executeLaundryIntent({
      bldgUserId: input.bldgUserId,
      content: input.content,
      user: input.user,
      session,
    });
  }

  if (
    intent.type === "cleaning-request" ||
    intent.type === "guest-preparation-request" ||
    intent.type === "market-move-opt-in-interest-profile"
  ) {
    const content = "I can request that and confirm once the provider accepts.";
    await insertChatMessage({
      bldgUserId: input.bldgUserId,
      role: "assistant",
      content,
      metadata: withResidentAgentMetadata(session, {
        type: "request-pending-vendor-confirmation",
        intent: intent.type,
      }),
    });
    return {
      handled: true,
      role: "assistant",
      content,
      booking: null,
    };
  }

  if (isFutureVendorServiceIntent(intent)) {
    return { handled: false };
  }

  return { handled: false };
}

async function executeLaundryIntent(input: {
  bldgUserId: number;
  content: string;
  user: BldgUser;
  session: ResidentAgentSession;
}): Promise<ResidentAgentResponse> {
  console.log("[ResidentAgent] laundry intent matched");
  const dateTimeIntent = parseExplicitDateTime(input.content);
  const defaults = await getBookingDefaults(
    input.bldgUserId,
    "laundry",
    dateTimeIntent.dateOverride,
    dateTimeIntent.windowOverride
  );
  const freshUser = await getBldgUserById(input.bldgUserId);

  if (needsCriticalProfileRecovery(freshUser)) {
    const existingPending = (freshUser as any)?.pendingBookingIntentJson as
      | { serviceType?: string; date?: string; window?: string; recurrence?: string }
      | null;
    if (existingPending?.serviceType === "laundry") {
      const confirmText = `Laundry booked for ${existingPending.date ?? defaults.date}, ${existingPending.window ?? defaults.window}.`;
      return {
        handled: true,
        role: "assistant",
        content: confirmText,
        booking: {
          serviceRequestId: 0,
          service: "Laundry",
          date: existingPending.date ?? defaults.date,
          window: existingPending.window ?? defaults.window,
          recurrence: existingPending.recurrence ?? defaults.recurrence,
        },
      };
    }

    const pendingIntent = {
      serviceType: "laundry",
      timeWindow: defaults.window,
      date: defaults.date,
      recurrence: defaults.recurrence,
      scheduled_start_utc: defaults.scheduled_start_utc,
      scheduled_end_utc: defaults.scheduled_end_utc,
      scheduled_start_local: defaults.scheduled_start_local,
      scheduled_end_local: defaults.scheduled_end_local,
      timezone: defaults.timezone,
    };
    await updateBldgUser(input.bldgUserId, {
      pendingBookingIntentJson: pendingIntent as any,
    } as any);

    const confirmText = `Laundry booked for ${defaults.date}, ${defaults.window}.`;
    await insertChatMessage({
      bldgUserId: input.bldgUserId,
      role: "assistant",
      content: confirmText,
      metadata: withResidentAgentMetadata(input.session, {
        type: "booking",
        tutorial: true,
        service: "Laundry",
        date: defaults.date,
        window: defaults.window,
        recurrence: defaults.recurrence,
      }),
    });

    return {
      handled: true,
      role: "assistant",
      content: confirmText,
      booking: {
        serviceRequestId: 0,
        service: "Laundry",
        date: defaults.date,
        window: defaults.window,
        recurrence: defaults.recurrence,
      },
    };
  }

  const duplicate = await findDuplicateBooking(input.bldgUserId, "laundry");
  let serviceRequestId: number | null = null;
  const userForIntake = freshUser ?? input.user;

  let sr: { id: number };
  if (duplicate) {
    sr = duplicate;
    serviceRequestId = duplicate.id;
    console.log(`[ResidentAgent] duplicate laundry booking detected; reusing #${duplicate.id}`);
  } else {
    sr = await createServiceRequest({
      bldgUserId: input.bldgUserId,
      serviceType: "laundry",
      status: "pending",
      requestSummary: `laundry — ${defaults.date} ${defaults.window}`,
      scheduledDate: defaults.date,
      scheduledWindow: defaults.window,
      scheduledStartUtc: defaults.scheduled_start_utc,
      scheduledEndUtc: defaults.scheduled_end_utc,
      scheduledStartLocal: defaults.scheduled_start_local,
      scheduledEndLocal: defaults.scheduled_end_local,
      timezone: defaults.timezone,
      requestJson: { recurrence: defaults.recurrence },
    });
    serviceRequestId = sr.id;
    console.log(`[ResidentAgent] local service_request created #${sr.id}: laundry`);
  }

  const sessionSlug = userForIntake?.buildingSlug || "";
  const intakeBuildingKey = resolveIntakeBuildingKey(sessionSlug);
  const address = getAddressForIntakeKey(intakeBuildingKey);
  const { pickupWindowStart, pickupWindowEnd } = splitPickupWindow(defaults.window);

  const intakePayload: LaundryOrderToolInput = {
    externalId: `bldg-sr-${sr.id}`,
    source: "bldg-resident",
    status: "new",
    serviceType: "wash_fold",
    pickupDate: parseDisplayDateToISO(defaults.date),
    pickupWindow: defaults.window,
    pickupWindowStart,
    pickupWindowEnd,
    address,
    buildingId: intakeBuildingKey || null,
    unit: userForIntake?.unit || null,
    firstName: (userForIntake?.firstName || "").trim(),
    lastName: ((userForIntake?.lastName ?? "") || "").trim(),
    phone: userForIntake?.phoneE164 || "",
    bldgUserId: input.bldgUserId ?? null,
    stripeCustomerId: userForIntake?.stripeCustomerId || null,
    stripePaymentMethodId: userForIntake?.stripePaymentMethodId || null,
    ...(detectSameDay(input.content) ? { specialInstructions: "Same-day requested." } : {}),
  };

  const adminAgentClient = createAdminAgentClient();
  const runIntakeFallback = async (fallbackReason: string) => {
    console.warn(`[ResidentAgent] using intake fallback: reason=${fallbackReason}`);
    const sharedSecret = process.env.APP_SHARED_API_SECRET || "";
    if (!hasAdminIntakeSharedSecret()) {
      console.warn("[ResidentAgent] APP_SHARED_API_SECRET is missing; admin intake will reject fallback");
    }

    let lastResult = null as Awaited<ReturnType<typeof postToAdminIntakeFallbackAndVerify>> | null;
    for (const adminApiUrl of getAdminIntakeApiBaseUrlCandidates()) {
      const result = await postToAdminIntakeFallbackAndVerify(
        adminApiUrl,
        sharedSecret,
        intakePayload,
        "ResidentAgent"
      );
      if (result.success || !shouldTryNextIntakeBaseUrl(result)) {
        return result;
      }
      lastResult = result;
      console.warn(
        `[ResidentAgent] intake route unavailable at ${adminApiUrl}; trying next configured intake base`
      );
    }

    return lastResult ?? {
      success: false,
      reason: "no_admin_intake_base_url",
      path: "intake-fallback" as const,
    };
  };

  let executionResult;
  if (adminAgentClient.canRunLaundryOrderTool()) {
    const agentExecutionResult = await adminAgentClient.runCreateLaundryOrderTool(
      intakePayload,
      input.session
    );
    if (agentExecutionResult.success) {
      executionResult = agentExecutionResult;
    } else if (shouldUseIntakeFallbackForAgentFailure(agentExecutionResult)) {
      executionResult = await runIntakeFallback(`admin_agent_unavailable:${agentExecutionResult.reason}`);
    } else {
      executionResult = agentExecutionResult;
    }
  } else {
    // TODO(admin): add a shared-secret server-to-server admin agent endpoint for
    // createLaundryOrderTool. Do not call protected admin tRPC from resident.
    executionResult = await runIntakeFallback("no_safe_admin_agent_s2s_endpoint");
  }

  if (!executionResult.success) {
    console.warn(`[ResidentAgent] admin execution failed: reason=${executionResult.reason}`);
    await insertChatMessage({
      bldgUserId: input.bldgUserId,
      role: "assistant",
      content: INTAKE_FAILURE_MESSAGE,
      metadata: withResidentAgentMetadata(input.session, {
        type: "booking_error",
        service: "Laundry",
        reason: executionResult.reason,
      }),
    });
    return {
      handled: true,
      role: "assistant",
      content: INTAKE_FAILURE_MESSAGE,
      booking: null,
    };
  }

  await updateServiceRequest(sr.id, { orderId: executionResult.orderId });
  console.log(`[ResidentAgent] stored orderId=${executionResult.orderId} on service_request #${sr.id}`);

  const confirmText = `Laundry booked for ${defaults.date}, ${defaults.window}.`;
  await insertChatMessage({
    bldgUserId: input.bldgUserId,
    role: "assistant",
    content: confirmText,
    metadata: withResidentAgentMetadata(input.session, {
      type: "booking",
      serviceRequestId,
      service: "Laundry",
      date: defaults.date,
      window: defaults.window,
      recurrence: defaults.recurrence,
      orderId: executionResult.orderId,
      adminExecutionPath: executionResult.path,
    }),
  });

  return {
    handled: true,
    role: "assistant",
    content: confirmText,
    booking: {
      serviceRequestId,
      service: "Laundry",
      date: defaults.date,
      window: defaults.window,
      recurrence: defaults.recurrence,
    },
  };
}
