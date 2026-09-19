import { mutation } from "./_generated/server";

export const resetAll = mutation({
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
      "starsPurchases",
      "tonPurchases",
    ] as const;

    for (const table of tables) {
      const rows = await ctx.db.query(table).collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
    }

    return { success: true };
  },
});
