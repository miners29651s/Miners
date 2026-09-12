import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { savePreparedInlineMessage } from "./lib/telegramApi";

// TODO: replace PLACEHOLDER with the Mini App short name from BotFather
// (Bot Settings -> Menu Button / Mini App -> the name after "/newapp").
// The resulting link format is https://t.me/<bot_username>/<short_name>
const MINI_APP_DIRECT_LINK_BASE = "https://t.me/CoffeesMiner_bot/PLACEHOLDER";

// Called right before the user taps Share in the profile. Builds a
// referral-tagged message with working buttons and hands it to Telegram,
// returning an id the frontend passes to WebApp.shareMessage().
export const prepare = action({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }): Promise<{ id: string }> => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) throw new Error("Server misconfigured: TELEGRAM_BOT_TOKEN missing");

    const player = await ctx.runQuery(internal.tasks._getPlayer, { playerId });
    if (!player) throw new Error("Player not found");

    const directLink = `${MINI_APP_DIRECT_LINK_BASE}?startapp=${encodeURIComponent(player.telegramId)}`;

    const text =
      "☕💰 COFFEE MINING IS LIVE 💰☕\n\n" +
      "📈 Mine COFFEE for free, every second\n" +
      "⚙️ Upgrade your miners to boost your hashrate\n" +
      "🪂 Airdrop-style rewards for early players\n" +
      "🤝 Invite friends and earn 10% of what they mine — forever\n\n" +
      "👇 Tap a button below to start mining now";

    const { id } = await savePreparedInlineMessage(botToken, player.telegramId, {
      text,
      buttons: [
        [{ text: "☕ Claim Coffees", url: directLink }],
        [{ text: "▶ Play", url: directLink }],
      ],
    });

    return { id };
  },
});
