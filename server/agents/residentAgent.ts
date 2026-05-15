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
  planResidentMultiIntents,
  type ResidentPlannedIntent,
  type ResidentMultiIntentType,
} from "./residentMultiIntentPlanner";
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
  metadata?: Record<string, unknown>;
  booking?: {
    serviceRequestId: number | null;
    service: string;
    date: string;
    window: string;
    recurrence: string | null;
    orderId?: number | null;
  } | null;
}

export async function runResidentAgent(input: {
  bldgUserId: number;
  content: string;
  user: BldgUser;
}): Promise<ResidentAgentResponse> {
  const currentDate = new Date().toISOString().slice(0, 10);
  const multiIntentPlan = planResidentMultiIntents({
    content: input.content,
    currentDate,
    buildingSlug: input.user?.buildingSlug ?? null,
    unit: input.user?.unit ?? null,
  });
  const intent = inferResidentIntent(input.content);
  const session = await getOrCreateResidentAgentSession(input.bldgUserId);

  if (multiIntentPlan.intents.length > 1) {
    return executeMultiIntentPlan({
      bldgUserId: input.bldgUserId,
      content: input.content,
      user: input.user,
      session,
      intents: multiIntentPlan.intents,
    });
  }

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
  suppressAssistantMessage?: boolean;
}): Promise<ResidentAgentResponse> {
  console.log("[ResidentAgent] laundry intent matched");
  const dateTimeIntent = parseExplicitDateTime(input.content);
  const windowOverride =
    dateTimeIntent.dateOverride && !dateTimeIntent.windowOverride
      ? "7–10 AM"
      : dateTimeIntent.windowOverride;
  const defaults = await getBookingDefaults(
    input.bldgUserId,
    "laundry",
    dateTimeIntent.dateOverride,
    windowOverride
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
          orderId: null,
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
    if (!input.suppressAssistantMessage) {
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
    }

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
        orderId: null,
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
    console.log("[ResidentAgent] attempting admin agent S2S createLaundryOrderTool");
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
    if (!input.suppressAssistantMessage) {
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
    }
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
  if (!input.suppressAssistantMessage) {
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
  }

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
      orderId: executionResult.orderId,
    },
  };
}

type PlanItemMetadata = {
  serviceCategory: ResidentMultiIntentType;
  title: string;
  status: string;
  residentVisibleStatus: string;
  date: string | null;
  window: string | null;
  deadlineDate: string | null;
  deadlineReason: string | null;
  requestId?: unknown;
  orderId?: unknown;
  nextAction: string | null;
};

