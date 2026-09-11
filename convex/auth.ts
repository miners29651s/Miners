import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { validateTelegramInitData } from "./lib/telegramAuth";

// POST /api/auth equivalent — call this once on app load with Telegram's
// window.Telegram.WebApp.initData raw string.
export const authenticate = mutation({
  args: { initData: v.string(), referralCode: v.optional(v.string()) },
  handler: async (ctx, { initData, referralCode }) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) throw new Error("Server misconfigured: TELEGRAM_BOT_TOKEN missing");

    const result = await validateTelegramInitData(initData, botToken);
    if (!result.ok) {
      throw new Error(`Telegram auth failed: ${result.reason}`);
    }
    const tgUser = result.user;
    const telegramId = String(tgUser.id);

    const existing = await ctx.db
      .query("players")
      .withIndex("by_telegramId", (q) => q.eq("telegramId", telegramId))
      .unique();

    if (existing) {
      return existing._id;
    }

    // Resolve referrer, if a valid referral code (= referrer's telegramId) was passed.
    let referredBy = undefined as any;
    if (referralCode && referralCode !== telegramId) {
      const referrer = await ctx.db
        .query("players")
        .withIndex("by_telegramId", (q) => q.eq("telegramId", referralCode))
        .unique();
      if (referrer) referredBy = referrer._id;
    }

    const playerId = await ctx.db.insert("players", {
      telegramId,
      username: tgUser.username,
      avatarUrl: tgUser.photo_url,
      balance: 0,
      totalEarned: 0,
      hashrate: 0,
      pendingMining: 0,
      lastMiningTick: Date.now(),
      referredBy,
      createdAt: Date.now(),
    });

    if (referredBy) {
      await ctx.db.insert("referrals", {
        referrerId: referredBy,
        referredId: playerId,
        bonusPaid: false,
        bonusAmount: 0,
        createdAt: Date.now(),
      });
    }

    return playerId;
  },
});

// GET /api/me equivalent
export const me = query({
  args: { telegramId: v.string() },
  handler: async (ctx, { telegramId }) => {
    return await ctx.db
      .query("players")
      .withIndex("by_telegramId", (q) => q.eq("telegramId", telegramId))
      .unique();
  },
});
