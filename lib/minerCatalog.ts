// Single source of truth for miner definitions.
// Miners are PERMANENT — no expiresAt field anywhere in this project on purpose.

export type MinerDef = {
  id: string;
  name: string;
  tier: number; // 1..10, display order (also rack position: low tier = top)
  baseCost: number;
  baseHashrate: number;
  asset: string; // filename under /public/miners/ — used automatically IF the file exists; falls back to the generated SVG icon (colorFrom/colorTo) otherwise. See components/MinerIcon.tsx.
  colorFrom: string; // gradient start for the generated 3D-style icon
  colorTo: string; // gradient end for the generated 3D-style icon
};

export const MINER_CATALOG: MinerDef[] = [
  { id: "mini", name: "Mini Miner", tier: 1, baseCost: 10, baseHashrate: 5, asset: "mini.png", colorFrom: "#8a8a8a", colorTo: "#4a4a4a" },
  { id: "starter", name: "Starter Miner", tier: 2, baseCost: 1_000, baseHashrate: 10, asset: "starter.png", colorFrom: "#c97b4a", colorTo: "#7a4423" },
  { id: "bronze", name: "Bronze Miner", tier: 3, baseCost: 10_000, baseHashrate: 50, asset: "bronze.png", colorFrom: "#cd8a4f", colorTo: "#8a5a28" },
  { id: "silver", name: "Silver Miner", tier: 4, baseCost: 100_000, baseHashrate: 250, asset: "silver.png", colorFrom: "#e2e2e2", colorTo: "#8f8f9a" },
  { id: "gold", name: "Gold Miner", tier: 5, baseCost: 1_000_000, baseHashrate: 1_500, asset: "gold.png", colorFrom: "#f6d576", colorTo: "#cd9c2e" },
  { id: "platinum", name: "Platinum Miner", tier: 6, baseCost: 10_000_000, baseHashrate: 10_000, asset: "platinum.png", colorFrom: "#cfe7ea", colorTo: "#6f9ea3" },
  { id: "diamond", name: "Diamond Miner", tier: 7, baseCost: 100_000_000, baseHashrate: 70_000, asset: "diamond.png", colorFrom: "#a6e9ff", colorTo: "#3d92c9" },
  { id: "titan", name: "Titan Miner", tier: 8, baseCost: 1_000_000_000, baseHashrate: 500_000, asset: "titan.png", colorFrom: "#8fa3c7", colorTo: "#2c3a56" },
  { id: "omega", name: "Omega Miner", tier: 9, baseCost: 10_000_000_000, baseHashrate: 4_000_000, asset: "omega.png", colorFrom: "#c99bf0", colorTo: "#5a2c8a" },
  { id: "ultimate", name: "Ultimate Miner", tier: 10, baseCost: 100_000_000_000, baseHashrate: 30_000_000, asset: "ultimate.png", colorFrom: "#ffe27a", colorTo: "#e0507a" },
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
export const REFERRAL_FLAT_BONUS = 500; // DEPRECATED — kept only so old transaction meta/history still typechecks. No longer paid; see REFERRAL_BONUS_PERCENT.
export const REFERRAL_DAILY_CAP_PER_USER = 5; // DEPRECATED — see MAX_REFERRAL_BONUS_PER_DAY

// Ongoing single-level referral override: every time a referred player
// claims, their referrer gets an EXTRA bonus on top (not deducted from the
// referred player) equal to this fraction of that claim. Deliberately single
// level only — a referred player's own referrals do NOT cascade anything to
// the original referrer. No multi-level/binary structure, by design.
export const REFERRAL_BONUS_PERCENT = 0.10; // 10% of each direct referral's claim, paid to the referrer

// Anti-abuse: max total COFFEE a single referrer can earn from referral
// overrides per calendar day, regardless of how many referrals they have or
// how much those referrals claim. Prevents self-referral / sockpuppet farming.
export const MAX_REFERRAL_BONUS_PER_DAY = 50_000;

export const TOKEN_LAUNCH_USER_THRESHOLD = 10_000;
export const WITHDRAWAL_FEE = 0.05;

// Anti-whale / anti-early-farming cap: no single player's mining SHARE can
// ever exceed this fraction of DAILY_MAX_EMISSION, no matter how small the
// actual network hashrate is right now. Without this, a lone tester/early
// user is ~100% of the network and can silently accrue close to the ENTIRE
// daily emission cap just by existing — before real users ever join. Once
// the real player base is large enough that natural shares fall below this
// cap, this constant has no effect at all.
export const MAX_PLAYER_SHARE_OF_DAILY_EMISSION = 0.02; // 2% ⇒ max 300,000 COFFEE/day per player

