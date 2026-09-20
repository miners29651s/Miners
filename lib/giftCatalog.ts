// Gift tasks — edit ONLY here to change gifts, requirements or targets.
// Image for each gift: public/gifts/<id>.png (falls back to the emoji if missing).

export type GiftReqKind = "referrals" | "hashrate" | "miner" | "earned";

export type GiftReq = {
  kind: GiftReqKind;
  target: number;
  minerId?: string; // only for kind "miner"
  label: string;
};

export type GiftDef = {
  id: string;
  name: string;
  emoji: string;
  reqs: GiftReq[];
};

export const GIFT_CATALOG: GiftDef[] = [
  {
    id: "bear",
    name: "Telegram Bear",
    emoji: "🧸",
    reqs: [
      { kind: "referrals", target: 10, label: "Invite 10 friends" },
      { kind: "miner", target: 1, minerId: "starter", label: "Own a Starter Miner" },
      { kind: "earned", target: 100_000, label: "Earn 100,000 COFFEE" },
    ],
  },
  {
    id: "rose",
    name: "Telegram Rose",
    emoji: "🌹",
    reqs: [
      { kind: "referrals", target: 5, label: "Invite 5 friends" },
      { kind: "earned", target: 50_000, label: "Earn 50,000 COFFEE" },
    ],
  },
  {
    id: "box",
    name: "Telegram Gift Box",
    emoji: "🎁",
    reqs: [
      { kind: "referrals", target: 20, label: "Invite 20 friends" },
      { kind: "hashrate", target: 50_000, label: "Reach 50,000 H/s" },
    ],
  },
  {
    id: "rocket",
    name: "Telegram Rocket",
    emoji: "🚀",
    reqs: [
      { kind: "referrals", target: 50, label: "Invite 50 friends" },
      { kind: "miner", target: 1, minerId: "platinum", label: "Own a Platinum Miner" },
    ],
  },
  {
    id: "trophy",
    name: "Telegram Trophy",
    emoji: "🏆",
    reqs: [
      { kind: "referrals", target: 100, label: "Invite 100 friends" },
      { kind: "hashrate", target: 500_000, label: "Reach 500,000 H/s" },
    ],
  },
];

export const GIFT_MAP: Record<string, GiftDef> = Object.fromEntries(
  GIFT_CATALOG.map((g) => [g.id, g])
);

export type PlayerStats = {
  referrals: number;
  hashrate: number;
  earned: number;
  owned: string[]; // miner ids the player owns
};

export function evaluateGift(gift: GiftDef, stats: PlayerStats) {
  const reqs = gift.reqs.map((r) => {
    let current = 0;
    if (r.kind === "referrals") current = stats.referrals;
    else if (r.kind === "hashrate") current = stats.hashrate;
    else if (r.kind === "earned") current = stats.earned;
    else if (r.kind === "miner") current = stats.owned.includes(r.minerId ?? "") ? 1 : 0;
    return {
      label: r.label,
      kind: r.kind,
      current: Math.min(current, r.target),
      target: r.target,
      met: current >= r.target,
    };
  });
  const progress = reqs.reduce((s, r) => s + r.current / r.target, 0) / reqs.length;
  return { reqs, progress, allMet: reqs.every((r) => r.met) };
}
