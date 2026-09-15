"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { MinerRack } from "../../../components/MinerRack";
import { openTelegramInvoice } from "../../../lib/telegram";

export function MinersTab({ playerId }: { playerId: string }) {
  const miners = useQuery(api.miners.myMiners, { playerId: playerId as any });
  const status = useQuery(api.mining.status, { playerId: playerId as any });
  const buy = useMutation(api.miners.buy);
  const upgrade = useMutation(api.miners.upgrade);
  const createStarsInvoice = useAction(api.miners.createStarsInvoice);
  const [busyMinerId, setBusyMinerId] = useState<string | null>(null);

  if (!miners || !status) return null;

  async function handleBuy(minerId: string) {
    const def = miners!.find((m) => m.id === minerId);
    if (!def) return;

    if (def.costType === "stars") {
      setBusyMinerId(minerId);
      try {
        const { invoiceLink } = await createStarsInvoice({ playerId: playerId as any, minerId });
        const result = await openTelegramInvoice(invoiceLink);
        if (result === "unavailable") {
          alert("Stars payments only work inside the Telegram app.");
        } else if (result === "failed") {
          alert("Payment failed — please try again.");
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to start purchase");
      } finally {
        setBusyMinerId(null);
      }
      return;
    }

    try {
      await buy({ playerId: playerId as any, minerId });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to buy");
    }
  }

  return (
    <div>
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Miners</div>
        <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
          Mining power {status.hashrate.toLocaleString("en-US")} H/s · Balance {status.balance.toFixed(2)} COFFEE
        </div>
      </div>
      <MinerRack
        miners={miners}
        balance={status.balance}
        busyMinerId={busyMinerId}
        onBuy={handleBuy}
        onUpgrade={(minerId) => upgrade({ playerId: playerId as any, minerId })}
      />
    </div>
  );
}
