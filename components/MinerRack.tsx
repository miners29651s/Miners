"use client";

import { MinerCard, MinerCardData } from "./MinerCard";

// Grid of square cards (Hamster Kombat style) instead of a scrolling list.
export function MinerRack({
  miners,
  balance,
  onBuy,
  onUpgrade,
}: {
  miners: MinerCardData[];
  balance: number;
  onBuy: (minerId: string) => void;
  onUpgrade: (minerId: string) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 10,
        padding: 12,
      }}
    >
      {miners.map((m) => (
        <MinerCard
          key={m.id}
          miner={m}
          balance={balance}
          onBuy={() => onBuy(m.id)}
          onUpgrade={() => onUpgrade(m.id)}
        />
      ))}
    </div>
  );
}

