declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        ready: () => void;
        expand: () => void;
        openTelegramLink: (url: string) => void;
        openInvoice: (url: string, callback?: (status: "paid" | "cancelled" | "failed" | "pending") => void) => void;
        shareMessage: (msg_id: string, callback?: (sent: boolean) => void) => void;
        initDataUnsafe: {
          start_param?: string;
          user?: { id: number; username?: string };
        };
      };
    };
  }
}

export const BOT_USERNAME = "CoffeesMiner_bot";

export function getReferralLink(telegramId: string): string {
  return `https://t.me/${BOT_USERNAME}?start=${telegramId}`;
}

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

export function getInitData(): string {
  return getTelegramWebApp()?.initData ?? "";
}

export function getReferralCode(): string | undefined {
  const fromStartParam = getTelegramWebApp()?.initDataUnsafe?.start_param;
  if (fromStartParam) return fromStartParam;
  if (typeof window === "undefined") return undefined;
  const fromQuery = new URLSearchParams(window.location.search).get("ref");
  return fromQuery ?? undefined;
}

export function openTelegramInvoice(
  invoiceLink: string
): Promise<"paid" | "cancelled" | "failed" | "pending" | "unavailable"> {
  return new Promise((resolve) => {
    const tg = getTelegramWebApp();
    if (!tg) {
      resolve("unavailable");
      return;
    }
    tg.openInvoice(invoiceLink, (status) => resolve(status));
  });
}
