import { afterEach, describe, expect, it, vi } from "vitest";
import { getAdminIntakeApiBaseUrl, hasAdminIntakeSharedSecret } from "./adminIntakeConfig";

describe("adminIntakeConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults fallback intake to Laundry Butler", () => {
    vi.stubEnv("ADMIN_INTAKE_API_URL", "");
    vi.stubEnv("LAUNDRY_API_BASE_URL", "");
    vi.stubEnv("ADMIN_API_URL", "https://protected-admin.example");

    expect(getAdminIntakeApiBaseUrl()).toBe("https://laundrybutler.bldg.chat");
  });

  it("allows an explicit shared-secret intake override", () => {
    vi.stubEnv("ADMIN_INTAKE_API_URL", "https://intake.example/");

    expect(getAdminIntakeApiBaseUrl()).toBe("https://intake.example");
  });

  it("detects whether the fallback shared secret is configured", () => {
    vi.stubEnv("APP_SHARED_API_SECRET", "");
    expect(hasAdminIntakeSharedSecret()).toBe(false);

    vi.stubEnv("APP_SHARED_API_SECRET", "secret");
    expect(hasAdminIntakeSharedSecret()).toBe(true);
  });
});
