// Single source of truth for miner definitions.
// Miners are PERMANENT — no expiresAt field anywhere in this project on purpose.

export type MinerDef = {
  id: string;
  name: string;
  tier: number; // 1..10, display order (also rack position: low tier = top)
  baseCost: number;
  baseHashrate: number;
  asset: string; // filename under /public/miners/
};

export const MINER_CATALOG: MinerDef[] = [
  { id: "mini", name: "Mini Miner", tier: 1, baseCost: 10, baseHashrate: 5, asset: "mini.png" },
  { id: "starter", name: "Starter Miner", tier: 2, baseCost: 1_000, baseHashrate: 10, asset: "starter.png" },
  { id: "bronze", name: "Bronze Miner", tier: 3, baseCost: 10_000, baseHashrate: 50, asset: "bronze.png" },
  { id: "silver", name: "Silver Miner", tier: 4, baseCost: 100_000, baseHashrate: 250, asset: "silver.png" },
  { id: "gold", name: "Gold Miner", tier: 5, baseCost: 1_000_000, baseHashrate: 1_500, asset: "gold.png" },
  { id: "platinum", name: "Platinum Miner", tier: 6, baseCost: 10_000_000, baseHashrate: 10_000, asset: "platinum.png" },
  { id: "diamond", name: "Diamond Miner", tier: 7, baseCost: 100_000_000, baseHashrate: 70_000, asset: "diamond.png" },
  { id: "titan", name: "Titan Miner", tier: 8, baseCost: 1_000_000_000, baseHashrate: 500_000, asset: "titan.png" },
  { id: "omega", name: "Omega Miner", tier: 9, baseCost: 10_000_000_000, baseHashrate: 4_000_000, asset: "omega.png" },
  { id: "ultimate", name: "Ultimate Miner", tier: 10, baseCost: 100_000_000_000, baseHashrate: 30_000_000, asset: "ultimate.png" },
];

export const MINER_MAP: Record<string, MinerDef> = Object.fromEntries(
  MINER_CATALOG.map((m) => [m.id, m])
);

const UPGRADE_COST_GROWTH = 1.55;
const UPGRADE_HASHRATE_GROWTH = 1.45;

/** Cost to upgrade FROM `level` TO `level + 1`. Level 1 is the level you own at purchase. */
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

// ---- Economy constants (kept in one place so backend + frontend agree) ----
export const TOTAL_SUPPLY = 100_000_000_000;
export const MINING_POOL = 30_000_000_000;
export const DAILY_MAX_EMISSION = 15_000_000; // COFFEE / day, split proportionally by hashrate share
export const TASK_DAILY_BUDGET = 10_000_000;
export const REFERRAL_FLAT_BONUS = 500; // flat COFFEE per qualifying referral milestone, NOT % of purchase
export const REFERRAL_DAILY_CAP_PER_USER = 5; // anti-abuse: max referral bonuses/day per referrer
export const TOKEN_LAUNCH_USER_THRESHOLD = 10_000;
export const WITHDRAWAL_FEE = 0.05;
