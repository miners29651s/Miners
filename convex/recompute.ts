import { internalMutation } from "./_generated/server";
import { hashrateAtLevel } from "../lib/minerCatalog";

export const all = internalMutation({
  args: {},
  handler: async (ctx) => {
    const players = await ctx.db.query("players").collect();
    let updated = 0;
    for (const p of players) {
      const owned = await ctx.db
        .query("playerMiners")
        .withIndex("by_player", (q: any) => q.eq("playerId", p._id))
        .collect();
      let total = 0;
      for (const row of owned) {
        total += row.quantity * hashrateAtLevel(row.minerId, row.level);
      }
      if (total !== p.hashrate) {
        await ctx.db.patch(p._id, { hashrate: total });
        updated++;
      }
    }
    return { players: players.length, updated };
  },
});
