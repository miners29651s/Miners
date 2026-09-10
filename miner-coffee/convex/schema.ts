import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// NOTE: No `binary` table, no `expiresAt` field anywhere — both features are
// intentionally excluded from this build (see /README.md).

export default defineSchema({
  players: defineTable({
    telegramId: v.string(), // stable Telegram user id, unique
    username: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    balance: v.number(), // authoritative COFFEE balance (server-only writes)
    totalEarned: v.number(),
    hashrate: v.number(), // denormalized cache, recomputed on every miner change
    pendingMining: v.number(),
    lastMiningTick: v.number(), // ms epoch, last time pending was accrued
    referredBy: v.optional(v.id("players")),
    createdAt: v.number(),
  }).index("by_telegramId", ["telegramId"]),

  playerMiners: defineTable({
    playerId: v.id("players"),
    minerId: v.string(), // matches lib/minerCatalog.ts id, e.g. "mini"
    quantity: v.number(), // how many copies owned
    level: v.number(), // shared level applied to ALL copies of this miner for this player
  }).index("by_player", ["playerId"]).index("by_player_miner", ["playerId", "minerId"]),

  transactions: defineTable({
    playerId: v.id("players"),
    type: v.union(
      v.literal("claim"),
      v.literal("buy_miner"),
      v.literal("upgrade_miner"),
      v.literal("task_reward"),
      v.literal("referral_bonus")
    ),
    amount: v.number(), // positive = credit, negative = debit
    balanceAfter: v.number(),
    meta: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_player", ["playerId"]),

  tasks: defineTable({
    key: v.string(), // "daily_youtube" | "telegram_channel_post" | "invite_friends"
    title: v.string(),
    description: v.string(),
    rewardAmount: v.number(),
    resetPeriod: v.union(v.literal("daily"), v.literal("none")),
    active: v.boolean(),
  }).index("by_key", ["key"]),

  taskCompletions: defineTable({
    playerId: v.id("players"),
    taskKey: v.string(),
    periodKey: v.string(), // e.g. "2026-09-10" for daily tasks, "lifetime" for one-off
    createdAt: v.number(),
  }).index("by_player_task_period", ["playerId", "taskKey", "periodKey"]),

  referrals: defineTable({
    referrerId: v.id("players"),
    referredId: v.id("players"),
    bonusPaid: v.boolean(),
    bonusAmount: v.number(),
    createdAt: v.number(),
  }).index("by_referrer", ["referrerId"]).index("by_referred", ["referredId"]),

  withdrawals: defineTable({
    playerId: v.id("players"),
    amount: v.number(),
    feeAmount: v.number(),
    status: v.union(v.literal("locked"), v.literal("pending"), v.literal("paid")),
    createdAt: v.number(),
  }).index("by_player", ["playerId"]),

  settings: defineTable({
    key: v.string(),
    value: v.any(),
  }).index("by_key", ["key"]),
});
