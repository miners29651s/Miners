"use client";

import { MinerIcon } from "./MinerIcon";

export type MinerCardData = {
  id: string;
  name: string;
  tier: number;
  colorFrom: string;
  colorTo: string;
  baseCost: number;
  quantity: number; // 0 = not owned, 1 = owned (one-time purchase model)
  level: number;
  currentHashratePerUnit: number;
  nextUpgradeCost: number;
};

export function MinerCard({
  miner,
  balance,
  onBuy,
  onUpgrade,
}: {
  miner: MinerCardData;
  balance: number;
  onBuy: () => void;
  onUpgrade: () => void;
}) {
  const owned = miner.quantity > 0;
  const cost = owned ? miner.nextUpgradeCost : miner.baseCost;
  const canAfford = balance >= cost;
  const action = owned ? onUpgrade : onBuy;

  return (
    <button
      onClick={action}
      disabled={!canAfford}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "14px 8px 10px",
        borderRadius: 16,
        border: owned ? "1px solid var(--bronze)" : "1px solid #241c14",
        background: "var(--bg-metal)",
        textAlign: "center",
        opacity: canAfford ? 1 : 0.55,
      }}
    >
      {owned && (
        <span
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            fontSize: 10,
            fontWeight: 700,
            color: "#2a1c0c",
            background: "var(--gold)",
            borderRadius: 6,
            padding: "1px 6px",
          }}
        >
          Lv {miner.level}
        </span>
      )}

      <MinerIcon colorFrom={miner.colorFrom} colorTo={miner.colorTo} tier={miner.tier} size={56} />

      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>{miner.name}</div>
      <div style={{ fontSize: 11, color: "var(--gold)" }}>
        {miner.currentHashratePerUnit.toLocaleString()} H/s
      </div>

      <div
        style={{
          marginTop: 6,
          width: "100%",
          padding: "6px 4px",
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 600,
          background: canAfford ? "#1a1206" : "#141414",
          color: canAfford ? "var(--gold)" : "var(--text-dim)",
          border: "1px solid var(--bronze)",
        }}
      >
        {owned ? "Upgrade" : "Buy"} · {cost.toLocaleString()}
      </div>
    </button>
  );
}

