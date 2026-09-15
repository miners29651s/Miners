"use client";

import { MinerIcon } from "./MinerIcon";

export type MinerCardData = {
  id: string;
  name: string;
  tier: number;
  colorFrom: string;
  colorTo: string;
  baseCost: number;
  quantity: number;
  level: number;
  currentHashratePerUnit: number;
  nextUpgradeCost: number;
  asset?: string;
  costType?: "coffee" | "stars";
  starsCost?: number;
};

export function MinerCard({
  miner,
  balance,
  busy,
  onBuy,
  onUpgrade,
}: {
  miner: MinerCardData;
  balance: number;
  busy?: boolean;
  onBuy: () => void;
  onUpgrade: () => void;
}) {
  const owned = miner.quantity > 0;
  const isStars = miner.costType === "stars";

  const cost = owned ? miner.nextUpgradeCost : isStars ? miner.starsCost ?? 0 : miner.baseCost;
  const canAfford = owned || isStars ? true : balance >= cost;
  const action = owned ? onUpgrade : onBuy;

  return (
    <button
      onClick={action}
      disabled={(!canAfford && !isStars) || busy}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "14px 8px 10px",
        borderRadius: 16,
        border: owned ? "1px solid var(--bronze)" : isStars ? "1px solid #7dd3fc" : "1px solid #241c14",
        background: "var(--bg-metal)",
        textAlign: "center",
        opacity: busy ? 0.6 : canAfford || isStars ? 1 : 0.55,
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

      {!owned && isStars && (
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            fontSize: 10,
            fontWeight: 700,
            color: "#0c1c2a",
            background: "#7dd3fc",
            borderRadius: 6,
            padding: "1px 6px",
          }}
        >
          PREMIUM
        </span>
      )}

      <MinerIcon colorFrom={miner.colorFrom} colorTo={miner.colorTo} tier={miner.tier} size={56} asset={miner.asset} />

      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>{miner.name}</div>
      <div style={{ fontSize: 11, color: "var(--gold)" }}>
        {miner.currentHashratePerUnit.toLocaleString("en-US")} H/s
      </div>

      <div
        style={{
          marginTop: 6,
          width: "100%",
          padding: "6px 4px",
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 600,
          background: canAfford || isStars ? "#1a1206" : "#141414",
          color: canAfford || isStars ? "var(--gold)" : "var(--text-dim)",
          border: "1px solid var(--bronze)",
        }}
      >
        {busy
          ? "Processing..."
          : owned
          ? `Upgrade · ${cost.toLocaleString("en-US")}`
          : isStars
          ? `⭐ ${cost.toLocaleString("en-US")}`
          : `Buy · ${cost.toLocaleString("en-US")}`}
      </div>
    </button>
  );
}
