import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { SPIN_COOLDOWN_MS, pickWeightedPrize } from "../lib/spinCatalog";

// POST /api/spin/spin — rolls and STORES the prize server-side. The client
// never sees the amount before this returns, so it can't be spoofed.
export const spin = mutation({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Player not found");

    if (player.pendingSpinReward != null) {
      throw new Error("You already have an unclaimed spin — claim it first.");
    }

    const now = Date.now();
    if (player.lastSpinClaimedAt && now - player.lastSpinClaimedAt < SPIN_COOLDOWN_MS) {
      const msLeft = SPIN_COOLDOWN_MS - (now - player.lastSpinClaimedAt);
      throw new Error(`Next spin available in ${Math.ceil(msLeft / 60000)} minutes.`);
    }

    const prize = pickWeightedPrize();

    await ctx.db.patch(playerId, {
      pendingSpinReward: prize.amount,
      pendingSpinRewardType: prize.type,
      pendingSpinRewardId: prize.id,
      pendingSpinRewardAt: now,
    });

    return { prizeId: prize.id, label: prize.label, type: prize.type, amount: prize.amount };
  },
});

// POST /api/spin/claim — the only place a spin reward actually touches
// balance/tonBalance. "none" (Try Again) just clears the pending state.
export const claimSpin = mutation({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Player not found");

    if (player.pendingSpinReward == null || !player.pendingSpinRewardType) {
      throw new Error("No spin reward to claim.");
    }

    const now = Date.now();
    const amount = player.pendingSpinReward;
    const type = player.pendingSpinRewardType;

    const newBalance = type === "coffee" ? player.balance + amount : player.balance;
    const newTonBalance = type === "ton" ? (player.tonBalance ?? 0) + amount : (player.tonBalance ?? 0);

    await ctx.db.patch(playerId, {
      balance: newBalance,
      totalEarned: type === "coffee" ? player.totalEarned + amount : player.totalEarned,
      tonBalance: newTonBalance,
      pendingSpinReward: undefined,
      pendingSpinRewardType: undefined,
      pendingSpinRewardId: undefined,
      pendingSpinRewardAt: undefined,
      lastSpinClaimedAt: now,
    });

    // Don't log a no-op transaction for "Try Again" — nothing moved.
    if (type !== "none") {
      await ctx.db.insert("transactions", {
        playerId,
        type: "spin_reward",
        amount,
        balanceAfter: newBalance,
        meta: { rewardType: type },
        createdAt: now,
      });
    }

    return { type, amount, newBalance, newTonBalance };
  },
});
