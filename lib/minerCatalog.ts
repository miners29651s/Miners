// Single source of truth for miner definitions.
// Miners are PERMANENT — no expiresAt field anywhere in this project on purpose.

export type MinerDef = {
  id: string;
  name: string;
  tier: number; // 1 = free-tier COFFEE miner, 2..21 = TON miners (cheap -> expensive)
  baseCost: number; // COFFEE cost basis — drives upgradeCost() curve for ALL miners (upgrades are always paid in COFFEE)
  baseHashrate: number;
  asset: string;
  colorFrom: string;
  colorTo: string;
  costType?: "coffee" | "stars" | "ton"; // default "coffee" when omitted
  starsCost?: number;
  tonCost?: number; // required when costType === "ton"
};

// ---------------- Economy constants ----------------
export const TOTAL_SUPPLY = 100_000_000_000;
export const MINING_POOL = 30_000_000_000;
export const DAILY_MAX_EMISSION = 75_000_000; // COFFEE / day (pool lasts ~400 days), split by hashrate share
export const TASK_DAILY_BUDGET = 10_000_000;
export const REFERRAL_FLAT_BONUS = 500; // DEPRECATED
export const REFERRAL_DAILY_CAP_PER_USER = 5; // DEPRECATED
export const REFERRAL_BONUS_PERCENT = 0.10;
export const MAX_REFERRAL_BONUS_PER_DAY = 50_000;
export const TOKEN_LAUNCH_USER_THRESHOLD = 10_000;
export const WITHDRAWAL_FEE = 0.05;
export const MAX_PLAYER_SHARE_OF_DAILY_EMISSION = 0.02; // kept for compatibility (unused by mining.ts now)

// ---------------- TON pricing / hashrate math (tune ONLY here) ----------------
export const TON_TO_COFFEE = 1_000_000; // 1 TON = 1,000,000 COFFEE
export const NETWORK_REF_HASHRATE = 100_000_000; // network "difficulty": paybacks below hold at this total H/s
export const PAYBACK_DAYS_AT_1_TON = 182.5; // 1 TON miner => 6 months
export const PAYBACK_EXPONENT = 0.3; // 10 TON => ~91 days (3 months)
export const MIN_PAYBACK_DAYS = 91; // floor
export const BIG_MINER_TON = 50; // above this, payback grows again (emission is limited)
export const BIG_MINER_EXPONENT = 0.25;
export const MAX_MINER_SHARE = 0.5; // one miner can never take more than 50% of daily emission

export function paybackDays(tonCost: number): number {
  if (tonCost <= BIG_MINER_TON) {
    return Math.max(MIN_PAYBACK_DAYS, PAYBACK_DAYS_AT_1_TON * Math.pow(tonCost, -PAYBACK_EXPONENT));
  }
  return MIN_PAYBACK_DAYS * Math.pow(tonCost / BIG_MINER_TON, BIG_MINER_EXPONENT);
}

/** COFFEE per day a level-1 miner earns when network hashrate == NETWORK_REF_HASHRATE. */
export function dailyCoffeeAtRef(tonCost: number): number {
  const daily = (tonCost * TON_TO_COFFEE) / paybackDays(tonCost);
  return Math.min(daily, DAILY_MAX_EMISSION * MAX_MINER_SHARE);
}

/** Actual payback days after the share cap. */
export function effectivePaybackDays(tonCost: number): number {
  return (tonCost * TON_TO_COFFEE) / dailyCoffeeAtRef(tonCost);
}

export function hashrateForTon(tonCost: number): number {
  return Math.max(1, Math.round((dailyCoffeeAtRef(tonCost) / DAILY_MAX_EMISSION) * NETWORK_REF_HASHRATE));
}

function ton(
  id: string,
  name: string,
  tier: number,
  tonCost: number,
  asset: string,
  colorFrom: string,
  colorTo: string
): MinerDef {
  return {
    id,
    name,
    tier,
    baseCost: Math.round(tonCost * TON_TO_COFFEE),
    baseHashrate: hashrateForTon(tonCost),
    asset,
    colorFrom,
    colorTo,
    costType: "ton",
    tonCost,
  };
}

