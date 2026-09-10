"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { MinerRack } from "../../../components/MinerRack";

export function MinersTab({ playerId }: { playerId: string }) {
  const miners = useQuery(api.miners.myMiners, { playerId: playerId as any });
  const status = useQuery(api.mining.status, { playerId: playerId as any });
  const buy = useMutation(api.miners.buy);
  const upgrade = useMutation(api.miners.upgrade);

  if (!miners || !status) return null;

  return (
    <div>
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Miners</div>
        <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
          Mining power {status.hashrate.toLocaleString()} H/s · Balance {status.balance.toFixed(2)} COFFEE
        </div>
      </div>
      <MinerRack
        miners={miners}
        balance={status.balance}
        onBuy={(minerId) => buy({ playerId: playerId as any, minerId })}
        onUpgrade={(minerId) => upgrade({ playerId: playerId as any, minerId })}
      />
    </div>
  );
}
