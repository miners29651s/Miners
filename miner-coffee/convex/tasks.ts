import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // "2026-09-10"
}

// GET /api/tasks — merges task definitions with this player's completion state.
export const list = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const tasks = await ctx.db.query("tasks").filter((q) => q.eq(q.field("active"), true)).collect();
    const period = todayKey();

    const result = [];
    for (const task of tasks) {
      const periodKey = task.resetPeriod === "daily" ? period : "lifetime";
      const done = await ctx.db
        .query("taskCompletions")
        .withIndex("by_player_task_period", (q) =>
          q.eq("playerId", playerId).eq("taskKey", task.key).eq("periodKey", periodKey)
        )
        .unique();
      result.push({ ...task, completed: !!done });
    }
    return result;
  },
});

// POST /api/tasks/complete
// `proof` is intentionally opaque here — in production, verification differs
// per task type (e.g. checking Telegram channel membership/reaction via the
// Bot API, or a signed callback from a video-watch provider). This function
// assumes verification already happened upstream and just pays out once.
export const complete = mutation({
  args: { playerId: v.id("players"), taskKey: v.string() },
  handler: async (ctx, { playerId, taskKey }) => {
    const task = await ctx.db
      .query("tasks")
      .withIndex("by_key", (q) => q.eq("key", taskKey))
      .unique();
    if (!task || !task.active) throw new Error("Task not found or inactive");

    const periodKey = task.resetPeriod === "daily" ? todayKey() : "lifetime";

    const already = await ctx.db
      .query("taskCompletions")
      .withIndex("by_player_task_period", (q) =>
        q.eq("playerId", playerId).eq("taskKey", taskKey).eq("periodKey", periodKey)
      )
      .unique();
    if (already) {
      throw new Error("Task already completed for this period");
    }

    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Player not found");

    const newBalance = player.balance + task.rewardAmount;
    await ctx.db.patch(playerId, { balance: newBalance });

    await ctx.db.insert("taskCompletions", {
      playerId,
      taskKey,
      periodKey,
      createdAt: Date.now(),
    });

    await ctx.db.insert("transactions", {
      playerId,
      type: "task_reward",
      amount: task.rewardAmount,
      balanceAfter: newBalance,
      meta: { taskKey },
      createdAt: Date.now(),
    });

    return { ok: true, reward: task.rewardAmount, newBalance };
  },
});
