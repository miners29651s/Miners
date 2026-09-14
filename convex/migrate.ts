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

// One-off: add the welcome bonus task — join the announcement channel once,
// claim a one-time COFFEE bonus, task then disappears from the list
// (see tasks.list's resetPeriod "none" filtering). Safe to re-run — it
// skips insertion if the task already exists.
export const addWelcomeJoinTask = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("tasks")
      .withIndex("by_key", (q) => q.eq("key", "welcome_join_channel"))
      .unique();
    if (existing) return { skipped: true };

    await ctx.db.insert("tasks", {
      key: "welcome_join_channel",
      title: "Join our channel",
      description: "Join our Telegram channel to claim your welcome bonus.",
      rewardAmount: 500,
      resetPeriod: "none" as const,
      active: true,
      type: "channel_join" as const,
      channelId: "@AirDrop_coffee",
    });
    return { ok: true };
  },
});
