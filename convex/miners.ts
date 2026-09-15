import { mutation, query, action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  MINER_CATALOG,
  MINER_MAP,
  upgradeCost,
  hashrateAtLevel,
} from "../lib/minerCatalog";

// GET /api/miners/catalog
export const catalog = query({
  args: {},
  handler: async () => MINER_CATALOG,
});

async function recomputeHashrate(ctx: any, playerId: any) {
  const owned = await ctx.db
    .query("playerMiners")
    .withIndex("by_player", (q: any) => q.eq("playerId", playerId))
    .collect();

  let total = 0;
  for (const row of owned) {
    total += row.quantity * hashrateAtLevel(row.minerId, row.level);
  }
  await ctx.db.patch(playerId, { hashrate: total });
}

async function recordTx(
  ctx: any,
  playerId: any,
  type: string,
  amount: number,
  balanceAfter: number,
  meta?: any
) {
  await ctx.db.insert("transactions", {
    playerId,
    type,
    amount,
    balanceAfter,
    meta,
    createdAt: Date.now(),
  });
}

// POST /api/miners/buy — one-time purchase per miner type, COFFEE only.
// Stars-purchased miners go through createStarsInvoice below instead — this
// mutation rejects them so nobody can bypass payment via the COFFEE path.
export const buy = mutation({
  args: { playerId: v.id("players"), minerId: v.string() },
  handler: async (ctx, { playerId, minerId }) => {
    const def = MINER_MAP[minerId];
    if (!def) throw new Error("Unknown miner");
    if (def.costType === "stars") {
      throw new Error("This miner is purchased with Telegram Stars, not COFFEE");
    }

    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Player not found");

    const existing = await ctx.db
      .query("playerMiners")
      .withIndex("by_player_miner", (q) =>
        q.eq("playerId", playerId).eq("minerId", minerId)
      )
      .unique();

    if (existing) {
      throw new Error("Already owned — upgrade it instead of buying again");
    }

    if (player.balance < def.baseCost) {
      throw new Error("Insufficient balance");
    }

    const newBalance = player.balance - def.baseCost;
    await ctx.db.patch(playerId, { balance: newBalance });

    await ctx.db.insert("playerMiners", {
      playerId,
      minerId,
      quantity: 1,
      level: 1,
    });

    await recomputeHashrate(ctx, playerId);
    await recordTx(ctx, playerId, "buy_miner", -def.baseCost, newBalance, { minerId });

    return { ok: true, minerId, newBalance };
  },
});

// POST /api/miners/upgrade — always COFFEE, regardless of how the miner was
// originally purchased (COFFEE or Stars). Unchanged from before.
export const upgrade = mutation({
  args: { playerId: v.id("players"), minerId: v.string() },
  handler: async (ctx, { playerId, minerId }) => {
    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Player not found");

    const owned = await ctx.db
      .query("playerMiners")
      .withIndex("by_player_miner", (q) =>
        q.eq("playerId", playerId).eq("minerId", minerId)
      )
      .unique();

    if (!owned || owned.quantity < 1) {
      throw new Error("You don't own this miner yet");
    }

    const cost = upgradeCost(minerId, owned.level);
    if (player.balance < cost) {
      throw new Error("Insufficient balance");
    }

    const newBalance = player.balance - cost;
    await ctx.db.patch(playerId, { balance: newBalance });
    await ctx.db.patch(owned._id, { level: owned.level + 1 });

    await recomputeHashrate(ctx, playerId);
    await recordTx(ctx, playerId, "upgrade_miner", -cost, newBalance, {
      minerId,
      newLevel: owned.level + 1,
    });

    return { ok: true, minerId, newLevel: owned.level + 1, newBalance };
  },
});

// Helper query for the Miners tab: owned miners + level, merged with catalog.
export const myMiners = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const owned = await ctx.db
      .query("playerMiners")
      .withIndex("by_player", (q) => q.eq("playerId", playerId))
      .collect();

    const ownedMap = new Map(owned.map((o) => [o.minerId, o]));

    return MINER_CATALOG.map((def) => {
      const row = ownedMap.get(def.id);
      const level = row?.level ?? 1;
      return {
        ...def,
        quantity: row?.quantity ?? 0,
        level,
        currentHashratePerUnit: hashrateAtLevel(def.id, level),
        nextUpgradeCost: upgradeCost(def.id, level),
      };
    });
  },
});

