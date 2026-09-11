import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { isChannelMember } from "./lib/telegramApi";

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

export const _getTaskByKey = internalQuery({
  args: { taskKey: v.string() },
  handler: async (ctx, { taskKey }) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_key", (q) => q.eq("key", taskKey))
      .unique();
  },
});

export const _getPlayer = internalQuery({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    return await ctx.db.get(playerId);
  },
});

// The ONLY place that actually pays out a task reward. Not exposed to the
// client directly — only reachable via complete() below.
export const _payout = internalMutation({
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

    return { ok: true as const, reward: task.rewardAmount, newBalance };
  },
});

// POST /api/tasks/complete
// Now an ACTION (not a mutation): verifying channel membership requires an
// external HTTP call, which mutations/queries cannot make in Convex.
export const complete = action({
  args: { playerId: v.id("players"), taskKey: v.string() },
  handler: async (ctx, { playerId, taskKey }) => {
    const task = await ctx.runQuery(internal.tasks._getTaskByKey, { taskKey });
    if (!task || !task.active) throw new Error("Task not found or inactive");

    if (task.type === "channel_join") {
      if (!task.channelId) throw new Error("Task misconfigured: missing channelId");
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) throw new Error("Server misconfigured: TELEGRAM_BOT_TOKEN missing");

      const player = await ctx.runQuery(internal.tasks._getPlayer, { playerId });
      if (!player) throw new Error("Player not found");

      const isMember = await isChannelMember(botToken, task.channelId, player.telegramId);
      if (!isMember) {
        throw new Error("You must join the channel first");
      }
    }

    return await ctx.runMutation(internal.tasks._payout, { playerId, taskKey });
  },
});
