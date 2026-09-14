import { mutation, internalQuery, action } from "./_generated/server";

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

// TEMP DIAGNOSTIC — dump every task row with all fields (type, channelId
// included) to debug why a channel-gated task paid out without real
// membership verification. Safe/read-only.
export const debugListTasks = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tasks").collect();
  },
});

// TEMP DIAGNOSTIC — dump all players (id + telegramId only).
export const debugListPlayers = internalQuery({
  args: {},
  handler: async (ctx) => {
    const players = await ctx.db.query("players").collect();
    return players.map((p) => ({ id: p._id, telegramId: p.telegramId, username: p.username }));
  },
});

// TEMP DIAGNOSTIC — live-check real Telegram channel membership for both
// known telegramIds against @AirDrop_coffee, bypassing the players/tasks
// tables entirely. Tells us exactly what the Bot API says right now.
export const debugCheckChannelMembership = action({
  args: {},
  handler: async (ctx) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN!;
    const ids = ["8683193974", "8030373785"];
    const results: Record<string, any> = {};
    for (const id of ids) {
      const url = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=@AirDrop_coffee&user_id=${id}`;
      const res = await fetch(url);
      const data = await res.json();
      results[id] = data;
    }
    return results;
  },
});
