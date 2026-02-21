/**
 * Upgrade catalog for BLDG services
 * Defines available upgrades per service category with pricing
 */

export type UpgradeCode = "hang-dry" | "interior-detail" | "deep-kitchen" | "haircut";

export interface Upgrade {
  code: UpgradeCode;
  label: string;
  priceCents: number;
  serviceCategories: string[];
}

export const UPGRADES: Upgrade[] = [
  {
    code: "hang-dry",
    label: "Hang dry",
    priceCents: 500, // $5.00
    serviceCategories: ["laundry"],
  },
  {
    code: "interior-detail",
    label: "Interior detail",
    priceCents: 2500, // $25.00
    serviceCategories: ["car-wash"],
  },
  {
    code: "deep-kitchen",
    label: "Deep kitchen clean",
    priceCents: 5000, // $50.00
    serviceCategories: ["cleaning"],
  },
  {
    code: "haircut",
    label: "Haircut",
    priceCents: 3500, // $35.00
    serviceCategories: ["grooming"],
  },
];

/**
 * Get available upgrades for a service category
 */
export function getUpgradesForService(serviceCategory: string): Upgrade[] {
  return UPGRADES.filter((u) => u.serviceCategories.includes(serviceCategory));
}

/**
 * Get upgrade whisper message for a service category
 * Returns null if no upgrades available
 */
export function getUpgradeWhisper(serviceCategory: string): string | null {
  const upgrades = getUpgradesForService(serviceCategory);
  if (upgrades.length === 0) return null;

  // Pick the first upgrade as the whisper suggestion
  const upgrade = upgrades[0];
  return `${upgrade.label}. +$${(upgrade.priceCents / 100).toFixed(2)}.`;
}
