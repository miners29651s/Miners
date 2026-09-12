// Thin wrapper around the Telegram WebApp SDK (loaded via <script> in layout.tsx).
// See: https://core.telegram.org/bots/webapps

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        ready: () => void;
        expand: () => void;
        openTelegramLink: (url: string) => void;
        initDataUnsafe: {
          start_param?: string;
          user?: { id: number; username?: string };
        };
      };
    };
  }
}

// Bot username used to build the shareable referral deep link. Update this
// if the bot is ever renamed in BotFather.
export const BOT_USERNAME = "CoffeesMiner_bot";

/** Deep link that, when opened, passes the referrer's telegramId as start_param. */
export function getReferralLink(telegramId: string): string {
  return `https://t.me/${BOT_USERNAME}?start=${telegramId}`;
}

/** Opens Telegram's native share sheet pre-filled with the referral link. */
export function shareReferralLink(telegramId: string, text: string) {
  const link = getReferralLink(telegramId);
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
  const tg = getTelegramWebApp();
  if (tg) {
    tg.openTelegramLink(shareUrl);
  } else if (typeof window !== "undefined") {
    window.open(shareUrl, "_blank");
  }
}

/** Copies the referral link to clipboard; returns whether it succeeded. */
export async function copyReferralLink(telegramId: string): Promise<boolean> {
  const link = getReferralLink(telegramId);
  try {
    await navigator.clipboard.writeText(link);
    return true;
  } catch {
    return false;
  }
}

export function getTelegramWebApp() {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

export function initTelegram() {
  const tg = getTelegramWebApp();
  if (!tg) return null;
  tg.ready();
  tg.expand();
  return tg;
}

/** Raw initData string to send to convex/auth.ts:authenticate for server-side validation. */
export function getInitData(): string {
  return getTelegramWebApp()?.initData ?? "";
}

/** Referral code passed via the bot's start_param, e.g. t.me/bot?start=12345. */
/**
 * Referral code, checked in priority order:
 * 1. `start_param` — set when the app is opened via a `t.me/bot?startapp=` deep link.
 * 2. `?ref=` URL query param — set when opened via the bot webhook's "▶️ Play"
 *    inline button (convex/http.ts), which builds the Mini App URL itself.
 */
export function getReferralCode(): string | undefined {
  const fromStartParam = getTelegramWebApp()?.initDataUnsafe?.start_param;
  if (fromStartParam) return fromStartParam;

  if (typeof window !== "undefined") {
    const fromQuery = new URLSearchParams(window.location.search).get("ref");
    if (fromQuery) return fromQuery;
  }

  return undefined;
}

