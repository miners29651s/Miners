import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// NOTE: No `binary` table, no `expiresAt` field anywhere — both features are
// intentionally excluded from this build (see /README.md).

export default defineSchema({
  players: defineTable({
    telegramId: v.string(),
    username: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    balance: v.number(),
    totalEarned: v.number(),
    hashrate: v.number(),
    pendingMining: v.number(),
    lastMiningTick: v.number(),
    referredBy: v.optional(v.id("players")),
    createdAt: v.number(),

    // --- TON balance (separate from in-game COFFEE balance) ---
    tonBalance: v.optional(v.number()),

    // --- Lucky wheel: server-authoritative pending reward ---
    pendingSpinReward: v.optional(v.number()),
    pendingSpinRewardType: v.optional(v.union(v.literal("coffee"), v.literal("ton"), v.literal("none"))),
    pendingSpinRewardId: v.optional(v.string()),
    pendingSpinRewardAt: v.optional(v.number()),
    lastSpinClaimedAt: v.optional(v.number()),
    freeSpinsAvailable: v.optional(v.number()),
  }).index("by_telegramId", ["telegramId"]),

  playerMiners: defineTable({
    playerId: v.id("players"),
    minerId: v.string(),
    quantity: v.number(),
    level: v.number(),
  }).index("by_player", ["playerId"]).index("by_player_miner", ["playerId", "minerId"]),

  transactions: defineTable({
    playerId: v.id("players"),
    type: v.union(
      v.literal("claim"),
      v.literal("buy_miner"),
      v.literal("upgrade_miner"),
      v.literal("task_reward"),
      v.literal("referral_bonus"),
      v.literal("withdrawal_request"),
      v.literal("stars_purchase"),
      v.literal("ton_purchase"),
      v.literal("spin_reward"),
      v.literal("exchange"),
      v.literal("lottery_ticket"),
      v.literal("lottery_payout")
    ),
    amount: v.number(),
    balanceAfter: v.number(),
    meta: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_player", ["playerId"]),

  tasks: defineTable({
    key: v.string(),
    title: v.string(),
    description: v.string(),
    rewardAmount: v.number(),
    resetPeriod: v.union(v.literal("daily"), v.literal("none")),
    active: v.boolean(),
    type: v.optional(
      v.union(
        v.literal("channel_join"),
        v.literal("channel_reaction"),
        v.literal("manual"),
        v.literal("referral_sprint")
      )
    ),
    channelId: v.optional(v.string()),
    targetCount: v.optional(v.number()),
    windowHours: v.optional(v.number()),
  }).index("by_key", ["key"]),

  taskCompletions: defineTable({
    playerId: v.id("players"),
    taskKey: v.string(),
    periodKey: v.string(),
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

  taskReactions: defineTable({
    channelId: v.string(),
    messageId: v.number(),
    telegramId: v.string(),
    reactedAt: v.number(),
  }).index("by_channel_message_user", ["channelId", "messageId", "telegramId"]),

  referralSprints: defineTable({
    playerId: v.id("players"),
    taskKey: v.string(),
    startedAt: v.number(),
    deadline: v.number(),
    baselineReferralCount: v.number(),
    targetCount: v.number(),
    status: v.union(v.literal("active"), v.literal("won"), v.literal("expired")),
    claimedAt: v.optional(v.number()),
  }).index("by_player_task", ["playerId", "taskKey"]),

  starsPurchases: defineTable({
    playerId: v.id("players"),
    minerId: v.string(),
    telegramPaymentChargeId: v.string(),
    starsAmount: v.number(),
    createdAt: v.number(),
  }).index("by_player", ["playerId"]).index("by_charge_id", ["telegramPaymentChargeId"]),

  tonPurchases: defineTable({
    playerId: v.id("players"),
    minerId: v.string(),
    txHash: v.string(),
    tonAmountNano: v.string(),
    createdAt: v.number(),
  }).index("by_player", ["playerId"]).index("by_tx_hash", ["txHash"]),

  giftClaims: defineTable({
    playerId: v.id("players"),
    giftId: v.string(),
    status: v.union(v.literal("pending"), v.literal("sent")),
    createdAt: v.number(),
    sentAt: v.optional(v.number()),
  })
    .index("by_player", ["playerId"])
    .index("by_player_gift", ["playerId", "giftId"])
    .index("by_status", ["status"]),

  // --- Lottery ---
  lotteryRounds: defineTable({
    tier: v.number(), // prize amount in TON: 1 | 10 | 100 | 1000
    status: v.union(v.literal("active"), v.literal("completed")),
    totalCollectedTon: v.number(),
    ticketsSold: v.number(),
    startedAt: v.number(),
    drawAt: v.number(),
    winnerId: v.optional(v.id("players")),
    winnerTickets: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  }).index("by_tier_status", ["tier", "status"]),

  lotteryTickets: defineTable({
    roundId: v.id("lotteryRounds"),
    playerId: v.id("players"),
    tier: v.number(),
    quantity: v.number(),
    paymentMethod: v.union(v.literal("ton"), v.literal("coffee")),
    paidAmount: v.number(),
    tonValue: v.number(),
    createdAt: v.number(),
  }).index("by_round", ["roundId"]).index("by_player", ["playerId"]),
});
