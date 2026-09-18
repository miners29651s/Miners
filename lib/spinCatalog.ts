// Visual layout of the 17-slice wheel, in clockwise order starting at 12
// o'clock — exactly the order requested. This controls what's SHOWN and
// where the wheel lands; it does NOT control odds (see PRIZE_WEIGHTS).
export type SpinPrizeType = "coffee" | "ton" | "none";

export type SpinSegment = {
  id: string;
  type: SpinPrizeType;
  amount: number;
  label: string;
  color: string;
  icon: string | null; // path under /public
};

export const SPIN_SEGMENTS: SpinSegment[] = [
  { id: "coffee_1000",    type: "coffee", amount: 1000,    label: "1,000",     color: "#f2c744", icon: "/spin/icon_1000.png" },
  { id: "coffee_5000",    type: "coffee", amount: 5000,    label: "5,000",     color: "#3ecf6e", icon: "/spin/icon_5000.png" },
  { id: "empty_1",        type: "none",   amount: 0,       label: "Try Again", color: "#0a0a0a", icon: null },
  { id: "coffee_7500",    type: "coffee", amount: 7500,    label: "7,500",     color: "#3a9bfc", icon: "/spin/icon_7500.png" },
  { id: "empty_2",        type: "none",   amount: 0,       label: "Try Again", color: "#0a0a0a", icon: null },
  { id: "coffee_10000",   type: "coffee", amount: 10000,   label: "10,000",    color: "#ff8a3d", icon: "/spin/icon_10000.png" },
  { id: "empty_3",        type: "none",   amount: 0,       label: "Try Again", color: "#0a0a0a", icon: null },
  { id: "coffee_25000",   type: "coffee", amount: 25000,   label: "25,000",    color: "#ff4fa3", icon: "/spin/icon_25000.png" },
  { id: "empty_4",        type: "none",   amount: 0,       label: "Try Again", color: "#0a0a0a", icon: null },
  { id: "coffee_50000",   type: "coffee", amount: 50000,   label: "50,000",    color: "#26c6da", icon: "/spin/icon_50000.png" },
  { id: "empty_5",        type: "none",   amount: 0,       label: "Try Again", color: "#0a0a0a", icon: null },
  { id: "coffee_100000",  type: "coffee", amount: 100000,  label: "100,000",   color: "#ab47f5", icon: "/spin/icon_100000.png" },
  { id: "empty_6",        type: "none",   amount: 0,       label: "Try Again", color: "#0a0a0a", icon: null },
  { id: "coffee_1000000", type: "coffee", amount: 1000000, label: "1,000,000", color: "#ffb300", icon: "/spin/icon_1000000.png" },
  { id: "empty_7",        type: "none",   amount: 0,       label: "Try Again", color: "#0a0a0a", icon: null },
  { id: "ton_1",          type: "ton",    amount: 1,       label: "1 TON",     color: "#4fd1ff", icon: "/spin/icon_ton.png" },
  { id: "empty_8",        type: "none",   amount: 0,       label: "Try Again", color: "#0a0a0a", icon: null },
];

// Odds — fully independent of the visual layout above.
// Win% = weight / SUM(all weights). "none" is split evenly across the 8
// empty slices, so the wheel can visually land on any one of them.
export const PRIZE_WEIGHTS: Record<string, number> = {
  coffee_1000: 3000,
  coffee_5000: 2500,
  coffee_7500: 1500,
  coffee_10000: 1000,
  coffee_25000: 600,
  coffee_50000: 250,
  coffee_100000: 80,
  coffee_1000000: 5,
  ton_1: 2,
  none: 1000,
};

// 24h reset, exactly as requested. A free spin (from a new referral) bypasses
// this once — see grantFreeSpin() in convex/spin.ts.
export const SPIN_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function pickWeightedPrize(): { id: string; segment: SpinSegment } {
  const total = Object.values(PRIZE_WEIGHTS).reduce((s, w) => s + w, 0);
  let roll = Math.random() * total;
  for (const [id, weight] of Object.entries(PRIZE_WEIGHTS)) {
    roll -= weight;
    if (roll <= 0) {
      if (id === "none") {
        const emptySlots = SPIN_SEGMENTS.filter((s) => s.type === "none");
        const seg = emptySlots[Math.floor(Math.random() * emptySlots.length)];
        return { id: seg.id, segment: seg };
      }
      const seg = SPIN_SEGMENTS.find((s) => s.id === id)!;
      return { id, segment: seg };
    }
  }
  return { id: SPIN_SEGMENTS[0].id, segment: SPIN_SEGMENTS[0] };
}

export function segmentIndexById(id: string): number {
  return SPIN_SEGMENTS.findIndex((s) => s.id === id);
}
