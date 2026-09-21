import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { DAILY_MAX_EMISSION, NETWORK_REF_HASHRATE } from "../lib/minerCatalog";
import { payReferralOverride } from "./referrals";
import { payBinaryCommission } from "./binaryReferral";

const DAY_MS = 24 * 60 * 60 * 1000;

// Real total hashrate of all players.
// NOTE: full table scan is fine for small/medium player base. At scale, replace with a
// maintained running total updated in recomputeHashrate() (miners.ts).
async function getRealNetworkHashrate(ctx: any): Promise<number> {
  const players = await ctx.db.query("players").collect();
  const total = players.reduce((sum: number, p: any) => sum + p.hashrate, 0);
  return Math.max(total, 1);
}

// NETWORK DIFFICULTY:
// Effective network = max(real network, NETWORK_REF_HASHRATE).
// - While the real network is small, difficulty stays fixed at the reference level,
//   so every miner pays back in exactly the planned time (1 TON ~ 6 months, 10 TON ~ 3 months...)
//   and a lone early player can NOT farm the whole daily emission.
// - When the real network grows above the reference, everyone's share dilutes
//   (difficulty rises) and payback gets longer.
function effectiveNetwork(realNetwork: number): number {
  return Math.max(realNetwork, NETWORK_REF_HASHRATE);
}

function accrue(playerHashrate: number, effNetwork: number, elapsedMs: number) {
  const share = Math.min(playerHashrate / effNetwork, 1);
  const perMs = (DAILY_MAX_EMISSION * share) / DAY_MS;
  return perMs * elapsedMs;
}

// GET /api/mining/status — read-only
export const status = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Player not found");

    const realNetwork = await getRealNetworkHashrate(ctx);
    const effNetwork = effectiveNetwork(realNetwork);
    const elapsedMs = Date.now() - player.lastMiningTick;
    const freshAccrual = accrue(player.hashrate, effNetwork, elapsedMs);

    return {
      balance: player.balance,
      hashrate: player.hashrate,
      networkHashrate: realNetwork,
      effectiveNetworkHashrate: effNetwork,
      pendingMining: player.pendingMining + freshAccrual,
      tonBalance: player.tonBalance ?? 0,
      ratePerSecond: accrue(player.hashrate, effNetwork, 1000),
      coffeePerDay: accrue(player.hashrate, effNetwork, DAY_MS),
    };
  },
});

// POST /api/mining/claim — server-authoritative
export const claim = mutation({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Player not found");

    const effNetwork = effectiveNetwork(await getRealNetworkHashrate(ctx));
    const now = Date.now();
    const elapsedMs = now - player.lastMiningTick;
    const freshAccrual = accrue(player.hashrate, effNetwork, elapsedMs);

    const claimedAmount = player.pendingMining + freshAccrual;
    if (claimedAmount <= 0) {
      return { claimedAmount: 0, newBalance: player.balance };
    }

    const newBalance = player.balance + claimedAmount;
    await ctx.db.patch(playerId, {
      balance: newBalance,
      totalEarned: player.totalEarned + claimedAmount,
      pendingMining: 0,
      lastMiningTick: now,
    });

    await ctx.db.insert("transactions", {
      playerId,
      type: "claim",
      amount: claimedAmount,
      balanceAfter: newBalance,
      createdAt: now,
    });

    await payReferralOverride(ctx, playerId, claimedAmount);
    await payBinaryCommission(ctx, playerId, claimedAmount, "claim");

    return { claimedAmount, newBalance };
  },
});
