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
    slug: "opus_south",
    displayName: "3545",
  },
  "3650": {
    token: "3650",
    slug: "opus_north",
    displayName: "3650",
  },
  "2160": {
    token: "2160",
    slug: "cpe_north",
    displayName: "2160",
  },
  "2170": {
    token: "2170",
    slug: "cpe_south",
    displayName: "2170",
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
