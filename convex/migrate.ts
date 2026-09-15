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

// One-off: fully delete the "telegram_channel_post" task (not just
// deactivate) — being replaced with a different task.
export const deleteChannelPostTask = mutation({
  args: {},
  handler: async (ctx) => {
    const task = await ctx.db
      .query("tasks")
      .withIndex("by_key", (q) => q.eq("key", "telegram_channel_post"))
      .unique();
    if (!task) return { skipped: true };
    await ctx.db.delete(task._id);
    return { deleted: task.key };
  },
});

// One-off: add the "5 referrals in 24h" repeatable sprint task.
export const addReferralSprintTask = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("tasks")
      .withIndex("by_key", (q) => q.eq("key", "referral_sprint_5"))
      .unique();
    if (existing) return { skipped: true };

    await ctx.db.insert("tasks", {
      key: "referral_sprint_5",
      title: "Referral Sprint: bring 5 friends in 24h",
      description: "Start the timer, then invite 5 friends with your referral link before it runs out.",
      rewardAmount: 5000,
      resetPeriod: "none" as const,
      active: true,
      type: "referral_sprint" as const,
      targetCount: 5,
      windowHours: 24,
    });
    return { ok: true };
  },
});

// One-off: bump the referral sprint reward from 5000 to 100000.
export const bumpReferralSprintReward = mutation({
  args: {},
  handler: async (ctx) => {
    const task = await ctx.db
      .query("tasks")
      .withIndex("by_key", (q) => q.eq("key", "referral_sprint_5"))
      .unique();
    if (!task) return { skipped: true };
    await ctx.db.patch(task._id, { rewardAmount: 100000 });
    return { ok: true, newReward: 100000 };
  },
});

// TEMP DEBUG — fast-forwards an active referral sprint to "target reached"
// by lowering its stored baseline, without creating any fake players/
// referrals. Only for testing the claim() payout path. DELETE after use.
export const debugFastForwardSprint = mutation({
  args: { telegramId: v.string(), taskKey: v.string() },
  handler: async (ctx, { telegramId, taskKey }) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_telegramId", (q) => q.eq("telegramId", telegramId))
      .unique();
    if (!player) throw new Error("Player not found");

    const sprint = await ctx.db
      .query("referralSprints")
      .withIndex("by_player_task", (q) => q.eq("playerId", player._id).eq("taskKey", taskKey))
      .order("desc")
      .first();
    if (!sprint) throw new Error("No sprint found — tap Start in the app first");
    if (sprint.status !== "active") throw new Error(`Sprint status is '${sprint.status}', not active`);

    await ctx.db.patch(sprint._id, {
      baselineReferralCount: sprint.baselineReferralCount - sprint.targetCount,
    });
    return { ok: true, message: "Progress faked to target — go tap Claim now" };
  },
});
