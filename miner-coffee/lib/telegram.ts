// Thin wrapper around the Telegram WebApp SDK (loaded via <script> in layout.tsx).
// See: https://core.telegram.org/bots/webapps

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        ready: () => void;
        expand: () => void;
        initDataUnsafe: {
          start_param?: string;
          user?: { id: number; username?: string };
        };
      };
    };
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
export function getReferralCode(): string | undefined {
  return getTelegramWebApp()?.initDataUnsafe?.start_param;
}
