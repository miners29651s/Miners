import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { DAILY_MAX_EMISSION, MAX_PLAYER_SHARE_OF_DAILY_EMISSION } from "../lib/minerCatalog";
import { payReferralBonusIfEligible } from "./referrals";

const DAY_MS = 24 * 60 * 60 * 1000;

// NOTE: summing every player's hashrate on each call is fine for a small/medium
// player base. At real scale, replace this with a maintained running total
// (e.g. a `settings` row updated whenever recomputeHashrate() runs in miners.ts)
// instead of a full table scan.
async function getNetworkHashrate(ctx: any): Promise<number> {
  const players = await ctx.db.query("players").collect();
  const total = players.reduce((sum: number, p: any) => sum + p.hashrate, 0);
  return Math.max(total, 1); // avoid divide-by-zero before anyone has a miner
}

function accrue(playerHashrate: number, networkHashrate: number, elapsedMs: number) {
  const rawShare = playerHashrate / networkHashrate;
  // Cap applied BEFORE multiplying by emission — see MAX_PLAYER_SHARE_OF_DAILY_EMISSION
  // doc comment in lib/minerCatalog.ts for why this exists.
  const cappedShare = Math.min(rawShare, MAX_PLAYER_SHARE_OF_DAILY_EMISSION);
  const perMs = (DAILY_MAX_EMISSION * cappedShare) / DAY_MS;
  return perMs * elapsedMs;
}

// GET /api/mining/status — read-only, safe to poll occasionally (not every ms).
export const status = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Player not found");

    const networkHashrate = await getNetworkHashrate(ctx);
    const elapsedMs = Date.now() - player.lastMiningTick;
    const freshAccrual = accrue(player.hashrate, networkHashrate, elapsedMs);

    return {
      balance: player.balance,
      hashrate: player.hashrate,
      networkHashrate,
      pendingMining: player.pendingMining + freshAccrual,
      // ratePerSecond lets the client animate the counter locally via
      // requestAnimationFrame instead of polling this query continuously.
      ratePerSecond: accrue(player.hashrate, networkHashrate, 1000),
    };
  },
});

// POST /api/mining/claim — server-authoritative, single source of truth.
export const claim = mutation({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Player not found");

    const networkHashrate = await getNetworkHashrate(ctx);
    const now = Date.now();
    const elapsedMs = now - player.lastMiningTick;
    const freshAccrual = accrue(player.hashrate, networkHashrate, elapsedMs);

    const claimedAmount = player.pendingMining + freshAccrual;
    if (claimedAmount <= 0) {
      return { claimedAmount: 0, newBalance: player.balance };
    }

    const newBalance = player.balance + claimedAmount;
    const isFirstClaim = player.totalEarned === 0;

    await ctx.db.patch(playerId, {
      balance: newBalance,
      totalEarned: player.totalEarned + claimedAmount,
      pendingMining: 0,
      lastMiningTick: now, // reset accrual clock — prevents double-claiming
    });

    await ctx.db.insert("transactions", {
      playerId,
      type: "claim",
      amount: claimedAmount,
      balanceAfter: newBalance,
      createdAt: now,
    });

    // Referral qualifying milestone = referred user's first successful claim.
    // Pays the referrer a flat bonus (see referrals.ts) — no percentage of
    // this claimedAmount is used, by design.
    if (isFirstClaim) {
      await payReferralBonusIfEligible(ctx, playerId);
    }

    return { claimedAmount, newBalance };
  },
});
