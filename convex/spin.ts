import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { SPIN_COOLDOWN_MS, pickWeightedPrize } from "../lib/spinCatalog";

export const spin = mutation({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Player not found");

    if (player.pendingSpinReward != null) {
      throw new Error("You already have an unclaimed spin — claim it first.");
    }

    const now = Date.now();
    const freeSpins = player.freeSpinsAvailable ?? 0;
    const onCooldown =
      !!player.lastSpinClaimedAt && now - player.lastSpinClaimedAt < SPIN_COOLDOWN_MS;

    if (onCooldown && freeSpins <= 0) {
      const msLeft = SPIN_COOLDOWN_MS - (now - (player.lastSpinClaimedAt as number));
      throw new Error(`Next spin available in ${Math.ceil(msLeft / 60000)} minutes.`);
    }

    const usingFreeSpin = onCooldown && freeSpins > 0;
    const { id, segment } = pickWeightedPrize();

    await ctx.db.patch(playerId, {
      pendingSpinReward: segment.amount,
      pendingSpinRewardType: segment.type,
      pendingSpinRewardId: id,
      pendingSpinRewardAt: now,
      ...(usingFreeSpin ? { freeSpinsAvailable: freeSpins - 1 } : {}),
    });

    return { prizeId: id, label: segment.label, type: segment.type, amount: segment.amount };
  },
});

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

// Call this from wherever a new referred player registers (in convex/referrals.ts
// or wherever that happens) to grant the referrer +1 free spin that skips the
// 24h cooldown once. Not wired in automatically — I don't have that file's
// content. Paste it and I'll wire this in precisely.
export async function grantFreeSpin(ctx: any, playerId: any) {
  const player = await ctx.db.get(playerId);
  if (!player) return;
  await ctx.db.patch(playerId, {
    freeSpinsAvailable: (player.freeSpinsAvailable ?? 0) + 1,
  });
}
