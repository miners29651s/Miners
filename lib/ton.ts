// TON payment constants + helpers shared between frontend (TonConnect send)
// and this doc's mirror on the backend (convex env var TON_WALLET_ADDRESS —
// keep both in sync, see README/deploy notes).
export const TON_WALLET_ADDRESS = "UQAIPbeX_tjEvGwJPJxgHCFIeYjVeSjvrw-UEn4aEIJ3QMQv";

// Used only to derive TON-miner baseCost/baseHashrate in lib/minerCatalog.ts —
// not used at runtime for payment verification (that checks the real on-chain
// TON amount against each miner's own tonCost).
export const TON_TO_COFFEE_RATE = 1_000_000;

/** Comment attached to the on-chain payment — read back by the backend poller to know who bought what. */
export function buildMinerPaymentComment(playerId: string, minerId: string): string {
  return `${playerId}|${minerId}`;
}
