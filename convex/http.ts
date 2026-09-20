import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

const MINI_APP_URL = "https://webapp-production-3b00.up.railway.app";

async function telegramApi(method: string, body: unknown) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN missing");
  await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function sendPlain(chatId: number, text: string) {
  await telegramApi("sendMessage", { chat_id: chatId, text });
}

async function sendTelegramMessage(chatId: number, text: string, playUrl: string) {
  await telegramApi("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: {
      inline_keyboard: [
        [{ text: "☕ Claim Coffees", web_app: { url: playUrl }, style: "success" }],
        [{ text: "▶️ Play", web_app: { url: playUrl }, style: "primary" }],
      ],
    },
  });
}

// Single "open the app" button — used by /app and /help.
async function sendOpenApp(chatId: number, text: string) {
  await telegramApi("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: {
      inline_keyboard: [[{ text: "☕ Open Mine-Coffee", web_app: { url: MINI_APP_URL }, style: "primary" }]],
    },
  });
}

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 4 });

// Admin panel via bot commands. Silent for everyone except ADMIN_TELEGRAM_ID (private chat only).
async function handleAdminCommand(ctx: any, chatId: number, text: string) {
  const parts = text.trim().split(/\s+/);
  const cmd = parts[0].split("@")[0].toLowerCase();

  if (cmd === "/stats") {
    const s = await ctx.runQuery(internal.admin.stats, {});
    await sendPlain(
      chatId,
      `Players: ${fmt(s.players)}\nTotal hashrate: ${fmt(s.totalHashrate)} H/s\nTotal COFFEE: ${fmt(s.totalCoffee)}\nTotal TON balance: ${fmt(s.totalTon)}`
    );
    return;
  }

  if (cmd === "/player") {
    const id = parts[1];
    if (!id) return sendPlain(chatId, "Usage: /player <telegramId>");
    const p = await ctx.runQuery(internal.admin.playerInfo, { telegramId: id });
    if (!p) return sendPlain(chatId, "Player not found (he must open the app once).");
    return sendPlain(
      chatId,
      `ID ${p.telegramId} (@${p.username})\nCOFFEE: ${fmt(p.balance)}\nTON: ${fmt(p.tonBalance)}\nHashrate: ${fmt(p.hashrate)} H/s\nMiners: ${p.miners.join(", ") || "-"}`
    );
  }

  if (cmd === "/coffee" || cmd === "/ton") {
    const id = parts[1];
    const amount = Number(parts[2]);
    if (!id || !Number.isFinite(amount) || amount <= 0) {
      return sendPlain(chatId, `Usage: ${cmd} <telegramId> <amount>`);
    }
    if (cmd === "/coffee") {
      const r = await ctx.runMutation(internal.admin.giveCoffee, { telegramId: id, amount });
      if (!r.ok) return sendPlain(chatId, "Player not found (he must open the app once).");
      return sendPlain(chatId, `Done. +${fmt(amount)} COFFEE to ${id}\nNew balance: ${fmt(r.newBalance)}`);
    }
    const r = await ctx.runMutation(internal.admin.giveTon, { telegramId: id, amount });
    if (!r.ok) return sendPlain(chatId, "Player not found (he must open the app once).");
    return sendPlain(chatId, `Done. +${fmt(amount)} TON to ${id}\nNew TON balance: ${fmt(r.newTon)}`);
  }

  // Re-sends every pending gift request (with its "Sent" button).
  if (cmd === "/gifts") {
    const ids = await ctx.runQuery(internal.gifts._pending, {});
    if (ids.length === 0) return sendPlain(chatId, "No pending gifts.");
    for (const id of ids) {
      await ctx.runAction(internal.gifts._notifyAdmin, { claimId: id });
    }
    return;
  }

  if (cmd === "/reset") {
    if (parts[1] !== "CONFIRM") {
      return sendPlain(chatId, "This deletes ALL players, miners and balances.\nSend: /reset CONFIRM");
    }
    const r = await ctx.runMutation(internal.admin.resetAllPlayerData, {});
    return sendPlain(chatId, `Reset done.\n${JSON.stringify(r.deleted)}`);
  }
}

const HELP_TEXT =
  "☕ Mine-Coffee — help\n\n" +
  "⛏ Mine COFFEE every second and tap Claim to collect it.\n" +
  "⚙️ Upgrade your miners with COFFEE to boost your hashrate.\n" +
  "🔷 Buy stronger miners with TON — from your in-app TON balance or straight from your wallet.\n" +
  "🎁 Finish the gift tasks in the Tasks tab to win real Telegram gifts.\n" +
  "🤝 Invite friends and earn 10% of what they mine — forever.\n\n" +
  "Commands:\n/start — start\n/app — open the game\n/help — this message";

const ADMIN_HELP =
  "\n\nAdmin:\n/coffee <id> <amount>\n/ton <id> <amount>\n/player <id>\n/stats\n/gifts\n/reset CONFIRM";