async function executeMultiIntentPlan(input: {
  bldgUserId: number;
  content: string;
  user: BldgUser;
  session: ResidentAgentSession;
  intents: ResidentPlannedIntent[];
}): Promise<ResidentAgentResponse> {
  const adminAgentClient = createAdminAgentClient();
  const freshUser = (await getBldgUserById(input.bldgUserId)) ?? input.user;
  const residentName = [freshUser?.firstName, freshUser?.lastName].filter(Boolean).join(" ") || null;
  const canCoordinate = !needsCriticalProfileRecovery(freshUser);

  let planId: unknown = null;
  if (adminAgentClient.canRunLaundryOrderTool()) {
    const planResult = await adminAgentClient.runCreateResidentAgentPlanTool(
      {
        bldgUserId: input.bldgUserId,
        residentName,
        buildingSlug: freshUser?.buildingSlug ?? null,
        buildingName: freshUser?.buildingSlug ?? null,
        unit: freshUser?.unit ?? null,
        originalMessage: input.content,
        sourceConversationId: input.session.conversationId,
        sourceSessionId: input.session.sessionId,
        planJson: { originalMessage: input.content, intents: input.intents },
      },
      input.session
    );
    if (planResult.success) {
      planId = planResult.planId ?? null;
    } else {
      console.warn("[ResidentAgent] resident agent plan creation failed", planResult);
    }
  }

  const items: PlanItemMetadata[] = [];
  let booking: ResidentAgentResponse["booking"] = null;

  const executionIntents = [
    ...input.intents.filter((intent) => intent.type === "laundry"),
    ...input.intents.filter((intent) => intent.type !== "laundry"),
  ];

  for (const intent of executionIntents) {
    if (intent.type === "laundry") {
      const laundryResult = await executeLaundryIntent({
        bldgUserId: input.bldgUserId,
        content: intent.originalTextSpan,
        user: input.user,
        session: input.session,
        suppressAssistantMessage: true,
      });
      booking = laundryResult.booking ?? booking;
      items.push({
        serviceCategory: "laundry",
        title: "Laundry",
        status: laundryResult.booking ? "confirmed" : "failed",
        residentVisibleStatus: laundryResult.booking ? "confirmed" : "failed",
        date: laundryResult.booking?.date ?? intent.requestedDate ?? null,
        window: laundryResult.booking?.window ?? intent.requestedWindow ?? null,
        deadlineDate: intent.deadlineDate ?? null,
        deadlineReason: intent.deadlineReason ?? null,
        orderId: laundryResult.booking?.orderId ?? null,
        nextAction: laundryResult.booking ? null : "retry_laundry_booking",
      });
      continue;
    }

    if (!canCoordinate) {
      items.push({
        serviceCategory: intent.type,
        title: getServiceTitle(intent.type),
        status: "pending_profile_completion",
        residentVisibleStatus: "pending_profile_completion",
        date: intent.requestedDate ?? null,
        window: intent.requestedWindow ?? null,
        deadlineDate: intent.deadlineDate ?? null,
        deadlineReason: intent.deadlineReason ?? null,
        nextAction: "complete_resident_profile",
      });
      continue;
    }

    if (!planId) {
      items.push({
        serviceCategory: intent.type,
        title: getServiceTitle(intent.type),
        status: "failed",
        residentVisibleStatus: "failed",
        date: intent.requestedDate ?? null,
        window: intent.requestedWindow ?? null,
        deadlineDate: intent.deadlineDate ?? null,
        deadlineReason: intent.deadlineReason ?? null,
        nextAction: "operator_review_required",
      });
      continue;
    }

    const coordinatedResult = await adminAgentClient.runCreateResidentCoordinatedRequestTool(
      {
        bldgUserId: input.bldgUserId,
        residentName,
        residentPhone: freshUser?.phoneE164 ?? null,
        residentEmail: null,
        buildingSlug: freshUser?.buildingSlug ?? null,
        buildingName: freshUser?.buildingSlug ?? null,
        unit: freshUser?.unit ?? null,
        serviceCategory: intent.type,
        serviceRequested: intent.originalTextSpan,
        requestedDate: intent.requestedDate ?? null,
        requestedWindow: intent.requestedWindow ?? null,
        deadlineDate: intent.deadlineDate ?? null,
        deadlineReason: intent.deadlineReason ?? null,
        origin: intent.origin ?? null,
        destination: intent.destination ?? null,
        notes: intent.notes ?? null,
        sourceConversationId: input.session.conversationId,
        sourceSessionId: input.session.sessionId,
        parentPlanId: String(planId),
      },
      input.session
    );

    if (coordinatedResult.success) {
      const status = normalizeCoordinatedStatus(coordinatedResult.status);
      items.push({
        serviceCategory: intent.type,
        title: getServiceTitle(intent.type),
        status,
        residentVisibleStatus: String(coordinatedResult.residentVisibleStatus ?? status),
        date: intent.requestedDate ?? null,
        window: intent.requestedWindow ?? null,
        deadlineDate: intent.deadlineDate ?? null,
        deadlineReason: intent.deadlineReason ?? null,
        requestId: coordinatedResult.requestId,
        nextAction: String(coordinatedResult.nextAction ?? "provider_or_operator_confirmation"),
      });
    } else {
      console.warn("[ResidentAgent] coordinated request creation failed", {
        serviceCategory: intent.type,
        reason: coordinatedResult.reason,
        status: coordinatedResult.status,
      });
      items.push({
        serviceCategory: intent.type,
        title: getServiceTitle(intent.type),
        status: "failed",
        residentVisibleStatus: "failed",
        date: intent.requestedDate ?? null,
        window: intent.requestedWindow ?? null,
        deadlineDate: intent.deadlineDate ?? null,
        deadlineReason: intent.deadlineReason ?? null,
        nextAction: "operator_review_required",
      });
    }
  }

  const planStatus = getPlanStatus(items);
  const metadata = withResidentAgentMetadata(input.session, {
    type: "multi_service_plan",
    planId,
    originalMessage: input.content,
    items,
  });

  if (planId) {
    const updateResult = await adminAgentClient.runUpdateResidentAgentPlanTool(
      {
        planId,
        planStatus,
        planJson: {
          type: "multi_service_plan",
          originalMessage: input.content,
          items,
        },
      },
      input.session
    );
    if (!updateResult.success) {
      console.warn("[ResidentAgent] resident agent plan update failed", updateResult);
    }
  }

  const content = buildResidentPlanSummary(items);
  await insertChatMessage({
    bldgUserId: input.bldgUserId,
    role: "assistant",
    content,
    metadata,
  });

  return {
    handled: true,
    role: "assistant",
    content,
    metadata,
    booking,
  };
}

