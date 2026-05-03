const LAUNDRY_BUTLER_API_BASE_URL = "https://laundrybutler.bldg.chat";

export function getAdminIntakeApiBaseUrl(): string {
  return (
    process.env.ADMIN_INTAKE_API_URL ||
    process.env.LAUNDRY_API_BASE_URL ||
    LAUNDRY_BUTLER_API_BASE_URL
  ).replace(/\/$/, "");
}

export function hasAdminIntakeSharedSecret(): boolean {
  return Boolean(process.env.APP_SHARED_API_SECRET);
}
