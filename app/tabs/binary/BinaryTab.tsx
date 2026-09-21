"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { BOT_USERNAME } from "../../../lib/telegram";

function getBinaryReferralLink(telegramId: string) {
  return `https://t.me/${BOT_USERNAME}?start=bin_${telegramId}`;
}

export function BinaryTab({ playerId }: { playerId: string }) {
  const profile = useQuery(api.profile.get, { playerId: playerId as any });
  const state = useQuery(api.binaryReferral.getMyBinaryState, { playerId: playerId as any });

  if (!state || !profile) return null;
  const telegramId = profile.telegramId;

  const slotStyle: React.CSSProperties = {
    flex: 1,
    padding: "14px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,193,7,0.35)",
    background: "#151515",
    textAlign: "center",
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: "var(--gold)", marginBottom: 12 }}>
        Binary Network
      </div>

      <div
        style={{
          fontSize: 11,
          color: "var(--text-dim)",
          background: "#0f0a06",
          borderRadius: 8,
          padding: "8px 10px",
          wordBreak: "break-all",
          marginBottom: 16,
        }}
      >
        {getBinaryReferralLink(telegramId)}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div style={slotStyle}>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>Left</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>
            {state.leftFilled ? state.leftUsername ?? "Filled" : "Empty"}
          </div>
        </div>
        <div style={slotStyle}>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>Right</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>
            {state.rightFilled ? state.rightUsername ?? "Filled" : "Empty"}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1c1c1c" }}>
        <span style={{ fontSize: 13, color: "var(--text-dim)" }}>Binary bonus earned</span>
        <span style={{ fontSize: 13 }}>{state.totalEarned.toFixed(2)} COFFEE</span>
      </div>
    </div>
  );
}
