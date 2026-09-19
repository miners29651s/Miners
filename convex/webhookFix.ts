import { internalAction } from "./_generated/server";

export const run = internalAction({
  args: {},
  handler: async () => {
    const t = process.env.TELEGRAM_BOT_TOKEN;
    if (!t) return { error: "TELEGRAM_BOT_TOKEN missing" };
    const api = (m: string, body?: unknown) =>
      fetch(`https://api.telegram.org/bot${t}/${m}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      }).then((r) => r.json());

    const before = await api("getWebhookInfo");
    const set = await api("setWebhook", {
      url: "https://compassionate-mastiff-509.convex.site/telegram-webhook",
      allowed_updates: ["message", "pre_checkout_query"],
    });
    const after = await api("getWebhookInfo");
    return { before: before.result, set, after: after.result };
  },
});
