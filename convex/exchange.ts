import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { TON_TO_COFFEE } from "../lib/minerCatalog";

// COFFEE <-> in-app TON converter. Rate: 1 TON = TON_TO_COFFEE (1,000,000) COFFEE.
// Server-authoritative. Conversion is NOT "earning": totalEarned is never touched.
const MIN_COFFEE = 1_000;
const MIN_TON = 0.001;
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
const round2 = (n: number) => Math.round(n * 100) / 100;

export const convert = mutation({
  args: {
    playerId: v.id("players"),
    direction: v.union(v.literal("coffee_to_ton"), v.literal("ton_to_coffee")),
    amount: v.number(),
  },
  handler: async (ctx, { playerId, direction, amount }) => {
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount");

    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Player not found");
    const tonBalance = player.tonBalance ?? 0;

    if (direction === "coffee_to_ton") {
      const coffee = round2(amount);
      if (coffee < MIN_COFFEE) throw new Error("Amount too small");
      if (player.balance + 1e-6 < coffee) throw new Error("Insufficient COFFEE");

      const tonOut = round6(coffee / TON_TO_COFFEE);
      const newBalance = Math.max(0, player.balance - coffee);
      const newTon = round6(tonBalance + tonOut);

      await ctx.db.patch(playerId, { balance: newBalance, tonBalance: newTon });
      await ctx.db.insert("transactions", {
        playerId,
        type: "exchange",
        amount: -coffee,
        balanceAfter: newBalance,
        meta: { direction, coffee, ton: tonOut, newTonBalance: newTon },
        createdAt: Date.now(),
      });
      return { ok: true as const, newBalance, newTon, received: tonOut };
    }

    const ton = round6(amount);
    if (ton < MIN_TON) throw new Error("Amount too small");
    if (tonBalance + 1e-9 < ton) throw new Error("Insufficient TON");

    const coffeeOut = Math.round(ton * TON_TO_COFFEE);
    const newTon = Math.max(0, round6(tonBalance - ton));
    const newBalance = player.balance + coffeeOut;

    await ctx.db.patch(playerId, { balance: newBalance, tonBalance: newTon });
    await ctx.db.insert("transactions", {
      playerId,
      type: "exchange",
      amount: coffeeOut,
      balanceAfter: newBalance,
      meta: { direction, coffee: coffeeOut, ton, newTonBalance: newTon },
      createdAt: Date.now(),
    });
    return { ok: true as const, newBalance, newTon, received: coffeeOut };
  },
});
