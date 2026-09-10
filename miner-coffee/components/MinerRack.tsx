"use client";

import { MinerCard, MinerCardData } from "./MinerCard";

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
    <div style={{ padding: 12 }}>
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
