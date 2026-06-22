import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  fetchResidentProposalDetail, fetchResidentProposalList, submitResidentProposalConsent,
} from "../proposals/proposalClient";
import { getBldgUserIdFromRequest } from "./chat";

/**
 * Resident-safe proposal surface. bldgUserId is derived server-side from the
 * verified bldg_session cookie only; it is never accepted as client input.
 * `approve` is the only mutation here, and it only forwards a consent fact
 * to the admin-api's existing consent endpoint -- it performs no booking,
 * outreach, payment, dispatch, provider-acceptance, or LLM work itself.
 */
export const proposalsRouter = router({
  list: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(20).optional() }).optional())
    .query(async ({ input, ctx }) => {
      const bldgUserId = await getBldgUserIdFromRequest(ctx.req);
      if (!bldgUserId) throw new TRPCError({ code: "UNAUTHORIZED", message: "No active session" });

      const result = await fetchResidentProposalList(bldgUserId, { limit: input?.limit });
      if (!result.ok) {
        if (result.reason === "unauthorized") {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "No active session" });
        }
        return { items: [], hasMore: false };
      }
      return { items: result.items, hasMore: result.hasMore };
    }),

  get: publicProcedure
    .input(z.object({ versionId: z.string().min(1).max(191) }))
    .query(async ({ input, ctx }) => {
      const bldgUserId = await getBldgUserIdFromRequest(ctx.req);
      if (!bldgUserId) throw new TRPCError({ code: "UNAUTHORIZED", message: "No active session" });

      const result = await fetchResidentProposalDetail(bldgUserId, input.versionId);
      if (!result.ok) {
        if (result.reason === "unauthorized") {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "No active session" });
        }
        if (result.reason === "not_found") {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proposal not found" });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not load proposal" });
      }
      return result.card;
    }),

  approve: publicProcedure
    .input(z.object({ versionId: z.string().min(1).max(191) }))
    .mutation(async ({ input, ctx }) => {
      const bldgUserId = await getBldgUserIdFromRequest(ctx.req);
      if (!bldgUserId) throw new TRPCError({ code: "UNAUTHORIZED", message: "No active session" });

      const result = await submitResidentProposalConsent(bldgUserId, input.versionId);
      if (!result.ok) {
        if (result.reason === "unauthorized") {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "No active session" });
        }
        if (result.reason === "not_allowed") {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proposal not found" });
        }
        if (result.reason === "invalid_request") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid request" });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not record consent" });
      }
      return { status: result.status, versionId: input.versionId };
    }),
});
