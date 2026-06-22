import { SignJWT } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

vi.mock("../proposals/proposalClient", () => ({
  fetchResidentProposalList: vi.fn(),
  fetchResidentProposalDetail: vi.fn(),
  submitResidentProposalConsent: vi.fn(),
}));

const { fetchResidentProposalList, fetchResidentProposalDetail, submitResidentProposalConsent } =
  await import("../proposals/proposalClient");

function createAnonymousContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

async function createAuthenticatedContext(
  bldgUserId: number,
  extraHeaders: Record<string, string> = {},
): Promise<TrpcContext> {
  vi.stubEnv("JWT_SECRET", "test-secret");
  const token = await new SignJWT({ bldgUserId })
    .setProtectedHeader({ alg: "HS256" })
    .sign(new TextEncoder().encode("test-secret"));

  return {
    user: null,
    req: {
      protocol: "https",
      headers: { cookie: `bldg_session=${token}`, ...extraHeaders },
    } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("proposals.list", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("rejects unauthenticated requests without calling the proposal client", async () => {
    const ctx = createAnonymousContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.proposals.list()).rejects.toThrow("No active session");
    expect(fetchResidentProposalList).not.toHaveBeenCalled();
  });

  it("derives bldgUserId from the verified session, never from a forged inbound header", async () => {
    vi.mocked(fetchResidentProposalList).mockResolvedValue({ ok: true, items: [], hasMore: false });
    const ctx = await createAuthenticatedContext(1, { "x-bldg-user-id": "999", "x-tenant-id": "laundry_farm" });
    const caller = appRouter.createCaller(ctx);

    await caller.proposals.list();

    expect(fetchResidentProposalList).toHaveBeenCalledWith(1, expect.anything());
  });

  it("accepts no tenantId or bldgUserId in its input schema", async () => {
    vi.mocked(fetchResidentProposalList).mockResolvedValue({ ok: true, items: [], hasMore: false });
    const ctx = await createAuthenticatedContext(1);
    const caller = appRouter.createCaller(ctx);

    // @ts-expect-error -- tenantId/bldgUserId are not part of the input schema
    await caller.proposals.list({ tenantId: "laundry_farm", bldgUserId: 999, limit: 5 });

    expect(fetchResidentProposalList).toHaveBeenCalledWith(1, { limit: 5 });
  });

  it("returns an empty list safely when none exist", async () => {
    vi.mocked(fetchResidentProposalList).mockResolvedValue({ ok: true, items: [], hasMore: false });
    const ctx = await createAuthenticatedContext(1);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.proposals.list()).resolves.toEqual({ items: [], hasMore: false });
  });
});

describe("proposals.get", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("rejects unauthenticated requests without calling the proposal client", async () => {
    const ctx = createAnonymousContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.proposals.get({ versionId: "v1" })).rejects.toThrow("No active session");
    expect(fetchResidentProposalDetail).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND safely without leaking internal state", async () => {
    vi.mocked(fetchResidentProposalDetail).mockResolvedValue({ ok: false, reason: "not_found" });
    const ctx = await createAuthenticatedContext(1);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.proposals.get({ versionId: "missing" })).rejects.toThrow("Proposal not found");
  });

  it("returns the resident-safe card on success", async () => {
    const card = { proposal_id: "p1" } as never;
    vi.mocked(fetchResidentProposalDetail).mockResolvedValue({ ok: true, card });
    const ctx = await createAuthenticatedContext(1);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.proposals.get({ versionId: "v1" })).resolves.toEqual(card);
  });
});

describe("proposals.approve", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("rejects unauthenticated requests without calling the proposal client", async () => {
    const ctx = createAnonymousContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.proposals.approve({ versionId: "v1" })).rejects.toThrow("No active session");
    expect(submitResidentProposalConsent).not.toHaveBeenCalled();
  });

  it("derives bldgUserId from the verified session, never from a forged inbound header", async () => {
    vi.mocked(submitResidentProposalConsent).mockResolvedValue({ ok: true, status: "consent_recorded", consentedAt: null });
    const ctx = await createAuthenticatedContext(1, { "x-bldg-user-id": "999", "x-tenant-id": "laundry_farm" });
    const caller = appRouter.createCaller(ctx);

    await caller.proposals.approve({ versionId: "v1" });

    expect(submitResidentProposalConsent).toHaveBeenCalledWith(1, "v1");
  });

  it("accepts no tenantId or bldgUserId in its input schema", async () => {
    vi.mocked(submitResidentProposalConsent).mockResolvedValue({ ok: true, status: "consent_recorded", consentedAt: null });
    const ctx = await createAuthenticatedContext(1);
    const caller = appRouter.createCaller(ctx);

    // @ts-expect-error -- tenantId/bldgUserId are not part of the input schema
    await caller.proposals.approve({ versionId: "v1", tenantId: "laundry_farm", bldgUserId: 999 });

    expect(submitResidentProposalConsent).toHaveBeenCalledWith(1, "v1");
  });

  it("returns consent_recorded with the version id on success", async () => {
    vi.mocked(submitResidentProposalConsent).mockResolvedValue({ ok: true, status: "consent_recorded", consentedAt: "2026-06-22T12:00:00.000Z" });
    const ctx = await createAuthenticatedContext(1);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.proposals.approve({ versionId: "v1" })).resolves.toEqual({ status: "consent_recorded", versionId: "v1" });
  });

  it("returns consent_already_recorded for an idempotent replay -- not an error", async () => {
    vi.mocked(submitResidentProposalConsent).mockResolvedValue({ ok: true, status: "consent_already_recorded", consentedAt: "2026-06-21T00:00:00.000Z" });
    const ctx = await createAuthenticatedContext(1);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.proposals.approve({ versionId: "v1" })).resolves.toEqual({ status: "consent_already_recorded", versionId: "v1" });
  });

  it("maps not_allowed to NOT_FOUND without leaking the underlying reason", async () => {
    vi.mocked(submitResidentProposalConsent).mockResolvedValue({ ok: false, reason: "not_allowed" });
    const ctx = await createAuthenticatedContext(1);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.proposals.approve({ versionId: "v1" })).rejects.toThrow("Proposal not found");
  });

  it("maps invalid_request to BAD_REQUEST and network_error to INTERNAL_SERVER_ERROR", async () => {
    vi.mocked(submitResidentProposalConsent).mockResolvedValue({ ok: false, reason: "invalid_request" });
    const ctx1 = await createAuthenticatedContext(1);
    await expect(appRouter.createCaller(ctx1).proposals.approve({ versionId: "v1" })).rejects.toThrow("Invalid request");

    vi.mocked(submitResidentProposalConsent).mockResolvedValue({ ok: false, reason: "network_error" });
    const ctx2 = await createAuthenticatedContext(1);
    await expect(appRouter.createCaller(ctx2).proposals.approve({ versionId: "v1" })).rejects.toThrow("Could not record consent");
  });
});
