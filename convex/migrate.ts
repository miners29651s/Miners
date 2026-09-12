import { mutation } from "./_generated/server";

// One-off: configure the channel-reaction task with the real channel and
// deactivate every other task per current instructions. Safe to run more
// than once — just re-applies the same state.
export const fixupTasksForChannelReaction = mutation({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").collect();
    for (const t of tasks) {
      if (t.key === "telegram_channel_post") {
        await ctx.db.patch(t._id, {
          type: "channel_reaction" as const,
          channelId: "-1004315461765",
          active: true,
        });
      } else {
        await ctx.db.patch(t._id, { active: false });
      }
    }
    return { ok: true };
  },
});
