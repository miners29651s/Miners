import { query } from "./_generated/server";
import { v } from "convex/values";
import { REFERRAL_BONUS_PERCENT, MAX_REFERRAL_BONUS_PER_DAY } from "../lib/minerCatalog";

// Intentionally absent from this file: any binary tree, any multi-level
// chain, any commission tied to real-money purchases. This is a SINGLE
// LEVEL override — a referrer earns a % bonus only on their DIRECT
// referrals' mining claims. That referral's own referrals pay nothing
// upstream. The bonus is additional COFFEE credited to the referrer; it is
// never deducted from the referred player's own claim. See /README.md.

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Called from convex/mining.ts on EVERY successful claim by a referred
 * player. Pays their referrer REFERRAL_BONUS_PERCENT of that claim, capped
 * per referrer per calendar day. Plain helper (not a Convex mutation) so it
 * runs inside claim()'s transaction atomically.
 */
export async function payReferralOverride(
  ctx: any,
  referredPlayerId: any,
  claimedAmount: number
) {
  if (claimedAmount <= 0) return;

  const referred = await ctx.db.get(referredPlayerId);
  if (!referred?.referredBy) return;

  const referralRecord = await ctx.db
    .query("referrals")
    .withIndex("by_referred", (q: any) => q.eq("referredId", referredPlayerId))
    .unique();
  if (!referralRecord) return;

  const referrerId = referred.referredBy;
  const referrer = await ctx.db.get(referrerId);
  if (!referrer) return;

  // Anti-abuse: cap total referral-override COFFEE paid to one referrer per day.
  const period = todayKey();
  const recentTx = await ctx.db
    .query("transactions")
    .withIndex("by_player", (q: any) => q.eq("playerId", referrerId))
    .filter((q: any) => q.eq(q.field("type"), "referral_bonus"))
    .collect();
  const paidToday = recentTx
    .filter((t: any) => new Date(t.createdAt).toISOString().slice(0, 10) === period)
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const remainingCapToday = MAX_REFERRAL_BONUS_PER_DAY - paidToday;
  if (remainingCapToday <= 0) return;

  const rawBonus = claimedAmount * REFERRAL_BONUS_PERCENT;
  const bonus = Math.min(rawBonus, remainingCapToday);
  if (bonus <= 0) return;

  const newBalance = referrer.balance + bonus;
  await ctx.db.patch(referrerId, { balance: newBalance });
  await ctx.db.patch(referralRecord._id, {
    bonusPaid: true,
    bonusAmount: referralRecord.bonusAmount + bonus,
  });
  await ctx.db.insert("transactions", {
    playerId: referrerId,
    type: "referral_bonus",
    amount: bonus,
    balanceAfter: newBalance,
    meta: { referredPlayerId, sourceClaimAmount: claimedAmount },
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
      bonusPercent: REFERRAL_BONUS_PERCENT * 100,
    };
  },
});

