// Prize table for the home-screen lucky wheel. Weights are relative, not
// percentages — pickWeightedPrize() normalizes them itself.
// Win% = weight / SUM(all weights). Adjust amounts/weights here any time;
// nothing else in the app needs to change.
export type SpinPrizeType = "coffee" | "ton" | "none";

export type SpinPrize = {
  id: string;
  label: string;
  type: SpinPrizeType;
  amount: number;
  weight: number;
};

export const SPIN_PRIZES: SpinPrize[] = [
  { id: "coffee_1000",    label: "+1,000 Coffee",     type: "coffee", amount: 1000,    weight: 3000 },
  { id: "coffee_5000",    label: "+5,000 Coffee",     type: "coffee", amount: 5000,    weight: 2500 },
  { id: "coffee_7500",    label: "+7,500 Coffee",     type: "coffee", amount: 7500,    weight: 1500 },
  { id: "coffee_10000",   label: "+10,000 Coffee",    type: "coffee", amount: 10000,   weight: 1000 },
  { id: "coffee_25000",   label: "+25,000 Coffee",    type: "coffee", amount: 25000,   weight: 600 },
  { id: "coffee_50000",   label: "+50,000 Coffee",    type: "coffee", amount: 50000,   weight: 250 },
  { id: "coffee_100000",  label: "+100,000 Coffee",   type: "coffee", amount: 100000,  weight: 80 },
  { id: "coffee_1000000", label: "+1,000,000 Coffee", type: "coffee", amount: 1000000, weight: 5 },
  { id: "ton_1",          label: "+1 TON",            type: "ton",    amount: 1,       weight: 2 },
  { id: "empty",          label: "Try Again",         type: "none",   amount: 0,       weight: 1000 },
];

// How often a player can spin. Set to 0 while testing, restore before launch.
export const SPIN_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function pickWeightedPrize(): SpinPrize {
  const total = SPIN_PRIZES.reduce((sum, p) => sum + p.weight, 0);
  let roll = Math.random() * total;
  for (const prize of SPIN_PRIZES) {
    roll -= prize.weight;
    if (roll <= 0) return prize;
  }
  return SPIN_PRIZES[0];
}
