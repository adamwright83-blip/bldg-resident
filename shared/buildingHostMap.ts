export interface BuildingHostRecord {
  token: string;
  slug: string;
  displayName: string;
}

// Numeric subdomain -> internal building slug mapping.
// Keep this list neutral (no branded subdomains in URL).
export const BUILDING_HOST_MAP: Record<string, BuildingHostRecord> = {
  "3545": {
    token: "3545",
    slug: "opus-la",
    displayName: "3545",
  },
};

export function extractNumericHostToken(hostname: string): string | null {
  const host = hostname.toLowerCase();
  if (!host.endsWith(".bldg.chat")) return null;
  const firstLabel = host.split(".")[0];
  if (!/^\d+$/.test(firstLabel)) return null;
  return firstLabel;
}

export function resolveBuildingFromHostname(
  hostname: string
): BuildingHostRecord | null {
  const token = extractNumericHostToken(hostname);
  if (!token) return null;
  return BUILDING_HOST_MAP[token] ?? null;
}
