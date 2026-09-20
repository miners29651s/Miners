// Lottery (jackpot) constants and math.
// Ticket price = 5% of a tier's prize. A round must collect 115% of the
// prize (the network margin) before a draw can fire. Pool totals are always
// tracked in TON-equivalent value, whether a ticket was paid in TON or COFFEE.

import { TON_TO_COFFEE } from "./minerCatalog";

export type LotteryTier = 1 | 10 | 100 | 1000;

export const LOTTERY_TIERS: LotteryTier[] = [1, 10, 100, 1000];

export const TICKET_PRICE_RATIO = 0.05;
export const THRESHOLD_RATIO = 1.15;
export const ROUND_DURATION_MS = 24 * 60 * 60 * 1000;
export const MAX_TICKETS_PER_PURCHASE = 500;

export const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

export function ticketPriceTon(tier: LotteryTier): number {
  return round6(tier * TICKET_PRICE_RATIO);
}

export function ticketPriceCoffee(tier: LotteryTier): number {
  return Math.round(ticketPriceTon(tier) * TON_TO_COFFEE);
}

export function thresholdTon(tier: LotteryTier): number {
  return round6(tier * THRESHOLD_RATIO);
}

export function isValidTier(value: number): value is LotteryTier {
  return (LOTTERY_TIERS as number[]).includes(value);
}
