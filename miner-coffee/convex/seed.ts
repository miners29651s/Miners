import { mutation } from "./_generated/server";

// Run once after `convex dev` starts, e.g. via the Convex dashboard's
// "Run function" panel, or `npx convex run seed:seedTasks`.
export const seedTasks = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("tasks").collect();
    if (existing.length > 0) return { skipped: true };

    const rows = [
      {
        key: "daily_youtube",
        title: "Watch today's video",
        description: "Watch the featured YouTube video to the end.",
        rewardAmount: 200,
        resetPeriod: "daily" as const,
        active: true,
      },
      {
        key: "telegram_channel_post",
        title: "Check the channel",
        description: "View or react to the latest post in our Telegram channel.",
        rewardAmount: 150,
        resetPeriod: "daily" as const,
        active: true,
      },
      {
        key: "invite_friends",
        title: "Invite 5 friends",
        description: "Bring 5 new users within 24 hours using your referral link.",
        rewardAmount: 1000,
        resetPeriod: "none" as const,
        active: true,
      },
    ];

    for (const row of rows) {
      await ctx.db.insert("tasks", row);
    }
    return { seeded: rows.length };
  },
});
