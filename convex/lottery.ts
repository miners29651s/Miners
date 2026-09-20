import {
  mutation,
  query,
  internalMutation,
  internalQuery,
  internalAction,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  LOTTERY_TIERS,
  LotteryTier,
  MAX_TICKETS_PER_PURCHASE,
  ROUND_DURATION_MS,
  isValidTier,
  round6,
  thresholdTon,
  ticketPriceCoffee,
  ticketPriceTon,
} from "../lib/lotteryCatalog";

async function sendAdminMessage(text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  if (!botToken || !adminId) return;
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: adminId, text }),
  });
}

async function getOrCreateActiveRound(ctx: any, tier: LotteryTier) {
  const existing = await ctx.db
    .query("lotteryRounds")
    .withIndex("by_tier_status", (q: any) => q.eq("tier", tier).eq("status", "active"))
    .unique();
  if (existing) return existing;

  const now = Date.now();
  const id = await ctx.db.insert("lotteryRounds", {
    tier,
    status: "active",
    totalCollectedTon: 0,
    ticketsSold: 0,
    startedAt: now,
    drawAt: now + ROUND_DURATION_MS,
  });
  return await ctx.db.get(id);
}

export const getLotteryState = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const tiers = await Promise.all(
      LOTTERY_TIERS.map(async (tier) => {
        const round = await ctx.db
          .query("lotteryRounds")
          .withIndex("by_tier_status", (q) => q.eq("tier", tier).eq("status", "active"))
          .unique();

        let myTickets = 0;
        if (round) {
          const mine = await ctx.db
            .query("lotteryTickets")
            .withIndex("by_round", (q) => q.eq("roundId", round._id))
            .filter((q) => q.eq(q.field("playerId"), playerId))
            .collect();
          myTickets = mine.reduce((sum, t) => sum + t.quantity, 0);
        }

        return {
          tier,
          ticketPriceTon: ticketPriceTon(tier),
          ticketPriceCoffee: ticketPriceCoffee(tier),
          thresholdTon: thresholdTon(tier),
          totalCollectedTon: round?.totalCollectedTon ?? 0,
          ticketsSold: round?.ticketsSold ?? 0,
          myTickets,
          drawAt: round?.drawAt ?? null,
        };
      })
    );
    return tiers;
  },
});

export const buyTicket = mutation({
  args: {
    playerId: v.id("players"),
    tier: v.number(),
    quantity: v.number(),
    paymentMethod: v.union(v.literal("ton"), v.literal("coffee")),
  },
  handler: async (ctx, { playerId, tier, quantity, paymentMethod }) => {
    if (!isValidTier(tier)) throw new Error("Invalid lottery tier.");
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_TICKETS_PER_PURCHASE) {
      throw new Error(`Ticket quantity must be between 1 and ${MAX_TICKETS_PER_PURCHASE}.`);
    }

    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Player not found.");

    const round = await getOrCreateActiveRound(ctx, tier);

    const costTon = round6(ticketPriceTon(tier) * quantity);
    const costCoffee = ticketPriceCoffee(tier) * quantity;

    let newBalance = player.balance;
    let newTonBalance = player.tonBalance ?? 0;
    let paidAmount: number;

    if (paymentMethod === "ton") {
      if (newTonBalance + 1e-9 < costTon) throw new Error("Insufficient TON balance.");
      newTonBalance = round6(newTonBalance - costTon);
      paidAmount = costTon;
    } else {
      if (player.balance + 1e-6 < costCoffee) throw new Error("Insufficient COFFEE balance.");
      newBalance = player.balance - costCoffee;
      paidAmount = costCoffee;
    }

    await ctx.db.patch(playerId, { balance: newBalance, tonBalance: newTonBalance });

    await ctx.db.insert("lotteryTickets", {
      roundId: round._id,
      playerId,
      tier,
      quantity,
      paymentMethod,
      paidAmount,
      tonValue: costTon,
      createdAt: Date.now(),
    });

    await ctx.db.patch(round._id, {
      totalCollectedTon: round6(round.totalCollectedTon + costTon),
      ticketsSold: round.ticketsSold + quantity,
    });

    await ctx.db.insert("transactions", {
      playerId,
      type: "lottery_ticket",
      amount: paymentMethod === "ton" ? -costTon : -costCoffee,
      balanceAfter: paymentMethod === "ton" ? newTonBalance : newBalance,
      meta: { tier, quantity, paymentMethod },
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.lottery.notifyAdminEntry, {
      telegramId: player.telegramId,
      username: player.username ?? "-",
      tier,
      quantity,
      paymentMethod,
    });

    return { ok: true as const, newBalance, newTonBalance };
  },
});

