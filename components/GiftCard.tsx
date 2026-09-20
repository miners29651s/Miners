"use client";

import { useState } from "react";

export type GiftCardData = {
  id: string;
  name: string;
  emoji: string;
  progress: number;
  status: "locked" | "ready" | "pending" | "sent";
  reqs: { label: string; current: number; target: number; met: boolean }[];
};

export function GiftCard({
  gift,
  busy,
  onClaim,
}: {
  gift: GiftCardData;
  busy?: boolean;
  onClaim: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const pct = Math.round(gift.progress * 100);
  const canClaim = gift.status === "ready" && !busy;

  const label =
    busy
      ? "..."
      : gift.status === "ready"
      ? "Claim gift"
      : gift.status === "pending"
      ? "Waiting for delivery"
      : gift.status === "sent"
      ? "Sent ✓"
      : `${pct}% · complete the steps`;

  return (
    <div
      style={{
        border: gift.status === "ready" ? "1px solid var(--gold)" : "1px solid #1c1c1c",
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        background: "var(--bg-metal)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 12,
            background: "#0f0a06",
            border: "1px solid var(--bronze)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {!imgFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/gifts/${gift.id}.png`}
              alt={gift.name}
              onError={() => setImgFailed(true)}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          ) : (
            <span style={{ fontSize: 34 }}>{gift.emoji}</span>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{gift.name}</div>
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 6 }}>
            Real Telegram gift sent to your profile
          </div>
          <div style={{ height: 8, borderRadius: 4, background: "#1c1c1c", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${gift.status === "locked" ? pct : 100}%`,
                background: "var(--gold)",
                borderRadius: 4,
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        {gift.reqs.map((r, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              padding: "3px 0",
              color: r.met ? "#5ac97a" : "var(--text-dim)",
            }}
          >
            <span>
              {r.met ? "✓" : "○"} {r.label}
            </span>
            <span>
              {r.target > 1 ? `${r.current.toLocaleString("en-US")} / ${r.target.toLocaleString("en-US")}` : r.met ? "Done" : "0 / 1"}
            </span>
          </div>
        ))}
      </div>

      <button
        disabled={!canClaim}
        onClick={onClaim}
        style={{
          width: "100%",
          padding: 10,
          borderRadius: 8,
          border: "1px solid var(--bronze)",
          background: canClaim ? "#1a1206" : "#141414",
          color: canClaim ? "var(--gold)" : gift.status === "sent" ? "#5ac97a" : "var(--text-dim)",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {label}
      </button>
    </div>
  );
}
