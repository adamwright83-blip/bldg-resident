import {
  createServiceRequest,
  getBldgUserById,
  insertChatMessage,
  updateBldgUser,
  updateServiceRequest,
} from "../db";
import type { BldgUser } from "../../drizzle/schema";
import { findDuplicateBooking, getBookingDefaults } from "../bookingLogic";
import { getCurrentDateISOInLA, parseExplicitDateTime } from "../lib/dateParser";
import { resolveIntakeBuildingKey, getAddressForIntakeKey } from "../../shared/intakeBuilding";
import { getCriticalProfileGaps, needsCriticalProfileRecovery } from "../../shared/profileCritical";
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

  const year = date.getFullYear();
  const isoMonth = String(date.getMonth() + 1).padStart(2, "0");
  const isoDay = String(date.getDate()).padStart(2, "0");
  return `${year}-${isoMonth}-${isoDay}`;
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
  collectStep?: "name" | "payment";
  resumeWithPaymentAfterName?: boolean;
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
  const session = await getOrCreateResidentAgentSession(input.bldgUserId);
  const freshUser = (await getBldgUserById(input.bldgUserId)) ?? input.user;
  const pendingPlan = readPendingMultiServicePlan(freshUser);
  if (pendingPlan && !needsCriticalProfileRecovery(freshUser)) {
    await updateBldgUser(input.bldgUserId, { pendingBookingIntentJson: null } as any);
    return executeMultiIntentPlan({
      bldgUserId: input.bldgUserId,
      content: pendingPlan.originalMessage ?? input.content,
      user: freshUser,
      session,
      intents: pendingPlan.intents,
    });
  }

  const currentDate = getCurrentDateISOInLA();
  const multiIntentPlan = planResidentMultiIntents({
    content: input.content,
    currentDate,
    buildingSlug: freshUser?.buildingSlug ?? null,
    buildingName: normalizeBuildingName(freshUser?.buildingSlug ?? null),
    unit: freshUser?.unit ?? null,
  });
  const intent = inferResidentIntent(input.content);

  if (multiIntentPlan.intents.length > 1) {
    return executeMultiIntentPlan({
      bldgUserId: input.bldgUserId,
      content: input.content,
      user: freshUser,
      session,
      intents: multiIntentPlan.intents,
    });
  }

  if (intent.type === "laundry") {
    return executeLaundryIntent({
      bldgUserId: input.bldgUserId,
      content: input.content,
      user: freshUser,
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
  const dateTimeIntent = parseExplicitDateTime(input.content, getCurrentDateISOInLA());
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
    const profileGaps = getCriticalProfileGaps(freshUser);
    const collectStep =
      profileGaps.missingFirstName || profileGaps.missingLastName ? "name" : "payment";
    const recoveryContent =
      collectStep === "name"
        ? "I have the pickup ready. Add your name once, then I can set it in motion."
        : "I have the pickup ready. Add a card once, then I can set it in motion.";
    const existingPending = (freshUser as any)?.pendingBookingIntentJson as
      | { serviceType?: string; date?: string; window?: string; recurrence?: string }
      | null;
    if (existingPending?.serviceType === "laundry") {
      return {
        handled: true,
        role: "assistant",
        content: recoveryContent,
        collectStep,
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

    if (!input.suppressAssistantMessage) {
      await insertChatMessage({
        bldgUserId: input.bldgUserId,
        role: "assistant",
        content: recoveryContent,
        metadata: withResidentAgentMetadata(input.session, {
          type: "onboarding_collect",
          collectType: collectStep,
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
      content: recoveryContent,
      collectStep,
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
  origin?: string | null;
  destination?: string | null;
  nextAction: string | null;
  failureReason?: string | null;
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
  const profileGaps = getCriticalProfileGaps(freshUser);
  const hasBasicContext = Boolean(
    residentName &&
      freshUser?.phoneE164 &&
      freshUser?.buildingSlug &&
      freshUser?.unit
  );
  const needsBasicProfile = !hasBasicContext || profileGaps.missingFirstName || profileGaps.missingLastName;
  const needsPayment = profileGaps.missingPayment;

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

  if (needsBasicProfile) {
    await preservePendingMultiServicePlan(input, planId, "pending_basic_profile");
    for (const intent of executionIntents) {
      items.push({
        serviceCategory: intent.type,
        title: getServiceTitle(intent.type),
        status: "pending_profile_completion",
        residentVisibleStatus: "pending_profile_completion",
        date: intent.requestedDate ?? null,
        window: intent.requestedWindow ?? null,
        deadlineDate: intent.deadlineDate ?? null,
        deadlineReason: intent.deadlineReason ?? null,
        origin: intent.origin ?? null,
        destination: intent.destination ?? null,
        nextAction: "complete_resident_profile",
        failureReason: "pending_basic_profile",
      });
    }

    const metadata = withResidentAgentMetadata(input.session, {
      type: "multi_service_plan",
      planId,
      originalMessage: input.content,
      items,
      pendingPlanPreserved: true,
      statusSummary: buildStatusSummary(items),
    });
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
      booking: null,
      collectStep: profileGaps.missingFirstName || profileGaps.missingLastName ? "name" : undefined,
    };
  }

  if (needsPayment && executionIntents.some((intent) => intent.type === "laundry")) {
    await preservePendingMultiServicePlan(input, planId, "pending_payment_profile");
  }

  for (const intent of executionIntents) {
    if (intent.type === "laundry") {
      if (needsPayment) {
        logChildAction({
          serviceCategory: "laundry",
          toolName: "createLaundryOrderTool",
          success: false,
          orderId: null,
          parentPlanId: planId,
          failureReason: "pending_payment_profile",
        });
        items.push({
          serviceCategory: "laundry",
          title: "Laundry",
          status: "pending_profile_completion",
          residentVisibleStatus: "pending_profile_completion",
          date: intent.requestedDate ?? null,
          window: intent.requestedWindow ?? null,
          deadlineDate: intent.deadlineDate ?? null,
          deadlineReason: intent.deadlineReason ?? null,
          orderId: null,
          origin: null,
          destination: null,
          nextAction: "complete_payment_profile",
          failureReason: "pending_payment_profile",
        });
        continue;
      }

      const laundryResult = await executeLaundryIntent({
        bldgUserId: input.bldgUserId,
        content: intent.originalTextSpan,
        user: input.user,
        session: input.session,
        suppressAssistantMessage: true,
      });
      const laundryConfirmed = hasAdminOrderId(laundryResult.booking?.orderId);
      if (laundryConfirmed) booking = laundryResult.booking ?? booking;
      const status = laundryConfirmed
        ? "confirmed"
        : laundryResult.booking?.serviceRequestId === 0
          ? "pending_profile_completion"
          : "failed";
      logChildAction({
        serviceCategory: "laundry",
        toolName: "createLaundryOrderTool",
        success: laundryConfirmed,
        orderId: laundryResult.booking?.orderId ?? null,
        parentPlanId: planId,
        failureReason: laundryConfirmed ? null : "missing_orderId_or_admin_execution_failed",
      });
      items.push({
        serviceCategory: "laundry",
        title: "Laundry",
        status,
        residentVisibleStatus: status,
        date: laundryResult.booking?.date ?? intent.requestedDate ?? null,
        window: laundryResult.booking?.window ?? intent.requestedWindow ?? null,
        deadlineDate: intent.deadlineDate ?? null,
        deadlineReason: intent.deadlineReason ?? null,
        orderId: laundryResult.booking?.orderId ?? null,
        origin: null,
        destination: null,
        nextAction: laundryConfirmed
          ? null
          : status === "pending_profile_completion"
            ? "complete_resident_profile"
            : "operator_review_required",
        failureReason: laundryConfirmed
          ? null
          : status === "pending_profile_completion"
            ? "pending_profile_completion"
            : "missing_orderId_or_admin_execution_failed",
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
        origin: intent.origin ?? null,
        destination: intent.destination ?? null,
        nextAction: "operator_review_required",
        failureReason: "missing_parent_planId",
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

    logChildAction({
      serviceCategory: intent.type,
      toolName: "createResidentCoordinatedRequestTool",
      success: coordinatedResult.success,
      requestId: coordinatedResult.success ? coordinatedResult.requestId : null,
      parentPlanId: planId,
      failureReason: coordinatedResult.success ? null : coordinatedResult.reason,
    });

    if (coordinatedResult.success) {
      const status = normalizeCoordinatedStatus(coordinatedResult.status);
      if (status) {
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
          origin: intent.origin ?? null,
          destination: intent.destination ?? null,
          nextAction: String(coordinatedResult.nextAction ?? "provider_or_operator_confirmation"),
          failureReason: null,
        });
      } else {
        console.warn("[ResidentAgent] coordinated request returned invalid status", {
          serviceCategory: intent.type,
          requestId: coordinatedResult.requestId,
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
          requestId: coordinatedResult.requestId,
          origin: intent.origin ?? null,
          destination: intent.destination ?? null,
          nextAction: "operator_review_required",
          failureReason: "invalid_or_missing_status",
        });
      }
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
        origin: intent.origin ?? null,
        destination: intent.destination ?? null,
        nextAction: "operator_review_required",
        failureReason: coordinatedResult.reason,
      });
    }
  }

  const planStatus = getPlanStatus(items);
  const metadata = withResidentAgentMetadata(input.session, {
    type: "multi_service_plan",
    planId,
    originalMessage: input.content,
    items,
    statusSummary: buildStatusSummary(items),
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
    collectStep: items.some((item) => item.failureReason === "pending_payment_profile")
      ? "payment"
      : undefined,
  };
}

function normalizeCoordinatedStatus(status: unknown): string | null {
  const raw = typeof status === "string" ? status : "";
  if (raw === "confirmed") return "confirmed";
  if (raw === "pending_provider_confirmation") return raw;
  if (raw === "pending_operator_review") return raw;
  if (raw === "failed" || raw === "cancelled" || raw === "completed") return raw;
  return null;
}

function hasAdminOrderId(orderId: unknown): boolean {
  return orderId != null && Number.isFinite(Number(orderId));
}

function normalizeBuildingName(buildingSlug: string | null): string | null {
  if (!buildingSlug) return null;
  if (/^opus(?:la|-la)?$/i.test(buildingSlug)) return "Opus LA";
  return buildingSlug;
}

function readPendingMultiServicePlan(user: BldgUser | null | undefined): {
  originalMessage?: string;
  intents: ResidentPlannedIntent[];
} | null {
  const pending = (user as any)?.pendingBookingIntentJson;
  if (
    pending &&
    pending.type === "multi_service_plan" &&
    Array.isArray(pending.intents)
  ) {
    return {
      originalMessage: typeof pending.originalMessage === "string" ? pending.originalMessage : undefined,
      intents: pending.intents,
    };
  }
  return null;
}

async function preservePendingMultiServicePlan(
  input: {
    bldgUserId: number;
    content: string;
    session: ResidentAgentSession;
    intents: ResidentPlannedIntent[];
  },
  planId: unknown,
  reason: string
): Promise<void> {
  await updateBldgUser(input.bldgUserId, {
    pendingBookingIntentJson: {
      type: "multi_service_plan",
      originalMessage: input.content,
      intents: input.intents,
      planId: planId ?? null,
      reason,
      sourceConversationId: input.session.conversationId,
      sourceSessionId: input.session.sessionId,
    } as any,
  } as any);
}

function logChildAction(input: {
  serviceCategory: string;
  toolName: string;
  success: boolean;
  requestId?: unknown;
  orderId?: unknown;
  parentPlanId?: unknown;
  failureReason?: unknown;
}) {
  console.log("[ResidentAgent][MultiIntentChild]", {
    serviceCategory: input.serviceCategory,
    toolName: input.toolName,
    success: input.success,
    requestId: input.requestId ?? null,
    orderId: input.orderId ?? null,
    parentPlanId: input.parentPlanId ?? null,
    failureReason: input.failureReason ?? null,
  });
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
  const pending = items.filter((item) => isQueuedStatus(item.status));
  const profilePending = items.filter((item) => item.status === "pending_profile_completion");
  const failed = items.filter((item) => item.status === "failed");
  const parts: string[] = [];

  if (confirmed.length > 0) {
    const laundry = confirmed.find((item) => item.serviceCategory === "laundry");
    if (laundry) {
      parts.push(`Handled. Laundry is booked${laundry.date ? ` for ${laundry.date}` : ""}${laundry.window ? `, ${laundry.window}` : ""}.`);
    } else {
      parts.push(`Handled. ${capitalize(joinLabels(confirmed.map((item) => item.title.toLowerCase())))} ${confirmed.length === 1 ? "is" : "are"} confirmed.`);
    }
  }

  if (pending.length > 0) {
    const deadline = pending.find((item) => item.deadlineReason || item.deadlineDate);
    const label = joinLabels(pending.map((item) => shortServiceLabel(item)));
    const deadlineText = deadline?.deadlineReason
      ? ` before your ${deadline.deadlineReason.replace(/ visit$/, " arrives")}`
      : deadline?.deadlineDate
        ? ` before ${deadline.deadlineDate}`
        : "";
    const prefix = parts.length > 0 ? "I also queued" : "Handled. I queued";
    parts.push(`${prefix} ${label} for confirmation${deadlineText}.`);
  }

  if (failed.length > 0) {
    const label = joinLabels(failed.map((item) => shortServiceLabel(item)));
    parts.push(`${capitalize(label)} ${failed.length === 1 ? "needs" : "need"} operator review, so I flagged ${failed.length === 1 ? "it" : "them"} instead of pretending ${failed.length === 1 ? "it was" : "they were"} booked.`);
  }

  if (profilePending.length > 0) {
    const onlyProfilePending = confirmed.length === 0 && pending.length === 0 && failed.length === 0;
    const label = joinLabels(profilePending.map((item) => shortServiceLabel(item)));
    const needsPaymentOnly = profilePending.every((item) => item.failureReason === "pending_payment_profile");
    if (onlyProfilePending) {
      parts.push(
        `I have the full plan. Add the missing account details once, then I'll lock ${label} without making you repeat this.`
      );
    } else {
      parts.push(
        `${capitalize(label)} ${profilePending.length === 1 ? "needs" : "need"} ${needsPaymentOnly ? "payment details" : "account details"} before I can lock ${profilePending.length === 1 ? "it" : "them"}.`
      );
    }
  }

  const statusSummary = formatStatusSummary(buildStatusSummary(items));
  return [parts.join(" "), statusSummary].filter(Boolean).join("\n\n");
}

function isQueuedStatus(status: string): boolean {
  return status === "pending_operator_review" || status === "pending_provider_confirmation";
}

function buildStatusSummary(items: PlanItemMetadata[]) {
  return {
    confirmed: items.filter((item) => item.status === "confirmed").map(formatSummaryItem),
    queued: items.filter((item) => isQueuedStatus(item.status)).map(formatSummaryItem),
    needsReview: items.filter((item) => item.status === "failed").map(formatSummaryItem),
    needsYou: items.filter((item) => item.status === "pending_profile_completion").map(formatSummaryItem),
  };
}

function formatStatusSummary(summary: ReturnType<typeof buildStatusSummary>): string {
  const lines: string[] = [];
  if (summary.confirmed.length) lines.push(`Confirmed: ${summary.confirmed.join("; ")}`);
  if (summary.queued.length) lines.push(`Queued: ${summary.queued.join("; ")}`);
  if (summary.needsReview.length) lines.push(`Needs review: ${summary.needsReview.join("; ")}`);
  if (summary.needsYou.length) lines.push(`Needs you: ${summary.needsYou.join("; ")}`);
  return lines.join("\n");
}

function formatSummaryItem(item: PlanItemMetadata): string {
  const details: string[] = [];
  if (item.date) details.push(item.date);
  if (item.window) details.push(item.window);
  if (item.deadlineReason) details.push(`before ${item.deadlineReason.replace(/ visit$/, " arrives")}`);
  if (item.origin || item.destination) {
    details.push([item.origin, item.destination].filter(Boolean).join(" to "));
  }
  return details.length ? `${item.title} - ${details.join(", ")}` : item.title;
}

function shortServiceLabel(item: PlanItemMetadata): string {
  if (item.serviceCategory === "dog_grooming") return "grooming";
  if (item.serviceCategory === "airport_transport") return "LAX pickup";
  return item.title.toLowerCase();
}

function getServiceTitle(type: ResidentMultiIntentType): string {
  const titles: Record<ResidentMultiIntentType, string> = {
    laundry: "Laundry",
    dry_cleaning: "Dry cleaning",
    dog_grooming: "Dog grooming",
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
