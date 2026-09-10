import { query } from "./_generated/server";
import { v } from "convex/values";
import { REFERRAL_FLAT_BONUS, REFERRAL_DAILY_CAP_PER_USER } from "../lib/minerCatalog";

// Intentionally absent from this file: any binary tree, any percentage-of-
// purchase commission, any multi-level payout. The referral reward is a
// single flat amount, paid once per referred user, capped per referrer per
// day. See /README.md for why.

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Called from convex/mining.ts the moment a referred player completes their
 * FIRST successful claim (their qualifying milestone). Pays the referrer a
 * flat bonus — not a percentage of anything the referred user has spent.
 * Plain helper (not a Convex mutation) so it can run inside claim()'s
 * transaction atomically.
 */
export async function payReferralBonusIfEligible(ctx: any, referredPlayerId: any) {
  const referred = await ctx.db.get(referredPlayerId);
  if (!referred?.referredBy) return;

  const referralRecord = await ctx.db
    .query("referrals")
    .withIndex("by_referred", (q: any) => q.eq("referredId", referredPlayerId))
    .unique();
  if (!referralRecord || referralRecord.bonusPaid) return;

  const referrerId = referred.referredBy;

  // Anti-abuse: cap flat bonuses paid to one referrer per calendar day.
  const period = todayKey();
  const todaysBonuses = await ctx.db
    .query("transactions")
    .withIndex("by_player", (q: any) => q.eq("playerId", referrerId))
    .filter((q: any) => q.eq(q.field("type"), "referral_bonus"))
    .collect();
  const paidToday = todaysBonuses.filter(
    (t: any) => new Date(t.createdAt).toISOString().slice(0, 10) === period
  ).length;
  if (paidToday >= REFERRAL_DAILY_CAP_PER_USER) return;

  const referrer = await ctx.db.get(referrerId);
  if (!referrer) return;

  const newBalance = referrer.balance + REFERRAL_FLAT_BONUS;
  await ctx.db.patch(referrerId, { balance: newBalance });
  await ctx.db.patch(referralRecord._id, {
    bonusPaid: true,
    bonusAmount: REFERRAL_FLAT_BONUS,
  });
  await ctx.db.insert("transactions", {
    playerId: referrerId,
    type: "referral_bonus",
    amount: REFERRAL_FLAT_BONUS,
    balanceAfter: newBalance,
    meta: { referredPlayerId },
    createdAt: Date.now(),
  });
}

// GET /api/referrals
export const list = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const referrals = await ctx.db
      .query("referrals")
      .withIndex("by_referrer", (q) => q.eq("referrerId", playerId))
      .collect();
    return {
      count: referrals.length,
      totalBonusEarned: referrals.reduce((s, r) => s + r.bonusAmount, 0),
      flatBonusAmount: REFERRAL_FLAT_BONUS,
    };
  },
});
