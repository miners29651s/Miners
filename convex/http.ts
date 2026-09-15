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

const webhookHandler = httpAction(async (ctx, request) => {
  let update: any;
  try {
    update = await request.json();
  } catch {
    return new Response("ignored", { status: 200 });
  }

  const message = update?.message;

  const text: string | undefined = message?.text;
  const chatId: number | undefined = message?.chat?.id;
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
