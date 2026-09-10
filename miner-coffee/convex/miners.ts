import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  MINER_CATALOG,
  MINER_MAP,
  upgradeCost,
  hashrateAtLevel,
} from "../lib/minerCatalog";

// GET /api/miners/catalog
export const catalog = query({
  args: {},
  handler: async () => MINER_CATALOG,
});

async function recomputeHashrate(ctx: any, playerId: any) {
  const owned = await ctx.db
    .query("playerMiners")
    .withIndex("by_player", (q: any) => q.eq("playerId", playerId))
    .collect();

  let total = 0;
  for (const row of owned) {
    total += row.quantity * hashrateAtLevel(row.minerId, row.level);
  }
  await ctx.db.patch(playerId, { hashrate: total });
}

async function recordTx(
  ctx: any,
  playerId: any,
  type: string,
  amount: number,
  balanceAfter: number,
  meta?: any
) {
  await ctx.db.insert("transactions", {
    playerId,
    type,
    amount,
    balanceAfter,
    meta,
    createdAt: Date.now(),
  });
}

// POST /api/miners/buy — increments quantity, never touches level.
export const buy = mutation({
  args: { playerId: v.id("players"), minerId: v.string() },
  handler: async (ctx, { playerId, minerId }) => {
    const def = MINER_MAP[minerId];
    if (!def) throw new Error("Unknown miner");

    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Player not found");

    if (player.balance < def.baseCost) {
      throw new Error("Insufficient balance");
    }

    const newBalance = player.balance - def.baseCost;
    await ctx.db.patch(playerId, { balance: newBalance });

    const existing = await ctx.db
      .query("playerMiners")
      .withIndex("by_player_miner", (q) =>
        q.eq("playerId", playerId).eq("minerId", minerId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { quantity: existing.quantity + 1 });
    } else {
      await ctx.db.insert("playerMiners", {
        playerId,
        minerId,
        quantity: 1,
        level: 1,
      });
    }

    await recomputeHashrate(ctx, playerId);
    await recordTx(ctx, playerId, "buy_miner", -def.baseCost, newBalance, { minerId });

    return { ok: true, minerId, newBalance };
  },
});

// POST /api/miners/upgrade — raises level by 1 (applies to ALL copies owned).
export const upgrade = mutation({
  args: { playerId: v.id("players"), minerId: v.string() },
  handler: async (ctx, { playerId, minerId }) => {
    const def = MINER_MAP[minerId];
    if (!def) throw new Error("Unknown miner");

    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Player not found");

    const owned = await ctx.db
      .query("playerMiners")
      .withIndex("by_player_miner", (q) =>
        q.eq("playerId", playerId).eq("minerId", minerId)
      )
      .unique();

    if (!owned || owned.quantity < 1) {
      throw new Error("You don't own this miner yet");
    }

    const cost = upgradeCost(minerId, owned.level);
    if (player.balance < cost) {
      throw new Error("Insufficient balance");
    }

    const newBalance = player.balance - cost;
    await ctx.db.patch(playerId, { balance: newBalance });
    await ctx.db.patch(owned._id, { level: owned.level + 1 });

    await recomputeHashrate(ctx, playerId);
    await recordTx(ctx, playerId, "upgrade_miner", -cost, newBalance, {
      minerId,
      newLevel: owned.level + 1,
    });

    return { ok: true, minerId, newLevel: owned.level + 1, newBalance };
  },
});

// Helper query for the Miners tab: owned miners + level, merged with catalog.
export const myMiners = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const owned = await ctx.db
      .query("playerMiners")
      .withIndex("by_player", (q) => q.eq("playerId", playerId))
      .collect();

    const ownedMap = new Map(owned.map((o) => [o.minerId, o]));

    return MINER_CATALOG.map((def) => {
      const row = ownedMap.get(def.id);
      const level = row?.level ?? 1;
      return {
        ...def,
        quantity: row?.quantity ?? 0,
        level,
        currentHashratePerUnit: hashrateAtLevel(def.id, level),
        nextUpgradeCost: upgradeCost(def.id, level),
      };
    });
  },
});
