import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchResidentProposalDetail, fetchResidentProposalList } from "./proposalClient";

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
