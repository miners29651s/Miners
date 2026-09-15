import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function countReferrals(ctx: any, playerId: any): Promise<number> {
  const referrals = await ctx.db.query("referrals").withIndex("by_referrer", (q: any) => q.eq("referrerId", playerId)).collect();
  return referrals.length;
}

export const getStatus = query({
  args: { playerId: v.id("players"), taskKey: v.string() },
  handler: async (ctx, { playerId, taskKey }) => {
    const sprint = await ctx.db
      .query("referralSprints")
      .withIndex("by_player_task", (q) => q.eq("playerId", playerId).eq("taskKey", taskKey))
      .order("desc")
      .first();
    if (!sprint) return null;

    if (sprint.status === "active" && Date.now() > sprint.deadline) {
      return { ...sprint, status: "expired" as const };
    }

    const currentReferralCount = await countReferrals(ctx, playerId);
    const progress = Math.max(0, currentReferralCount - sprint.baselineReferralCount);
    return { ...sprint, progress };
  },
});

export const start = mutation({
  args: { playerId: v.id("players"), taskKey: v.string() },
  handler: async (ctx, { playerId, taskKey }) => {
    const task = await ctx.db.query("tasks").withIndex("by_key", (q) => q.eq("key", taskKey)).unique();
    if (!task || !task.active || task.type !== "referral_sprint") throw new Error("Task not found or misconfigured");

    const existing = await ctx.db
      .query("referralSprints")
      .withIndex("by_player_task", (q) => q.eq("playerId", playerId).eq("taskKey", taskKey))
      .order("desc")
      .first();
    if (existing && existing.status === "active" && Date.now() <= existing.deadline) {
      throw new Error("A sprint is already in progress");
    }

    const baselineReferralCount = await countReferrals(ctx, playerId);
    const windowMs = (task.windowHours ?? 24) * 60 * 60 * 1000;
    const now = Date.now();

    await ctx.db.insert("referralSprints", {
      playerId,
      taskKey,
      startedAt: now,
      deadline: now + windowMs,
      baselineReferralCount,
      targetCount: task.targetCount ?? 5,
      status: "active",
    });

    return { ok: true, deadline: now + windowMs };
  },
});

export const claim = mutation({
  args: { playerId: v.id("players"), taskKey: v.string() },
  handler: async (ctx, { playerId, taskKey }) => {
    const task = await ctx.db.query("tasks").withIndex("by_key", (q) => q.eq("key", taskKey)).unique();
    if (!task) throw new Error("Task not found");

    const sprint = await ctx.db
      .query("referralSprints")
      .withIndex("by_player_task", (q) => q.eq("playerId", playerId).eq("taskKey", taskKey))
      .order("desc")
      .first();
    if (!sprint || sprint.status !== "active") throw new Error("No active sprint to claim");
    if (Date.now() > sprint.deadline) {
      await ctx.db.patch(sprint._id, { status: "expired" });
      throw new Error("Sprint expired — start a new one");
    }

    const currentReferralCount = await countReferrals(ctx, playerId);
    const progress = currentReferralCount - sprint.baselineReferralCount;
    if (progress < sprint.targetCount) throw new Error(`Not enough referrals yet (${progress}/${sprint.targetCount})`);

    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Player not found");

    const newBalance = player.balance + task.rewardAmount;
    await ctx.db.patch(playerId, { balance: newBalance });
    await ctx.db.patch(sprint._id, { status: "won", claimedAt: Date.now() });

    await ctx.db.insert("transactions", {
      playerId,
      type: "task_reward",
      amount: task.rewardAmount,
      balanceAfter: newBalance,
      meta: { taskKey, sprintId: sprint._id },
      createdAt: Date.now(),
    });

    return { ok: true, reward: task.rewardAmount, newBalance };
  },
});