// ---------------- Telegram Stars purchase flow ----------------

export const _getPlayer = internalQuery({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => ctx.db.get(playerId),
});

export const _isOwned = internalQuery({
  args: { playerId: v.id("players"), minerId: v.string() },
  handler: async (ctx, { playerId, minerId }) => {
    const existing = await ctx.db
      .query("playerMiners")
      .withIndex("by_player_miner", (q) => q.eq("playerId", playerId).eq("minerId", minerId))
      .unique();
    return !!existing;
  },
});

// POST /api/miners/create-stars-invoice — returns a Telegram invoice link
// the client opens via Telegram.WebApp.openInvoice(). Calling this does NOT
// grant the miner — only a genuine successful_payment webhook event does
// (see convex/http.ts), so this endpoint can't be abused to get a free miner.
export const createStarsInvoice = action({
  args: { playerId: v.id("players"), minerId: v.string() },
  handler: async (ctx, { playerId, minerId }): Promise<{ invoiceLink: string }> => {
    const def = MINER_MAP[minerId];
    if (!def || def.costType !== "stars" || !def.starsCost) {
      throw new Error("This miner is not purchasable with Stars");
    }

    const alreadyOwned = await ctx.runQuery(internal.miners._isOwned, { playerId, minerId });
    if (alreadyOwned) throw new Error("Already owned");

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) throw new Error("Server misconfigured: TELEGRAM_BOT_TOKEN missing");

    // Payload identifies exactly what this invoice is for — read back out of
    // the successful_payment webhook event to know who to grant the miner to.
    const payload = `${playerId}|${minerId}`;

    const res = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: def.name,
        description: `Unlock the ${def.name} — ${def.baseHashrate.toLocaleString("en-US")} H/s`,
        payload,
        currency: "XTR", // Telegram Stars
        prices: [{ label: def.name, amount: def.starsCost }],
        provider_token: "", // required empty string for XTR/Stars payments
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(`Telegram API error: ${data.description || "unknown"}`);

    return { invoiceLink: data.result as string };
  },
});

// Called ONLY from the /telegram-webhook successful_payment handler
// (convex/http.ts) — never exposed to the client directly.
export const _grantStarsMiner = internalMutation({
  args: {
    playerId: v.id("players"),
    minerId: v.string(),
    telegramPaymentChargeId: v.string(),
    starsAmount: v.number(),
  },
  handler: async (ctx, { playerId, minerId, telegramPaymentChargeId, starsAmount }) => {
    // Idempotency: Telegram may retry webhook delivery — never grant twice
    // for the same payment.
    const already = await ctx.db
      .query("starsPurchases")
      .withIndex("by_charge_id", (q) => q.eq("telegramPaymentChargeId", telegramPaymentChargeId))
      .unique();
    if (already) return { ok: true, alreadyProcessed: true };

    const def = MINER_MAP[minerId];
    if (!def) throw new Error(`Unknown miner in payment payload: ${minerId}`);

    const existing = await ctx.db
      .query("playerMiners")
      .withIndex("by_player_miner", (q) => q.eq("playerId", playerId).eq("minerId", minerId))
      .unique();
    if (!existing) {
      await ctx.db.insert("playerMiners", { playerId, minerId, quantity: 1, level: 1 });
      await recomputeHashrate(ctx, playerId);
    }

    await ctx.db.insert("starsPurchases", {
      playerId,
      minerId,
      telegramPaymentChargeId,
      starsAmount,
      createdAt: Date.now(),
    });

    const player = await ctx.db.get(playerId);
    await recordTx(ctx, playerId, "stars_purchase", 0, player?.balance ?? 0, {
      minerId,
      starsAmount,
      telegramPaymentChargeId,
    });

    return { ok: true, alreadyProcessed: false };
  },
});
