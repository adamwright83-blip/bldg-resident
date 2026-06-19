import type { HeldParsedService } from "./HeldArtistDrawing";

function getHeldServiceIdentity(type: string) {
  const normalized = type.toLowerCase().replace(/-/g, "_");
  if (/dry_?clean/.test(normalized)) return "dry_cleaning";
  if (/laundry|wash_?fold/.test(normalized)) return "laundry_pickup";
  return normalized;
}

export function mergeHeldServices(
  existing: HeldParsedService[],
  incoming: HeldParsedService[],
) {
  const merged = new Map<string, HeldParsedService>();
  for (const service of existing) merged.set(getHeldServiceIdentity(service.type), service);
  for (const service of incoming) merged.set(getHeldServiceIdentity(service.type), service);
  return Array.from(merged.values());
}
