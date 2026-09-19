import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  SPIN_COOLDOWN_MS,
  pickWeightedPrize,
} from "../lib/spinCatalog";

export const spin = mutation({
  args: {
    playerId: v.id("players"),
  },

  handler: async (ctx, { playerId }) => {
    const player = await ctx.db.get(playerId);

    if (!player) {
      throw new Error("Player not found.");
    }

    const now = Date.now();
    const freeSpins = player.freeSpinsAvailable ?? 0;
    const lastSpinAt = player.lastSpinClaimedAt ?? 0;

    const cooldownActive =
      now - lastSpinAt < SPIN_COOLDOWN_MS;

    if (cooldownActive && freeSpins <= 0) {
      const remainingMs =
        SPIN_COOLDOWN_MS - (now - lastSpinAt);

      const remainingHours = Math.ceil(
        remainingMs / (60 * 60 * 1000),
      );

      throw new Error(
        `Next spin available in ${remainingHours} hour${
          remainingHours === 1 ? "" : "s"
        }.`,
      );
    }

    const usingFreeSpin =
      cooldownActive && freeSpins > 0;

    const { id, segment } = pickWeightedPrize();

    const newBalance =
      segment.type === "coffee"
        ? player.balance + segment.amount
        : player.balance;

    const newTonBalance =
      segment.type === "ton"
        ? (player.tonBalance ?? 0) + segment.amount
        : player.tonBalance ?? 0;

    await ctx.db.patch(playerId, {
      balance: newBalance,
      tonBalance: newTonBalance,

      totalEarned:
        segment.type === "coffee"
          ? player.totalEarned + segment.amount
          : player.totalEarned,

      lastSpinClaimedAt: now,

      ...(usingFreeSpin
        ? {
            freeSpinsAvailable: freeSpins - 1,
          }
        : {}),
    });

    if (segment.type !== "none") {
      await ctx.db.insert("transactions", {
        playerId,
        type: "spin_reward",
        amount: segment.amount,
        balanceAfter: newBalance,
        meta: {
          rewardType: segment.type,
          prizeId: id,
        },
        createdAt: now,
      });
    }

    return {
      prizeId: id,
      label: segment.label,
      type: segment.type,
      amount: segment.amount,
      usedFreeSpin: usingFreeSpin,
    };
  },
});

export async function grantFreeSpin(
  ctx: any,
  playerId: any,
) {
  const player = await ctx.db.get(playerId);

  if (!player) {
    return;
  }

  await ctx.db.patch(playerId, {
    freeSpinsAvailable:
      (player.freeSpinsAvailable ?? 0) + 1,
  });
}

export const addTestFreeSpin = mutation({
  args: {
    playerId: v.id("players"),
  },

  handler: async (ctx, { playerId }) => {
    const player = await ctx.db.get(playerId);

    if (!player) {
      throw new Error("Player not found.");
    }

    await ctx.db.patch(playerId, {
      freeSpinsAvailable:
        (player.freeSpinsAvailable ?? 0) + 1,
    });

    return {
      success: true,
      freeSpinsAvailable:
        (player.freeSpinsAvailable ?? 0) + 1,
    };
  },
});

export const getSpinStatus = query({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, { playerId }) => {
    const player = await ctx.db.get(playerId);
    if (!player) {
      throw new Error("Player not found.");
    }
    const now = Date.now();
    const freeSpins = player.freeSpinsAvailable ?? 0;
    const lastSpinAt = player.lastSpinClaimedAt ?? 0;
    const remainingMs = Math.max(
      0,
      SPIN_COOLDOWN_MS - (now - lastSpinAt),
    );
    const canSpin = remainingMs <= 0 || freeSpins > 0;
    return {
      canSpin,
      remainingMs,
      freeSpins,
    };
  },
});
