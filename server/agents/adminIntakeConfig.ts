export const DEFAULT_ADMIN_INTAKE_API_BASE_URL =
  "https://bldg-admin-api-production.up.railway.app";

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

export function getAdminIntakeApiBaseUrl(): string {
  return normalizeBaseUrl(
    process.env.ADMIN_INTAKE_API_URL ||
    process.env.LAUNDRY_API_BASE_URL ||
    process.env.ADMIN_API_URL ||
    DEFAULT_ADMIN_INTAKE_API_BASE_URL
  );
}

export function getAdminIntakeApiBaseUrlCandidates(): string[] {
  return Array.from(
    new Set([
      getAdminIntakeApiBaseUrl(),
      DEFAULT_ADMIN_INTAKE_API_BASE_URL,
    ])
  ).map(normalizeBaseUrl);
}

export function hasAdminIntakeSharedSecret(): boolean {
  return Boolean(process.env.APP_SHARED_API_SECRET);
}
