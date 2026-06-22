import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchResidentProposalDetail, fetchResidentProposalList, submitResidentProposalConsent,
} from "./proposalClient";

describe("proposalClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("attaches all four outbound headers, deriving secret/tenant server-side only", async () => {
    vi.stubEnv("APP_SHARED_API_SECRET", "s3cr3t");
    vi.stubEnv("RESIDENT_APP_TENANT_ID", "");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ items: [], page: { hasMore: false } }) });
    vi.stubGlobal("fetch", fetchMock);

    await fetchResidentProposalList(42);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers).toEqual({
      "x-app-shared-secret": "s3cr3t",
      "x-resident-session-verified": "true",
      "x-bldg-user-id": "42",
      "x-tenant-id": "default",
    });
  });

  it("defaults RESIDENT_APP_TENANT_ID to 'default' when unset", async () => {
    vi.stubEnv("RESIDENT_APP_TENANT_ID", "");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ items: [], page: {} }) });
    vi.stubGlobal("fetch", fetchMock);

    await fetchResidentProposalList(1);

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["x-tenant-id"]).toBe("default");
  });

  it("reads APP_SHARED_API_SECRET only from process.env, never from a passed argument", async () => {
    vi.stubEnv("APP_SHARED_API_SECRET", "real-secret");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ items: [], page: {} }) });
    vi.stubGlobal("fetch", fetchMock);

    // fetchResidentProposalList has no parameter through which a caller could supply a secret.
    await fetchResidentProposalList(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["x-app-shared-secret"]).toBe("real-secret");
  });

  it("treats 401/403 as session/auth failure for list and get", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchResidentProposalList(1)).resolves.toEqual({ ok: false, reason: "unauthorized" });
    await expect(fetchResidentProposalDetail(1, "v1")).resolves.toEqual({ ok: false, reason: "unauthorized" });
  });

  it("treats a 404 from admin-api as a safe not-found for get", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchResidentProposalDetail(1, "missing")).resolves.toEqual({ ok: false, reason: "not_found" });
  });

  it("treats network failures as network_error, not a crash", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(fetchResidentProposalList(1)).resolves.toEqual({ ok: false, reason: "network_error" });
    await expect(fetchResidentProposalDetail(1, "v1")).resolves.toEqual({ ok: false, reason: "network_error" });
  });

  it("returns the resident-safe card payload unchanged on success", async () => {
    const card = { proposal_id: "p1", proposal_version_id: "v1", cta: { visible: true } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => card }));

    await expect(fetchResidentProposalDetail(1, "v1")).resolves.toEqual({ ok: true, card });
  });

  it("never sends a write/mutating HTTP method", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ items: [], page: {} }) });
    vi.stubGlobal("fetch", fetchMock);

    await fetchResidentProposalList(1);
    await fetchResidentProposalDetail(1, "v1");

    for (const [, init] of fetchMock.mock.calls) {
      expect(init.method).toBe("GET");
    }
  });
});

describe("submitResidentProposalConsent", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("sends a POST to the correct encoded consent path with all four headers", async () => {
    vi.stubEnv("APP_SHARED_API_SECRET", "s3cr3t");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 201, json: async () => ({ status: "consent_recorded", consentedAt: "2026-06-22T12:00:00.000Z" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await submitResidentProposalConsent(42, "version/with space");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://bldg-admin-api-production.up.railway.app/api/resident/proposals/version%2Fwith%20space/consent");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "x-app-shared-secret": "s3cr3t", "x-resident-session-verified": "true",
      "x-bldg-user-id": "42", "x-tenant-id": "default",
    });
  });

  it("maps 201 to consent_recorded and 200 to consent_already_recorded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 201, json: async () => ({ status: "consent_recorded", consentedAt: "2026-06-22T12:00:00.000Z" }),
    }));
    await expect(submitResidentProposalConsent(1, "v1")).resolves.toEqual({
      ok: true, status: "consent_recorded", consentedAt: "2026-06-22T12:00:00.000Z",
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => ({ status: "consent_already_recorded", consentedAt: "2026-06-21T00:00:00.000Z" }),
    }));
    await expect(submitResidentProposalConsent(1, "v1")).resolves.toEqual({
      ok: true, status: "consent_already_recorded", consentedAt: "2026-06-21T00:00:00.000Z",
    });
  });

  it("maps 400/401/403/404/network errors to the correct refusal reasons", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: "Invalid request" }) }));
    await expect(submitResidentProposalConsent(1, "v1")).resolves.toEqual({ ok: false, reason: "invalid_request" });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: "Unauthorized" }) }));
    await expect(submitResidentProposalConsent(1, "v1")).resolves.toEqual({ ok: false, reason: "unauthorized" });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "Unauthorized" }) }));
    await expect(submitResidentProposalConsent(1, "v1")).resolves.toEqual({ ok: false, reason: "unauthorized" });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({ error: "Proposal not found" }) }));
    await expect(submitResidentProposalConsent(1, "v1")).resolves.toEqual({ ok: false, reason: "not_allowed" });

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    await expect(submitResidentProposalConsent(1, "v1")).resolves.toEqual({ ok: false, reason: "network_error" });
  });

  it("has no parameter or code path that reads inbound request headers -- bldgUserId/tenantId are server-derived only", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ status: "consent_recorded" }) }));
    // submitResidentProposalConsent's signature is (bldgUserId: number, versionId: string) -- there is
    // no way to pass a tenantId or forged headers through it even if a caller tried to.
    await submitResidentProposalConsent(999, "v1");
    const fetchMock = vi.mocked(fetch);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["x-tenant-id"]).toBe("default");
    expect(init.headers["x-bldg-user-id"]).toBe("999");
  });
});
