export type SpinPrizeType = "coffee" | "ton" | "none";

export type SpinSegment = {
  id: string;
  type: SpinPrizeType;
  amount: number;
  label: string;
};

export const SPIN_SEGMENTS: SpinSegment[] = [
  { id: "coffee_1000",    type: "coffee", amount: 1000,    label: "1,000" },
  { id: "coffee_5000",    type: "coffee", amount: 5000,    label: "5,000" },
  { id: "empty_1",        type: "none",   amount: 0,       label: "Try Again" },
  { id: "coffee_7500",    type: "coffee", amount: 7500,    label: "7,500" },
  { id: "empty_2",        type: "none",   amount: 0,       label: "Try Again" },
  { id: "coffee_10000",   type: "coffee", amount: 10000,   label: "10,000" },
  { id: "empty_3",        type: "none",   amount: 0,       label: "Try Again" },
  { id: "coffee_25000",   type: "coffee", amount: 25000,   label: "25,000" },
  { id: "empty_4",        type: "none",   amount: 0,       label: "Try Again" },
  { id: "coffee_50000",   type: "coffee", amount: 50000,   label: "50,000" },
  { id: "empty_5",        type: "none",   amount: 0,       label: "Try Again" },
  { id: "coffee_100000",  type: "coffee", amount: 100000,  label: "100,000" },
  { id: "empty_6",        type: "none",   amount: 0,       label: "Try Again" },
  { id: "coffee_1000000", type: "coffee", amount: 1000000, label: "1,000,000" },
  { id: "empty_7",        type: "none",   amount: 0,       label: "Try Again" },
  { id: "ton_1",          type: "ton",    amount: 1,       label: "1 TON" },
  { id: "empty_8",        type: "none",   amount: 0,       label: "Try Again" },
];

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
