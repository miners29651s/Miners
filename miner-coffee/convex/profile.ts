import { query } from "./_generated/server";
import { v } from "convex/values";
import { TOKEN_LAUNCH_USER_THRESHOLD, WITHDRAWAL_FEE } from "../lib/minerCatalog";

// GET /api/profile
export const get = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Player not found");

    const miners = await ctx.db
      .query("playerMiners")
      .withIndex("by_player", (q) => q.eq("playerId", playerId))
      .collect();

    const referrals = await ctx.db
      .query("referrals")
      .withIndex("by_referrer", (q) => q.eq("referrerId", playerId))
      .collect();

    const totalUsers = (await ctx.db.query("players").collect()).length;
    const ownsAnyMiner = miners.some((m) => m.quantity > 0);

    return {
      telegramId: player.telegramId,
      username: player.username,
      avatarUrl: player.avatarUrl,
      balance: player.balance,
      totalEarned: player.totalEarned,
      hashrate: player.hashrate,
      minersOwned: miners.reduce((s, m) => s + m.quantity, 0),
      referralCount: referrals.length,
      withdrawal: {
        locked: totalUsers < TOKEN_LAUNCH_USER_THRESHOLD || !ownsAnyMiner,
        feePercent: WITHDRAWAL_FEE * 100,
        usersNeeded: Math.max(0, TOKEN_LAUNCH_USER_THRESHOLD - totalUsers),
      },
    };
  },
});
