const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

function envFlag(name: string): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  return value ? TRUE_VALUES.has(value) : false;
}

export function isResidentAppTestMode(): boolean {
  const explicit = [
    process.env.RESIDENT_APP_TEST_MODE,
    process.env.APP_TEST_MODE,
    process.env.BLDG_TEST_MODE,
  ]
    .map(value => value?.trim().toLowerCase())
    .find(Boolean);

  if (explicit && FALSE_VALUES.has(explicit)) return false;

  if (explicit == null) {
    if (process.env.NODE_ENV === "test") return false;
    return process.env.NODE_ENV !== "production";
  }

  return (
    envFlag("RESIDENT_APP_TEST_MODE") ||
    envFlag("APP_TEST_MODE") ||
    envFlag("BLDG_TEST_MODE")
  );
}

export function makeTestOrderId(localId: number): number {
  return 900_000_000 + Math.max(0, Math.trunc(localId));
}

export function makeTestStripeCustomerId(bldgUserId: number): string {
  return `cus_test_resident_${bldgUserId}`;
}

export const TEST_PAYMENT_METHOD_ID = "pm_test_resident_mode";
