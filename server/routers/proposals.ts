import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { fetchResidentProposalDetail, fetchResidentProposalList } from "../proposals/proposalClient";
import { getBldgUserIdFromRequest } from "./chat";

/**
 * Resident-safe proposal read surface. Query-only -- no mutation exists or
 * will be added here. bldgUserId is derived server-side from the verified
 * bldg_session cookie only; it is never accepted as client input.
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
});
