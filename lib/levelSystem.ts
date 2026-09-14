// Cosmetic level system, derived entirely from the player's current
// hashrate (already server-authoritative). No schema changes, no new
// mutations — pure display logic.
const BASE_HASHRATE = 5; // Mini Miner's hashrate = level 1 floor
const GROWTH = 1.35; // each level needs 35% more hashrate than the last

export function getLevelInfo(hashrate: number) {
  const h = Math.max(0, hashrate);
  if (h < BASE_HASHRATE) {
    return { level: 1, progress: h / BASE_HASHRATE, currentThreshold: 0, nextThreshold: BASE_HASHRATE };
  }
  const level = 1 + Math.floor(Math.log(h / BASE_HASHRATE) / Math.log(GROWTH));
  const currentThreshold = BASE_HASHRATE * Math.pow(GROWTH, level - 1);
  const nextThreshold = BASE_HASHRATE * Math.pow(GROWTH, level);
  const progress = Math.min(1, Math.max(0, (h - currentThreshold) / (nextThreshold - currentThreshold)));
  return { level, progress, currentThreshold, nextThreshold };
}
