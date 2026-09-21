export const BINARY_MINER_PURCHASE_LEVEL1_PERCENT = 0.09;
export const BINARY_CLAIM_LEVEL1_PERCENT = 0.03;
export const BINARY_MAX_LEVELS = 20;
export const BINARY_MIN_PERCENT = 0.0001;

export function binaryLevelPercent(basePercent: number, level: number): number {
  return basePercent / Math.pow(2, level - 1);
}
