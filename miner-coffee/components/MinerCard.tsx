"use client";

export type MinerCardData = {
  id: string;
  name: string;
  asset: string;
  baseCost: number;
  quantity: number;
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
  const canAfford = balance >= miner.baseCost;
  const canUpgrade = miner.quantity > 0 && balance >= miner.nextUpgradeCost;

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: 12,
        borderRadius: 12,
        border: "1px solid #1c1c1c",
        background: "var(--bg-metal)",
        marginBottom: 10,
      }}
    >
      <img
        src={`/miners/${miner.asset}`}
        alt={miner.name}
        width={56}
        height={56}
        style={{ borderRadius: 8, objectFit: "cover", background: "#111" }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{miner.name}</span>
          <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
            OWNED ×{miner.quantity}
          </span>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-dim)", margin: "4px 0" }}>
          Lv {miner.level} · {miner.currentHashratePerUnit.toLocaleString()} H/s each
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button
            onClick={onBuy}
            disabled={!canAfford}
            style={{
              flex: 1,
              padding: "8px 6px",
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid var(--bronze)",
              background: canAfford ? "#1a1206" : "#141414",
              color: canAfford ? "var(--gold)" : "var(--text-dim)",
            }}
          >
            {miner.quantity > 0 ? "Buy more" : "Buy"} · {miner.baseCost.toLocaleString()}
          </button>
          <button
            onClick={onUpgrade}
            disabled={!canUpgrade}
            style={{
              flex: 1,
              padding: "8px 6px",
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid var(--bronze)",
              background: canUpgrade ? "#1a1206" : "#141414",
              color: canUpgrade ? "var(--gold)" : "var(--text-dim)",
            }}
          >
            Upgrade · {miner.nextUpgradeCost.toLocaleString()}
          </button>
        </div>
      </div>
    </div>
  );
}
