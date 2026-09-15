"use client";

import { MinerCard, MinerCardData } from "./MinerCard";

export function MinerRack({
  miners,
  balance,
  busyMinerId,
  onBuy,
  onUpgrade,
}: {
  miners: MinerCardData[];
  balance: number;
  busyMinerId?: string | null;
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
          busy={busyMinerId === m.id}
          onBuy={() => onBuy(m.id)}
          onUpgrade={() => onUpgrade(m.id)}
        />
      ))}
    </div>
  );
}