function normalizeCoordinatedStatus(status: unknown): string {
  const raw = typeof status === "string" ? status : "pending_operator_review";
  if (raw === "confirmed") return "confirmed";
  if (raw === "pending_provider_confirmation") return raw;
  if (raw === "pending_operator_review") return raw;
  if (raw === "failed" || raw === "cancelled" || raw === "completed") return raw;
  return "pending_operator_review";
}

function getPlanStatus(items: PlanItemMetadata[]): string {
  const hasConfirmed = items.some((item) => item.status === "confirmed");
  const hasPending = items.some((item) => item.status.startsWith("pending_"));
  const hasFailed = items.some((item) => item.status === "failed");
  if (hasConfirmed && (hasPending || hasFailed)) return "partially_confirmed";
  if (hasPending) return "pending_confirmation";
  if (hasConfirmed) return "completed";
  return "failed";
}

function buildResidentPlanSummary(items: PlanItemMetadata[]): string {
  const confirmed = items.filter((item) => item.status === "confirmed");
  const pending = items.filter((item) => item.status.startsWith("pending_"));
  const failed = items.filter((item) => item.status === "failed");
  const parts: string[] = [];

  for (const item of confirmed) {
    if (item.serviceCategory === "laundry") {
      parts.push(`Laundry is booked${item.date ? ` for ${item.date}` : ""}${item.window ? `, ${item.window}` : ""}.`);
    } else {
      parts.push(`${item.title} is confirmed${item.date ? ` for ${item.date}` : ""}.`);
    }
  }

  if (pending.length > 0) {
    const deadline = pending.find((item) => item.deadlineReason || item.deadlineDate);
    const label = joinLabels(pending.map((item) => item.title.toLowerCase()));
    const deadlineText = deadline?.deadlineReason
      ? ` before your ${deadline.deadlineReason.replace(/ visit$/, " arrives")}`
      : deadline?.deadlineDate
        ? ` before ${deadline.deadlineDate}`
        : "";
    parts.push(`${capitalize(label)} ${pending.length === 1 ? "is" : "are"} queued for confirmation${deadlineText}.`);
  }

  if (failed.length > 0) {
    const label = joinLabels(failed.map((item) => item.title.toLowerCase()));
    parts.push(`${capitalize(label)} ${failed.length === 1 ? "needs" : "need"} operator review before it can be queued.`);
  }

  return parts.join(" ");
}

function getServiceTitle(type: ResidentMultiIntentType): string {
  const titles: Record<ResidentMultiIntentType, string> = {
    laundry: "Laundry",
    dry_cleaning: "Dry cleaning",
    dog_grooming: "Grooming",
    car_detail: "Car detail",
    airport_transport: "LAX pickup",
    apartment_cleaning: "Apartment cleaning",
    other: "Request",
  };
  return titles[type];
}

function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function capitalize(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}
