import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

// Telegram bot webhook. Handles the /start command and replies with a
// message containing a "▶️ Play" button that opens the Mini App — carrying
// forward whatever referral payload came with /start (e.g. from someone
// else's shared referral link), via a ?ref= query param on the Mini App URL.
//
// This is INDEPENDENT of the bot's Menu Button (set via BotFather), which
// keeps working exactly as before — this webhook only adds a reply message
// with its own button, it doesn't touch the Menu Button at all.

const http = httpRouter();

// Same Railway domain the Mini App is deployed to. Update this if the
// Railway domain ever changes.
const MINI_APP_URL = "https://webapp-production-3b00.up.railway.app";

async function sendTelegramMessage(
  chatId: number,
  text: string,
  playUrl: string
) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN missing");

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "▶️ Play",
              web_app: { url: playUrl },
            },
          ],
        ],
      },
    }),
  });
}

const webhookHandler = httpAction(async (_ctx, request) => {
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
    // "/start 123456789" -> payload is "123456789" (the referrer's telegramId).
    const payload = text.slice("/start".length).trim();
    const playUrl = payload ? `${MINI_APP_URL}?ref=${encodeURIComponent(payload)}` : MINI_APP_URL;

    await sendTelegramMessage(
      chatId,
      "Welcome to COFFEE Mining Bot! ☕\n\nTap ▶️ Play below to start mining.",
      playUrl
    );
  }

  // Always 200 — Telegram retries aggressively on non-2xx responses.
  return new Response("ok", { status: 200 });
});

http.route({
  path: "/telegram-webhook",
  method: "POST",
  handler: webhookHandler,
});

export default http;

