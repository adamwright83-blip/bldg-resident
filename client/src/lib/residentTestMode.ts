const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

function envFlag(name: string): boolean {
  const value = import.meta.env[name]?.trim().toLowerCase();
  return value ? TRUE_VALUES.has(value) : false;
}

const explicitMode = [
  import.meta.env.VITE_RESIDENT_APP_TEST_MODE,
  import.meta.env.VITE_APP_TEST_MODE,
  import.meta.env.VITE_BLDG_TEST_MODE,
]
  .map(value => value?.trim().toLowerCase())
  .find(Boolean);

export const isResidentAppTestMode =
  explicitMode == null
    ? !import.meta.env.PROD
    : FALSE_VALUES.has(explicitMode)
      ? false
      : envFlag("VITE_RESIDENT_APP_TEST_MODE") ||
        envFlag("VITE_APP_TEST_MODE") ||
        envFlag("VITE_BLDG_TEST_MODE");

export const TEST_PAYMENT_METHOD_ID = "pm_test_resident_mode";
