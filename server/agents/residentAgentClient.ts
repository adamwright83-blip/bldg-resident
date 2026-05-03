import type { ResidentAgentSession } from "./session";

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
  sessionId?: string;
  conversationId?: string;
}

export type AdminExecutionResult =
  | { success: true; orderId: number; path: "agent-tool" | "intake-fallback" }
  | { success: false; reason: string; path: "agent-tool" | "intake-fallback"; status?: number };

export interface AdminAgentClient {
  canRunLaundryOrderTool(): boolean;
  runCreateLaundryOrderTool(
    input: LaundryOrderToolInput,
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
      return Boolean(process.env.ADMIN_AGENT_S2S_URL && sharedSecret);
    },

    async runCreateLaundryOrderTool(input, session) {
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
            `[ResidentAgent][AdminAgentClient] S2S runTool attempt target=${target} tool=createLaundryOrderTool`
          );
          const res = await fetch(target, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-agent-shared-secret": sharedSecret,
            },
            body: JSON.stringify({
              toolName: "createLaundryOrderTool",
              tenantId: "default",
              agentType: "resident_agent",
              actorType: "resident_chat",
              actorId: input.bldgUserId == null ? null : `bldg_user:${input.bldgUserId}`,
              sessionId: session.sessionId,
              conversationId: session.conversationId,
              input: {
                ...input,
                buildingSlug: input.buildingId,
                pickupTimeWindow: input.pickupWindow,
                deliveryTimeWindow: input.pickupWindow,
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

          let body: { orderId?: number; result?: { orderId?: number }; output?: { orderId?: number } };
          try {
            body = JSON.parse(responseText);
          } catch {
            return { success: false, reason: "parse_error", path: "agent-tool" };
          }

          const orderId = body.orderId ?? body.result?.orderId ?? body.output?.orderId;
          if (orderId == null || !Number.isFinite(Number(orderId))) {
            return {
              success: false,
              reason: "missing_orderId",
              path: "agent-tool",
            };
          }

          return { success: true, orderId: Number(orderId), path: "agent-tool" };
        }

        return lastFailure ?? { success: false, reason: "no_s2s_targets", path: "agent-tool" };
      } catch (err) {
        console.error("[ResidentAgent][AdminAgentClient] runTool failed:", err);
        return { success: false, reason: "fetch_error", path: "agent-tool" };
      }
    },
  };
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
  return status != null && [401, 403, 404, 405].includes(status);
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
    console.log(`[INTAKE][${logPrefix}] POST attempted to admin intake target=${adminApiUrl}/api/intake/from-bldg`);
    const fwdRes = await fetch(`${adminApiUrl}/api/intake/from-bldg`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-app-shared-secret": sharedSecret || "",
      },
      body: JSON.stringify(payload),
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
