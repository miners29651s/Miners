import { internalMutation } from "./_generated/server";

// DESTRUCTIVE — wipes all per-player data so the whole bot starts fresh
// for every user (not just one account). Catalog tables (tasks, settings)
// are left untouched. Only runnable via CLI/dashboard (internalMutation —
// no client can call this).
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
