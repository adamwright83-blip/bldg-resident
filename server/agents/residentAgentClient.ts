import type { ResidentAgentSession } from "./session";
import { isResidentAppTestMode, makeTestOrderId } from "../residentTestMode";
import { withDefaultReturnBy } from "../intakeReturnBy";

export const DEFAULT_ADMIN_AGENT_S2S_RUN_TOOL_URL =
  "https://bldg-admin-api-production.up.railway.app/api/agent/s2s/run-tool";

export interface LaundryOrderToolInput {
  externalId: string;
  source: "bldg-resident";
  status: "new";
  serviceType: "wash_fold" | "dry_cleaning";
  pickupDate: string;
  pickupWindow: string;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  address: string;
  buildingId: string | null;
  unit: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  bldgUserId: number | null;
  stripeCustomerId: string | null;
  stripePaymentMethodId: string | null;
  specialInstructions?: string;
  rawRequest?: string;
  cleanedRequest?: string;
  displayRequest?: string;
  sessionId?: string;
  conversationId?: string;
}

export type AdminExecutionResult =
  | { success: true; orderId?: number; path: "agent-tool" | "intake-fallback"; [key: string]: unknown }
  | { success: false; reason: string; path: "agent-tool" | "intake-fallback"; status?: number };

export interface AdminAgentClient {
  canRunLaundryOrderTool(): boolean;
  runAdminTool(
    toolName: string,
    input: Record<string, unknown>,
    session: ResidentAgentSession
  ): Promise<AdminExecutionResult>;
  runCreateLaundryOrderTool(
    input: LaundryOrderToolInput,
    session: ResidentAgentSession
  ): Promise<AdminExecutionResult>;
  runCreateResidentAgentPlanTool(
    input: Record<string, unknown>,
    session: ResidentAgentSession
  ): Promise<AdminExecutionResult>;
  runUpdateResidentAgentPlanTool(
    input: Record<string, unknown>,
    session: ResidentAgentSession
  ): Promise<AdminExecutionResult>;
  runCreateResidentCoordinatedRequestTool(
    input: Record<string, unknown>,
    session: ResidentAgentSession
  ): Promise<AdminExecutionResult>;
}

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "");
}

export function normalizeAdminAgentS2SRunToolUrl(url: string): string {
  const endpoint = normalizeUrl(url);
  if (endpoint.endsWith("/api/agent/s2s/run-tool")) return endpoint;
  if (endpoint.endsWith("/api/agent/s2s/runTool")) return endpoint.replace(/\/runTool$/, "/run-tool");
  if (endpoint.endsWith("/api/agent/s2s")) return `${endpoint}/run-tool`;
  if (endpoint.endsWith("/api/agent")) return `${endpoint}/s2s/run-tool`;
  return `${endpoint}/api/agent/s2s/run-tool`;
}

function getAdminAgentS2SRunToolUrlCandidates(): string[] {
  const configured = process.env.ADMIN_AGENT_S2S_URL;
  return Array.from(
    new Set([
      ...(configured ? [normalizeAdminAgentS2SRunToolUrl(configured)] : []),
      DEFAULT_ADMIN_AGENT_S2S_RUN_TOOL_URL,
    ])
  );
}