export const notifyAdminEntry = internalAction({
  args: {
    telegramId: v.string(),
    username: v.string(),
    tier: v.number(),
    quantity: v.number(),
    paymentMethod: v.union(v.literal("ton"), v.literal("coffee")),
  },
  handler: async (_ctx, args) => {
    await sendAdminMessage(
      `Lottery entry\n` +
        `Player: ${args.username} (${args.telegramId})\n` +
        `Tier: ${args.tier} TON\n` +
        `Tickets: ${args.quantity}\n` +
        `Paid with: ${args.paymentMethod.toUpperCase()}`
    );
  },
});

export const getDueRounds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const rounds = await ctx.db
      .query("lotteryRounds")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    return rounds.filter((r) => r.drawAt <= now);
  },
});

export const settleRound = internalMutation({
  args: { roundId: v.id("lotteryRounds") },
  handler: async (ctx, { roundId }) => {
    const round = await ctx.db.get(roundId);
    if (!round || round.status !== "active") return { drawn: false as const };

    const threshold = thresholdTon(round.tier as LotteryTier);
    if (round.totalCollectedTon < threshold) {
      await ctx.db.patch(roundId, { drawAt: Date.now() + ROUND_DURATION_MS });
      return { drawn: false as const };
    }

    const tickets = await ctx.db
      .query("lotteryTickets")
      .withIndex("by_round", (q) => q.eq("roundId", roundId))
      .collect();

    if (tickets.length === 0 || round.ticketsSold === 0) {
      await ctx.db.patch(roundId, { drawAt: Date.now() + ROUND_DURATION_MS });
      return { drawn: false as const };
    }

    let roll = Math.floor(Math.random() * round.ticketsSold);
    let winnerId = tickets[0].playerId;
    let winnerTickets = tickets[0].quantity;
    for (const ticket of tickets) {
      roll -= ticket.quantity;
      if (roll < 0) {
        winnerId = ticket.playerId;
        winnerTickets = ticket.quantity;
        break;
      }
    }

    const winner = await ctx.db.get(winnerId);
    if (!winner) {
      await ctx.db.patch(roundId, { drawAt: Date.now() + ROUND_DURATION_MS });
      return { drawn: false as const };
    }

    const newTonBalance = round6((winner.tonBalance ?? 0) + round.tier);
    await ctx.db.patch(winnerId, { tonBalance: newTonBalance });

    await ctx.db.insert("transactions", {
      playerId: winnerId,
      type: "lottery_payout",
      amount: round.tier,
      balanceAfter: newTonBalance,
      meta: { roundId, tier: round.tier, ticketsSold: round.ticketsSold },
      createdAt: Date.now(),
    });

    await ctx.db.patch(roundId, {
      status: "completed",
      winnerId,
      winnerTickets,
      completedAt: Date.now(),
    });

    const now = Date.now();
    await ctx.db.insert("lotteryRounds", {
      tier: round.tier,
      status: "active",
      totalCollectedTon: 0,
      ticketsSold: 0,
      startedAt: now,
      drawAt: now + ROUND_DURATION_MS,
    });

    return {
      drawn: true as const,
      tier: round.tier,
      winnerTelegramId: winner.telegramId,
      winnerUsername: winner.username ?? "-",
      ticketsSold: round.ticketsSold,
      totalCollectedTon: round.totalCollectedTon,
      prizeTon: round.tier,
      profitTon: round6(round.totalCollectedTon - round.tier),
    };
  },
});

export const processDraws = internalAction({
  args: {},
  handler: async (ctx) => {
    const dueRounds = await ctx.runQuery(internal.lottery.getDueRounds, {});
    for (const round of dueRounds) {
      const result = await ctx.runMutation(internal.lottery.settleRound, {
        roundId: round._id,
      });
      if (result.drawn) {
        await sendAdminMessage(
          `Lottery draw completed\n` +
            `Tier: ${result.tier} TON\n` +
            `Winner: ${result.winnerUsername} (${result.winnerTelegramId})\n` +
            `Tickets sold: ${result.ticketsSold}\n` +
            `Collected: ${result.totalCollectedTon} TON\n` +
            `Prize paid: ${result.prizeTon} TON\n` +
            `Network profit: ${result.profitTon} TON`
        );
      }
    }
  },
});
