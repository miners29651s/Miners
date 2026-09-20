import { mutation, query, internalMutation, internalQuery, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { GIFT_CATALOG, GIFT_MAP, evaluateGift, PlayerStats } from "../lib/giftCatalog";

async function getStats(ctx: any, playerId: any): Promise<PlayerStats> {
  const player = await ctx.db.get(playerId);
  if (!player) throw new Error("Player not found");
  const refs = await ctx.db
    .query("referrals")
    .withIndex("by_referrer", (q: any) => q.eq("referrerId", playerId))
    .collect();
  const miners = await ctx.db
    .query("playerMiners")
    .withIndex("by_player", (q: any) => q.eq("playerId", playerId))
    .collect();
  return {
    referrals: refs.length,
    hashrate: player.hashrate,
    earned: player.totalEarned,
    owned: miners.filter((m: any) => m.quantity > 0).map((m: any) => m.minerId),
  };
}

// All gifts with the player's live progress + status (locked | ready | pending | sent).
export const list = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const stats = await getStats(ctx, playerId);
    const claims = await ctx.db
      .query("giftClaims")
      .withIndex("by_player", (q) => q.eq("playerId", playerId))
      .collect();
    const claimMap = new Map(claims.map((c) => [c.giftId, c]));

    return GIFT_CATALOG.map((g) => {
      const ev = evaluateGift(g, stats);
      const claim = claimMap.get(g.id);
      const status: "locked" | "ready" | "pending" | "sent" = claim
        ? claim.status
        : ev.allMet
        ? "ready"
        : "locked";
      return {
        id: g.id,
        name: g.name,
        emoji: g.emoji,
        reqs: ev.reqs,
        progress: ev.progress,
        status,
      };
    });
  },
});

// Server-authoritative: requirements are re-checked here, once per player per gift.
export const claim = mutation({
  args: { playerId: v.id("players"), giftId: v.string() },
  handler: async (ctx, { playerId, giftId }) => {
    const gift = GIFT_MAP[giftId];
    if (!gift) throw new Error("Unknown gift");

    const existing = await ctx.db
      .query("giftClaims")
      .withIndex("by_player_gift", (q) => q.eq("playerId", playerId).eq("giftId", giftId))
      .unique();
    if (existing) throw new Error("Already claimed");

    const stats = await getStats(ctx, playerId);
    if (!evaluateGift(gift, stats).allMet) throw new Error("Requirements not completed yet");

    const claimId = await ctx.db.insert("giftClaims", {
      playerId,
      giftId,
      status: "pending",
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.gifts._notifyAdmin, { claimId });
    return { ok: true as const };
  },
});

export const _claimInfo = internalQuery({
  args: { claimId: v.id("giftClaims") },
  handler: async (ctx, { claimId }) => {
    const claim = await ctx.db.get(claimId);
    if (!claim) return null;
    const player = await ctx.db.get(claim.playerId);
    if (!player) return null;
    const gift = GIFT_MAP[claim.giftId];
    if (!gift) return null;
    const stats = await getStats(ctx, claim.playerId);
    return {
      status: claim.status,
      telegramId: player.telegramId,
      username: player.username ?? "",
      giftName: gift.name,
      emoji: gift.emoji,
      referrals: stats.referrals,
      hashrate: stats.hashrate,
    };
  },
});

export const _pending = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("giftClaims")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    return rows.map((r) => r._id);
  },
});

export const _markSent = internalMutation({
  args: { claimId: v.id("giftClaims") },
  handler: async (ctx, { claimId }) => {
    const claim = await ctx.db.get(claimId);
    if (!claim) return { ok: false as const };
    const player = await ctx.db.get(claim.playerId);
    const gift = GIFT_MAP[claim.giftId];
    const alreadySent = claim.status === "sent";
    if (!alreadySent) {
      await ctx.db.patch(claim._id, { status: "sent", sentAt: Date.now() });
    }
    return {
      ok: true as const,
      alreadySent,
      telegramId: player?.telegramId ?? null,
      giftName: gift?.name ?? claim.giftId,
    };
  },
});

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Sends the admin a message with the user's id/link + a "Sent" button.
export const _notifyAdmin = internalAction({
  args: { claimId: v.id("giftClaims") },
  handler: async (ctx, { claimId }) => {
    const adminId = process.env.ADMIN_TELEGRAM_ID;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!adminId || !botToken) return;

    const info = await ctx.runQuery(internal.gifts._claimInfo, { claimId });
    if (!info || info.status !== "pending") return;

    const uname = info.username ? `@${esc(info.username)}` : "(no username)";
    const text =
      `🎁 <b>Gift task completed</b>\n\n` +
      `Gift: ${info.emoji} <b>${esc(info.giftName)}</b>\n` +
      `User: <a href="tg://user?id=${info.telegramId}">${info.telegramId}</a> ${uname}\n` +
      `Referrals: ${info.referrals}\n` +
      `Hashrate: ${info.hashrate.toLocaleString("en-US")} H/s\n\n` +
      `Send the gift to his profile, then tap the button below.`;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: adminId,
        text,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "✅ Sent", callback_data: `gift_sent:${claimId}` }]],
        },
      }),
    });
  },
});
