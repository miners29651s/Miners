export type SpinPrizeType = "coffee" | "ton" | "none";

export type SpinSegment = {
  id: string;
  type: SpinPrizeType;
  amount: number;
  label: string;
};

export const SPIN_SEGMENTS: SpinSegment[] = [
  { id: "coffee_1000", type: "coffee", amount: 1000, label: "1,000" },
  { id: "empty_1", type: "none", amount: 0, label: "EMPTY" },

  { id: "coffee_5000", type: "coffee", amount: 5000, label: "5,000" },
  { id: "empty_2", type: "none", amount: 0, label: "EMPTY" },

  { id: "coffee_7500", type: "coffee", amount: 7500, label: "7,500" },
  { id: "empty_3", type: "none", amount: 0, label: "EMPTY" },

  { id: "coffee_10000", type: "coffee", amount: 10000, label: "10,000" },
  { id: "empty_4", type: "none", amount: 0, label: "EMPTY" },

  { id: "coffee_25000", type: "coffee", amount: 25000, label: "25,000" },
  { id: "empty_5", type: "none", amount: 0, label: "EMPTY" },

  { id: "coffee_50000", type: "coffee", amount: 50000, label: "50,000" },
  { id: "empty_6", type: "none", amount: 0, label: "EMPTY" },

  { id: "coffee_100000", type: "coffee", amount: 100000, label: "100,000" },
  { id: "empty_7", type: "none", amount: 0, label: "EMPTY" },

  { id: "coffee_1000000", type: "coffee", amount: 1000000, label: "1,000,000" },
  { id: "empty_8", type: "none", amount: 0, label: "EMPTY" },

  { id: "ton_1", type: "ton", amount: 1, label: "1 TON" },
  { id: "empty_9", type: "none", amount: 0, label: "EMPTY" },
];

export const PRIZE_WEIGHTS: Record<string, number> = {
  coffee_1000: 4000,
  coffee_5000: 2000,
  coffee_7500: 1400,
  coffee_10000: 900,
  coffee_25000: 600,
  coffee_50000: 400,
  coffee_100000: 30,
  coffee_1000000: 3,
  ton_1: 1,
  none: 1200,
};

export const SPIN_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function pickWeightedPrize(): {
  id: string;
  segment: SpinSegment;
} {
  const total = Object.values(PRIZE_WEIGHTS).reduce(
    (sum, weight) => sum + weight,
    0,
  );

  let roll = Math.random() * total;

  for (const [id, weight] of Object.entries(PRIZE_WEIGHTS)) {
    roll -= weight;

    if (roll <= 0) {
      if (id === "none") {
        const emptySegments = SPIN_SEGMENTS.filter(
          (segment) => segment.type === "none",
        );

        const segment =
          emptySegments[
            Math.floor(Math.random() * emptySegments.length)
          ];

        return {
          id: segment.id,
          segment,
        };
      }

      const segment = SPIN_SEGMENTS.find(
        (item) => item.id === id,
      );

      if (!segment) {
        throw new Error("Invalid spin prize.");
      }

      return {
        id,
        segment,
      };
    }
  }

  const fallback = SPIN_SEGMENTS[0];

  return {
    id: fallback.id,
    segment: fallback,
  };
}

export function segmentIndexById(id: string): number {
  return SPIN_SEGMENTS.findIndex(
    (segment) => segment.id === id,
  );
}
