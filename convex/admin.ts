import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// All functions here are internal — no client can call them.
// They are reachable only from the admin commands in convex/http.ts
// (checked against ADMIN_TELEGRAM_ID) or from the CLI.

export const giveCoffee = internalMutation({
  args: { telegramId: v.string(), amount: v.number() },
  handler: async (ctx, { telegramId, amount }) => {
    const p = await ctx.db
      .query("players")
      .withIndex("by_telegramId", (q) => q.eq("telegramId", telegramId))
      .unique();
    if (!p) return { ok: false as const, error: "player_not_found" };
    const newBalance = p.balance + amount;
    await ctx.db.patch(p._id, { balance: newBalance });
    return { ok: true as const, newBalance };
  },
});

export const giveTon = internalMutation({
  args: { telegramId: v.string(), amount: v.number() },
  handler: async (ctx, { telegramId, amount }) => {
    const p = await ctx.db
      .query("players")
      .withIndex("by_telegramId", (q) => q.eq("telegramId", telegramId))
      .unique();
    if (!p) return { ok: false as const, error: "player_not_found" };
    const newTon = (p.tonBalance ?? 0) + amount;
    await ctx.db.patch(p._id, { tonBalance: newTon });
    return { ok: true as const, newTon };
  },
});

export const playerInfo = internalQuery({
  args: { telegramId: v.string() },
  handler: async (ctx, { telegramId }) => {
    const p = await ctx.db
      .query("players")
      .withIndex("by_telegramId", (q) => q.eq("telegramId", telegramId))
      .unique();
    if (!p) return null;
    const miners = await ctx.db
      .query("playerMiners")
      .withIndex("by_player", (q) => q.eq("playerId", p._id))
      .collect();
    return {
      telegramId: p.telegramId,
      username: p.username ?? "-",
      balance: p.balance,
      tonBalance: p.tonBalance ?? 0,
      hashrate: p.hashrate,
      miners: miners.map((m) => `${m.minerId} Lv${m.level}`),
    };
  },
});

export const stats = internalQuery({
  args: {},
  handler: async (ctx) => {
    const players = await ctx.db.query("players").collect();
    return {
      players: players.length,
      totalHashrate: players.reduce((s, p) => s + p.hashrate, 0),
      totalCoffee: players.reduce((s, p) => s + p.balance, 0),
      totalTon: players.reduce((s, p) => s + (p.tonBalance ?? 0), 0),
    };
  },
});

// DESTRUCTIVE — wipes all per-player data so everyone starts from zero.
// Payment records (tonPurchases, starsPurchases) are kept on purpose so old
// on-chain payments can never be processed twice.
export const resetAllPlayerData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "players",
      "playerMiners",
      "transactions",
      "taskCompletions",
      "referrals",
      "withdrawals",
      "taskReactions",
      "referralSprints",
    ] as const;

    const counts: Record<string, number> = {};
    for (const table of tables) {
      const rows = await ctx.db.query(table).collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
      counts[table] = rows.length;
    }
    return { ok: true, deleted: counts };
  },
});
