// Validates Telegram WebApp `initData` per Telegram's documented HMAC scheme.
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
//
// This MUST run server-side only. Never trust a client-submitted telegramId
// that hasn't been through this check.

import { createHmac } from "node:crypto";

export type TelegramUser = {
  id: number;
  username?: string;
  first_name?: string;
  photo_url?: string;
};

export function validateTelegramInitData(
  initData: string,
  botToken: string
): { ok: true; user: TelegramUser } | { ok: false; reason: string } {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, reason: "missing hash" };
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (computedHash !== hash) {
    return { ok: false, reason: "hash mismatch" };
  }

  const authDate = Number(params.get("auth_date") ?? 0);
  const ageSeconds = Date.now() / 1000 - authDate;
  if (ageSeconds > 86400) {
    return { ok: false, reason: "initData expired" };
  }

  const userRaw = params.get("user");
  if (!userRaw) return { ok: false, reason: "missing user" };
  const user = JSON.parse(userRaw) as TelegramUser;

  return { ok: true, user };
}