export const MINER_CATALOG: MinerDef[] = [
  // Only miner NOT bought with TON (COFFEE, tiny hashrate)
  { id: "mini", name: "Mini Miner", tier: 1, baseCost: 10, baseHashrate: 5, asset: "mini.png", colorFrom: "#8a8a8a", colorTo: "#4a4a4a" },

  // Everything else: TON only, price ladder 1 -> 10,000 TON (geometric)
  ton("starter", "Starter Miner", 2, 1, "starter.png", "#c97b4a", "#7a4423"),
  ton("bronze", "Bronze Miner", 3, 1.6, "bronze.png", "#cd8a4f", "#8a5a28"),
  ton("silver", "Silver Miner", 4, 2.6, "silver.png", "#e2e2e2", "#8f8f9a"),
  ton("gold", "Gold Miner", 5, 4.3, "gold.png", "#f6d576", "#cd9c2e"),
  ton("platinum", "Platinum Miner", 6, 7, "platinum.png", "#cfe7ea", "#6f9ea3"),
  ton("diamond", "Diamond Miner", 7, 11.3, "diamond.png", "#a6e9ff", "#3d92c9"),
  ton("titan", "Titan Miner", 8, 18.3, "titan.png", "#8fa3c7", "#2c3a56"),
  ton("omega", "Omega Miner", 9, 29.8, "omega.png", "#c99bf0", "#5a2c8a"),
  ton("ultimate", "Ultimate Miner", 10, 48.3, "ultimate.png", "#ffe27a", "#e0507a"),
  ton("meteor", "Meteor Miner", 11, 78.4, "meteor.png", "#8ecae6", "#023e8a"),
  ton("comet", "Comet Miner", 12, 127, "comet.png", "#90e0ef", "#0077b6"),
  ton("pulsar", "Pulsar Miner", 13, 207, "pulsar.png", "#48cae4", "#0096c7"),
  ton("quasar", "Quasar Miner", 14, 336, "quasar.png", "#00b4d8", "#0098ea"),
  ton("nova", "Nova Miner", 15, 545, "nova.png", "#ade8f4", "#48cae4"),
  ton("supernova", "Supernova Miner", 16, 886, "supernova.png", "#caf0f8", "#00b4d8"),
  ton("eclipse", "Eclipse Miner", 17, 1438, "eclipse.png", "#ffd6a5", "#4a4e69"),
  ton("wormhole", "Wormhole Miner", 18, 2335, "wormhole.png", "#c77dff", "#5a189a"),
  ton("singularity", "Singularity Miner", 19, 3791, "singularity.png", "#7209b7", "#240046"),
  ton("multiverse", "Multiverse Miner", 20, 6156, "multiverse.png", "#f72585", "#7209b7"),
  ton("genesis", "Genesis Miner", 21, 10000, "genesis.png", "#ffd700", "#b8860b"),
];

export const MINER_MAP: Record<string, MinerDef> = Object.fromEntries(
  MINER_CATALOG.map((m) => [m.id, m])
);

const UPGRADE_COST_GROWTH = 1.55;
const UPGRADE_HASHRATE_GROWTH = 1.45;

/** Cost to upgrade FROM `level` TO `level + 1`. Always paid in COFFEE, even for TON-purchased miners. */
export function upgradeCost(minerId: string, level: number): number {
  const def = MINER_MAP[minerId];
  if (!def) throw new Error(`Unknown miner: ${minerId}`);
  return Math.round(def.baseCost * Math.pow(UPGRADE_COST_GROWTH, level - 1));
}

/** Hashrate of a single unit of this miner at the given level. */
export function hashrateAtLevel(minerId: string, level: number): number {
  const def = MINER_MAP[minerId];
  if (!def) throw new Error(`Unknown miner: ${minerId}`);
  return Math.round(def.baseHashrate * Math.pow(UPGRADE_HASHRATE_GROWTH, level - 1));
}
