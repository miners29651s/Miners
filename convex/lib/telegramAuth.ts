// Validates Telegram WebApp `initData` per Telegram's documented HMAC scheme.
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
//
// This MUST run server-side only. Never trust a client-submitted telegramId
// that hasn't been through this check.

// Uses the standard Web Crypto API (globalThis.crypto.subtle) instead of
// Node's "node:crypto" module, so this runs in Convex's default (non-Node)
// runtime without needing a "use node" action split.

export type TelegramUser = {
  id: number;
  username?: string;
  first_name?: string;
  photo_url?: string;
};

const textEncoder = new TextEncoder();

async function hmacSha256(keyBytes: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, textEncoder.encode(message));
}

function bufferToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function validateTelegramInitData(
  initData: string,
  botToken: string
): Promise<{ ok: true; user: TelegramUser } | { ok: false; reason: string }> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, reason: "missing hash" };
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  // secretKey = HMAC_SHA256(key="WebAppData", data=botToken)
  const secretKey = await hmacSha256(textEncoder.encode("WebAppData"), botToken);
  // computedHash = HMAC_SHA256(key=secretKey, data=dataCheckString)
  const computedHashBuf = await hmacSha256(secretKey, dataCheckString);
  const computedHash = bufferToHex(computedHashBuf);

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