const webhookHandler = httpAction(async (ctx, request) => {
  let update: any;
  try {
    update = await request.json();
  } catch {
    return new Response("ignored", { status: 200 });
  }

  // Admin taps "✅ Sent" under a gift request.
  const cb = update?.callback_query;
  if (cb) {
    const adminId = process.env.ADMIN_TELEGRAM_ID;
    const data = String(cb.data || "");
    const isAdmin = !!adminId && String(cb.from?.id) === adminId;

    if (isAdmin && data.startsWith("gift_sent:")) {
      try {
        const claimId = data.slice("gift_sent:".length);
        const r = await ctx.runMutation(internal.gifts._markSent, { claimId: claimId as any });
        if (r.ok) {
          await telegramApi("answerCallbackQuery", {
            callback_query_id: cb.id,
            text: r.alreadySent ? "Already marked as sent" : "Marked as sent ✅",
          });
          if (cb.message?.chat?.id && cb.message?.message_id) {
            await telegramApi("editMessageReplyMarkup", {
              chat_id: cb.message.chat.id,
              message_id: cb.message.message_id,
              reply_markup: { inline_keyboard: [] },
            });
          }
          if (!r.alreadySent && r.telegramId) {
            try {
              await sendPlain(Number(r.telegramId), `🎁 Your ${r.giftName} gift has been sent to your Telegram profile!`);
            } catch {
              // user may have blocked the bot — ignore
            }
          }
        } else {
          await telegramApi("answerCallbackQuery", { callback_query_id: cb.id, text: "Gift request not found" });
        }
      } catch {
        await telegramApi("answerCallbackQuery", { callback_query_id: cb.id, text: "Error" });
      }
    } else {
      await telegramApi("answerCallbackQuery", { callback_query_id: cb.id });
    }
    return new Response("ok", { status: 200 });
  }

  const message = update?.message;
  const text: string | undefined = message?.text;
  const chatId: number | undefined = message?.chat?.id;

  if (text && chatId && /^\/(coffee|ton|player|stats|reset|gifts)(@\w+)?(\s|$)/i.test(text)) {
    const adminId = process.env.ADMIN_TELEGRAM_ID;
    const isAdmin =
      !!adminId && String(message?.from?.id) === adminId && message?.chat?.type === "private";
    if (isAdmin) {
      try {
        await handleAdminCommand(ctx, chatId, text);
      } catch (err) {
        await sendPlain(chatId, `Error: ${err instanceof Error ? err.message : "unknown"}`);
      }
    }
    return new Response("ok", { status: 200 });
  }

  if (text && chatId && /^\/app(@\w+)?(\s|$)/i.test(text)) {
    await sendOpenApp(chatId, "☕ Tap the button below to open Mine-Coffee.");
    return new Response("ok", { status: 200 });
  }

  if (text && chatId && /^\/help(@\w+)?(\s|$)/i.test(text)) {
    const adminId = process.env.ADMIN_TELEGRAM_ID;
    const isAdmin =
      !!adminId && String(message?.from?.id) === adminId && message?.chat?.type === "private";
    await sendOpenApp(chatId, HELP_TEXT + (isAdmin ? ADMIN_HELP : ""));
    return new Response("ok", { status: 200 });
  }

  if (text && chatId && text.startsWith("/start")) {
    const payload = text.slice("/start".length).trim();
    const playUrl = payload ? `${MINI_APP_URL}?ref=${encodeURIComponent(payload)}` : MINI_APP_URL;

    await sendTelegramMessage(
      chatId,
      "☕💰 COFFEE MINING IS LIVE 💰☕\n\n" +
        "📈 Mine COFFEE for free, every second\n" +
        "⚙️ Upgrade your miners to boost your hashrate\n" +
        "🪂 Airdrop-style rewards for early players\n" +
        "🤝 Invite friends and earn 10% of what they mine — forever\n\n" +
        "👇 Tap a button below to start mining now",
      playUrl
    );
    return new Response("ok", { status: 200 });
  }

  const preCheckout = update?.pre_checkout_query;
  if (preCheckout) {
    const [, minerId] = String(preCheckout.invoice_payload || "").split("|");
    const ok = !!minerId;
    await telegramApi("answerPreCheckoutQuery", {
      pre_checkout_query_id: preCheckout.id,
      ok,
      error_message: ok ? undefined : "Invalid purchase — please try again.",
    });
    return new Response("ok", { status: 200 });
  }

  const successfulPayment = message?.successful_payment;
  if (successfulPayment) {
    const [playerId, minerId] = String(successfulPayment.invoice_payload || "").split("|");
    if (playerId && minerId) {
      await ctx.runMutation(internal.miners._grantStarsMiner, {
        playerId: playerId as any,
        minerId,
        telegramPaymentChargeId: successfulPayment.telegram_payment_charge_id,
        starsAmount: successfulPayment.total_amount,
      });
    }
    return new Response("ok", { status: 200 });
  }

  return new Response("ok", { status: 200 });
});

http.route({
  path: "/telegram-webhook",
  method: "POST",
  handler: webhookHandler,
});

export default http;