export function createAdminAgentClient(): AdminAgentClient {
  const sharedSecret = process.env.ADMIN_AGENT_SHARED_SECRET || "";

  return {
    canRunLaundryOrderTool() {
      // In test mode the admin agent tools are synthesized locally (see
      // makeTestModeToolResult), so the full multi-intent orchestration —
      // parent plan + coordinated requests — runs end to end without a live
      // admin endpoint. Outside test mode a real S2S endpoint is required.
      if (isResidentAppTestMode()) return true;
      return Boolean(process.env.ADMIN_AGENT_S2S_URL && sharedSecret);
    },

    async runAdminTool(toolName, input, session) {
      if (isResidentAppTestMode()) {
        const synthetic = makeTestModeToolResult(toolName, input);
        console.log(
          `[ResidentTestMode] Synthesizing admin agent tool=${toolName} result=${JSON.stringify(synthetic)}`
        );
        return synthetic;
      }

      const targets = getAdminAgentS2SRunToolUrlCandidates();
      if (!process.env.ADMIN_AGENT_S2S_URL || !sharedSecret) {
        return {
          success: false,
          reason: "no_safe_admin_agent_s2s_endpoint",
          path: "agent-tool",
        };
      }

      try {
        let lastFailure: AdminExecutionResult | null = null;
        for (const target of targets) {
          console.log(
            `[ResidentAgent][AdminAgentClient] S2S runTool attempt target=${target} tool=${toolName}`
          );
          const bldgUserId =
            typeof input.bldgUserId === "number" ? input.bldgUserId : null;
          const res = await fetch(target, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-agent-shared-secret": sharedSecret,
            },
            body: JSON.stringify({
              toolName,
              tenantId: "default",
              agentType: "resident_agent",
              actorType: "resident_chat",
              actorId: bldgUserId == null ? null : `bldg_user:${bldgUserId}`,
              sessionId: session.sessionId,
              conversationId: session.conversationId,
              input: {
                ...input,
                ...(input.buildingId !== undefined ? { buildingSlug: input.buildingId } : {}),
                ...(input.pickupWindow !== undefined
                  ? {
                      pickupTimeWindow: input.pickupWindow,
                      deliveryTimeWindow: input.pickupWindow,
                    }
                  : {}),
                sessionId: session.sessionId,
                conversationId: session.conversationId,
              },
            }),
          });

          const responseText = await res.text().catch(() => "(no body)");
          console.log(
            `[ResidentAgent][AdminAgentClient] S2S runTool response target=${target} status=${res.status} body=${responseText}`
          );
          if (!res.ok) {
            lastFailure = {
              success: false,
              reason: `non_2xx:${res.status}`,
              path: "agent-tool",
              status: res.status,
            };
            if ([404, 405].includes(res.status) && target !== targets[targets.length - 1]) {
              continue;
            }
            return lastFailure;
          }

          let body: unknown;
          try {
            body = JSON.parse(responseText);
          } catch {
            return { success: false, reason: "parse_error", path: "agent-tool" };
          }

          const output = normalizeRunToolOutput(body);
          const missingReason = getMissingRequiredIdReason(toolName, output);
          if (missingReason) {
            console.warn(
              `[ResidentAgent][AdminAgentClient] S2S runTool failure tool=${toolName} status=${res.status} reason=${missingReason}`
            );
            return { success: false, reason: missingReason, path: "agent-tool", status: res.status };
          }
          console.log(
            `[ResidentAgent][AdminAgentClient] S2S runTool success tool=${toolName} status=${res.status} requiredId=${getRequiredIdLogValue(toolName, output)}`
          );
          return { success: true, ...output, path: "agent-tool" };
        }

        return lastFailure ?? { success: false, reason: "no_s2s_targets", path: "agent-tool" };
      } catch (err) {
        console.error("[ResidentAgent][AdminAgentClient] runTool failed:", err);
        return { success: false, reason: "fetch_error", path: "agent-tool" };
      }
    },

    async runCreateLaundryOrderTool(input, session) {
      const result = await this.runAdminTool("createLaundryOrderTool", input as unknown as Record<string, unknown>, session);
      if (!result.success) return result;

      const orderId = result.orderId;
      if (orderId == null || !Number.isFinite(Number(orderId))) {
        return {
          success: false,
          reason: "missing_orderId",
          path: "agent-tool",
        };
      }

      return { ...result, orderId: Number(orderId), path: "agent-tool" };
    },

    async runCreateResidentAgentPlanTool(input, session) {
      return this.runAdminTool("createResidentAgentPlanTool", input, session);
    },

    async runUpdateResidentAgentPlanTool(input, session) {
      return this.runAdminTool("updateResidentAgentPlanTool", input, session);
    },

    async runCreateResidentCoordinatedRequestTool(input, session) {
      return this.runAdminTool("createResidentCoordinatedRequestTool", input, session);
    },
  };
}

// Synthesize the admin agent tool responses in test mode so the resident
// multi-intent flow can be exercised end to end without a live admin endpoint.
// Mirrors the real tool contracts: laundry yields a finite orderId, plans yield
// a planId, and coordinated services yield a requestId held at
// provider-confirmation — never "confirmed", preserving the truth rule.
function makeTestModeToolResult(
  toolName: string,
  input: Record<string, unknown>
): AdminExecutionResult {
  if (toolName === "createLaundryOrderTool") {
    const sourceId =
      typeof input.bldgUserId === "number"
        ? input.bldgUserId
        : Number(String(input.externalId ?? "").match(/\d+/)?.[0] ?? 0);
    return { success: true, orderId: makeTestOrderId(sourceId), path: "agent-tool" };
  }
  if (toolName === "createResidentAgentPlanTool" || toolName === "updateResidentAgentPlanTool") {
    const planId =
      typeof input.planId === "string" && input.planId
        ? input.planId
        : `plan_test_${Date.now()}`;
    return { success: true, planId, path: "agent-tool" };
  }
  if (toolName === "createResidentCoordinatedRequestTool") {
    const category = String(input.serviceCategory ?? "service");
    return {
      success: true,
      requestId: `req_test_${category}_${Date.now()}`,
      status: "pending_provider_confirmation",
      residentVisibleStatus: "pending_provider_confirmation",
      nextAction: "provider_confirmation",
      path: "agent-tool",
    };
  }
  return { success: true, path: "agent-tool" };
}

function normalizeRunToolOutput(body: any): Record<string, unknown> {
  const output = {
    ...asPlainObject(body),
    ...asPlainObject(body?.result),
    ...asPlainObject(body?.output),
    ...asPlainObject(body?.result?.output),
  };
  if (output && typeof output === "object" && !Array.isArray(output)) {
    return output;
  }
  return { output };
}

function asPlainObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function hasFiniteId(value: unknown): boolean {
  return value != null && String(value).trim() !== "" && Number.isFinite(Number(value));
}

function hasPresentId(value: unknown): boolean {
  return value != null && String(value).trim() !== "";
}

function getMissingRequiredIdReason(
  toolName: string,
  output: Record<string, unknown>
): string | null {
  if (toolName === "createLaundryOrderTool" && !hasFiniteId(output.orderId)) {
    return "missing_orderId";
  }
  if (
    (toolName === "createResidentAgentPlanTool" || toolName === "updateResidentAgentPlanTool") &&
    !hasPresentId(output.planId)
  ) {
    return "missing_planId";
  }
  if (
    toolName === "createResidentCoordinatedRequestTool" &&
    !hasPresentId(output.requestId)
  ) {
    return "missing_requestId";
  }
  return null;
}

function getRequiredIdLogValue(toolName: string, output: Record<string, unknown>): string {
  if (toolName === "createLaundryOrderTool") return `orderId:${String(output.orderId ?? "missing")}`;
  if (toolName === "createResidentAgentPlanTool" || toolName === "updateResidentAgentPlanTool") {
    return `planId:${String(output.planId ?? "missing")}`;
  }
  if (toolName === "createResidentCoordinatedRequestTool") {
    return `requestId:${String(output.requestId ?? "missing")}`;
  }
  return "not_required";
}

export function shouldUseIntakeFallbackForAgentFailure(result: AdminExecutionResult): boolean {
  if (result.success || result.path !== "agent-tool") return false;

  if (
    result.reason === "no_safe_admin_agent_s2s_endpoint" ||
    result.reason === "fetch_error"
  ) {
    return true;
  }

  const statusMatch = result.reason.match(/^non_2xx:(\d+)$/);
  const status = result.status ?? (statusMatch?.[1] ? Number(statusMatch[1]) : null);

  // These statuses mean the safe admin agent S2S route is unavailable or not
  // usable from resident. Preserve production behavior via the existing intake
  // endpoint instead of calling protected admin tRPC or inventing local order logic.
  return status != null && [400, 401, 403, 404, 405].includes(status);
}

export function shouldTryNextIntakeBaseUrl(result: AdminExecutionResult): boolean {
  if (result.success || result.path !== "intake-fallback") return false;
  return result.reason === "non_200:404" || result.reason === "non_200:405";
}

export async function postToAdminIntakeFallbackAndVerify(
  adminApiUrl: string,
  sharedSecret: string,
  payload: LaundryOrderToolInput,
  logPrefix: string
): Promise<AdminExecutionResult> {
  try {
    if (isResidentAppTestMode()) {
      const sourceId =
        typeof payload.bldgUserId === "number"
          ? payload.bldgUserId
          : Number(String(payload.externalId).match(/\d+/)?.[0] ?? 0);
      const orderId = makeTestOrderId(sourceId);
      console.log(
        `[ResidentTestMode] Skipping admin intake fallback target=${adminApiUrl}; synthetic orderId=${orderId}`
      );
      return { success: true, orderId, path: "intake-fallback" };
    }

    console.log(`[INTAKE][${logPrefix}] POST attempted to admin intake target=${adminApiUrl}/api/intake/from-bldg`);
    const fwdRes = await fetch(`${adminApiUrl}/api/intake/from-bldg`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-app-shared-secret": sharedSecret || "",
      },
      body: JSON.stringify(withDefaultReturnBy(payload)),
    });

    const responseText = await fwdRes.text().catch(() => "(no body)");
    console.log(`[INTAKE][${logPrefix}] response status=${fwdRes.status} body=${responseText}`);

    if (fwdRes.status !== 200) {
      return {
        success: false,
        reason: `non_200:${fwdRes.status}`,
        path: "intake-fallback",
      };
    }

    let body: { ok?: boolean; orderId?: number };
    try {
      body = JSON.parse(responseText) as { ok?: boolean; orderId?: number };
    } catch {
      return { success: false, reason: "parse_error", path: "intake-fallback" };
    }

    if (body?.ok !== true) {
      return { success: false, reason: "body_ok_false", path: "intake-fallback" };
    }
    const orderId = body?.orderId;
    if (orderId == null || !Number.isFinite(Number(orderId))) {
      return {
        success: false,
        reason: "missing_orderId",
        path: "intake-fallback",
      };
    }

    console.log(`[BookingConfirm][${logPrefix}] admin intake verified orderId=${orderId}`);
    return { success: true, orderId: Number(orderId), path: "intake-fallback" };
  } catch (err) {
    console.error(`[INTAKE][${logPrefix}] caught error:`, err);
    return { success: false, reason: "fetch_error", path: "intake-fallback" };
  }
}
