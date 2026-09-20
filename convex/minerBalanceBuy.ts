import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { MINER_MAP, hashrateAtLevel } from "../lib/minerCatalog";

// Buy a TON miner using the player's in-app TON balance (admin-credited, wheel, etc.).
// Real wallet payments still go through TON Connect + pollTonPayments (convex/miners.ts).
export const buyWithBalance = mutation({
  args: { playerId: v.id("players"), minerId: v.string() },
  handler: async (ctx, { playerId, minerId }) => {
    const def = MINER_MAP[minerId];
    if (!def || def.costType !== "ton" || !def.tonCost) {
      throw new Error("This miner is not purchasable with TON");
    }

    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Player not found");

    const existing = await ctx.db
      .query("playerMiners")
      .withIndex("by_player_miner", (q) => q.eq("playerId", playerId).eq("minerId", minerId))
      .unique();
    if (existing) throw new Error("Already owned — upgrade it instead of buying again");

    const tonBalance = player.tonBalance ?? 0;
    if (tonBalance + 1e-9 < def.tonCost) throw new Error("Insufficient TON balance");

    const newTon = Math.max(0, tonBalance - def.tonCost);
    await ctx.db.patch(playerId, { tonBalance: newTon });

    await ctx.db.insert("playerMiners", { playerId, minerId, quantity: 1, level: 1 });

    const owned = await ctx.db
      .query("playerMiners")
      .withIndex("by_player", (q) => q.eq("playerId", playerId))
      .collect();
    let total = 0;
    for (const row of owned) {
      total += row.quantity * hashrateAtLevel(row.minerId, row.level);
    }
    await ctx.db.patch(playerId, { hashrate: total });

    await ctx.db.insert("transactions", {
      playerId,
      type: "ton_purchase",
      amount: -def.tonCost,
      balanceAfter: player.balance,
      meta: { minerId, source: "ton_balance", newTonBalance: newTon },
      createdAt: Date.now(),
    });

    return { ok: true as const, minerId, newTonBalance: newTon };
  },
});
