import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_ADMIN_INTAKE_API_BASE_URL,
  getAdminIntakeApiBaseUrl,
  getAdminIntakeApiBaseUrlCandidates,
  hasAdminIntakeSharedSecret,
} from "./adminIntakeConfig";

describe("adminIntakeConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults fallback intake to the shared-secret admin API", () => {
    vi.stubEnv("ADMIN_INTAKE_API_URL", "");
    vi.stubEnv("LAUNDRY_API_BASE_URL", "");
    vi.stubEnv("ADMIN_API_URL", "");

    expect(getAdminIntakeApiBaseUrl()).toBe(DEFAULT_ADMIN_INTAKE_API_BASE_URL);
  });

  it("allows an explicit shared-secret intake override", () => {
    vi.stubEnv("ADMIN_INTAKE_API_URL", "https://intake.example/");

    expect(getAdminIntakeApiBaseUrl()).toBe("https://intake.example");
  });

  it("keeps the known admin intake host as a retry candidate for wrong configured hosts", () => {
    vi.stubEnv("ADMIN_INTAKE_API_URL", "https://wrong.example/");

    expect(getAdminIntakeApiBaseUrlCandidates()).toEqual([
      "https://wrong.example",
      DEFAULT_ADMIN_INTAKE_API_BASE_URL,
    ]);
  });

  it("detects whether the fallback shared secret is configured", () => {
    vi.stubEnv("APP_SHARED_API_SECRET", "");
    expect(hasAdminIntakeSharedSecret()).toBe(false);

    vi.stubEnv("APP_SHARED_API_SECRET", "secret");
    expect(hasAdminIntakeSharedSecret()).toBe(true);
  });
});
