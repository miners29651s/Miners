import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { TOKEN_LAUNCH_USER_THRESHOLD, WITHDRAWAL_FEE } from "../lib/minerCatalog";

// Adjustable without a redeploy: add a "min_withdrawal_amount" row to the
// `settings` table (value = a number) to override this default.
const DEFAULT_MIN_WITHDRAWAL_AMOUNT = 5000;

async function getMinWithdrawalAmount(ctx: any): Promise<number> {
  const setting = await ctx.db
    .query("settings")
    .withIndex("by_key", (q: any) => q.eq("key", "min_withdrawal_amount"))
    .unique();
  return typeof setting?.value === "number" ? setting.value : DEFAULT_MIN_WITHDRAWAL_AMOUNT;
}

// POST /api/withdrawals/request
export const request = mutation({
  args: { playerId: v.id("players"), amount: v.number() },
  handler: async (ctx, { playerId, amount }) => {
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount");

    const minAmount = await getMinWithdrawalAmount(ctx);
    if (amount < minAmount) {
      throw new Error(`Minimum withdrawal is ${minAmount} COFFEE`);
    }

    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Player not found");

    const totalUsers = (await ctx.db.query("players").collect()).length;
    const miners = await ctx.db
      .query("playerMiners")
      .withIndex("by_player", (q) => q.eq("playerId", playerId))
      .collect();
    const ownsAnyMiner = miners.some((m) => m.quantity > 0);

    const locked = totalUsers < TOKEN_LAUNCH_USER_THRESHOLD || !ownsAnyMiner;
    if (locked) throw new Error("Withdrawals are locked");

    if (player.balance < amount) throw new Error("Insufficient balance");

    const feeAmount = Math.round(amount * WITHDRAWAL_FEE);
    const newBalance = player.balance - amount;
    await ctx.db.patch(playerId, { balance: newBalance });

    const withdrawalId = await ctx.db.insert("withdrawals", {
      playerId,
      amount,
      feeAmount,
      status: "pending",
      createdAt: Date.now(),
    });

    await ctx.db.insert("transactions", {
      playerId,
      type: "withdrawal_request",
      amount: -amount,
      balanceAfter: newBalance,
      meta: { withdrawalId, feeAmount },
      createdAt: Date.now(),
    });

    return { ok: true, withdrawalId, newBalance };
  },
});

// GET /api/withdrawals — this player's own withdrawal history.
export const list = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    return await ctx.db
      .query("withdrawals")
      .withIndex("by_player", (q) => q.eq("playerId", playerId))
      .collect();
  },
});

// Admin-only: marks a pending withdrawal as paid once you've actually sent
// it manually. Restricted to ADMIN_TELEGRAM_ID (see setup above). No UI for
// this yet — call it from the Convex dashboard's Functions tab for now,
// passing your own adminTelegramId and the withdrawalId to mark.
export const markPaid = mutation({
  args: { adminTelegramId: v.string(), withdrawalId: v.id("withdrawals") },
  handler: async (ctx, { adminTelegramId, withdrawalId }) => {
    const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID;
    if (!ADMIN_ID || adminTelegramId !== ADMIN_ID) throw new Error("Not authorized");

    const withdrawal = await ctx.db.get(withdrawalId);
    if (!withdrawal) throw new Error("Withdrawal not found");
    if (withdrawal.status !== "pending") throw new Error("Withdrawal is not pending");

    await ctx.db.patch(withdrawalId, { status: "paid" });
    return { ok: true };
  },
});
