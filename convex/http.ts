import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

const BOT_USERNAME = "CoffeesMiner_bot";

const WELCOME_MESSAGE = `Welcome to COFFEE Mining Bot! ☕

Start mining COFFEE for free, upgrade your miners, complete tasks, and invite friends to earn 10% of everything they mine — forever.

Tap the menu button below to open the app and start mining.`;

http.route({
  path: "/telegram-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const update = await request.json();
    const message = update.message;
    const text: string | undefined = message?.text;
    const chatId = message?.chat?.id;
    const fromId = message?.from?.id;

    if (chatId && text && text.startsWith("/start")) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken) {
        const referralLink = `https://t.me/${BOT_USERNAME}?start=${fromId}`;

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: WELCOME_MESSAGE,
            reply_markup: {
              inline_keyboard: [
                [{ text: "Claim ☕️ Coffees", url: referralLink }],
              ],
            },
          }),
        });
      }
    }

    return new Response(null, { status: 200 });
  }),
});

export default http;
