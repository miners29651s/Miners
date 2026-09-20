"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useTonConnectUI, useTonAddress } from "@tonconnect/ui-react";
import { beginCell } from "@ton/core";
import { api } from "../../../convex/_generated/api";
import { MinerRack } from "../../../components/MinerRack";
import { openTelegramInvoice } from "../../../lib/telegram";
import { TON_WALLET_ADDRESS, buildMinerPaymentComment } from "../../../lib/ton";

export function MinersTab({ playerId }: { playerId: string }) {
  const miners = useQuery(api.miners.myMiners, { playerId: playerId as any });
  const status = useQuery(api.mining.status, { playerId: playerId as any });
  const buy = useMutation(api.miners.buy);
  const upgrade = useMutation(api.miners.upgrade);
  const buyWithBalance = useMutation(api.minerBalanceBuy.buyWithBalance);
  const createStarsInvoice = useAction(api.miners.createStarsInvoice);
  const [tonConnectUI] = useTonConnectUI();
  const tonAddress = useTonAddress();
  const [busyMinerId, setBusyMinerId] = useState<string | null>(null);

  if (!miners || !status) return null;

  // Real in-app TON balance (admin-credited / wheel). Not the COFFEE-equivalent shown on Home.
  const tonBalance = status.tonBalance ?? 0;

  async function handleBuyTon(minerId: string, tonCost: number) {
    // 1) Enough in-app TON balance -> pay from it, no wallet needed.
    if (tonBalance + 1e-9 >= tonCost) {
      setBusyMinerId(minerId);
      try {
        await buyWithBalance({ playerId: playerId as any, minerId });
        alert("Miner activated!");
      } catch (err) {
        alert(err instanceof Error ? err.message : "Purchase failed");
      } finally {
        setBusyMinerId(null);
      }
      return;
    }

    // 2) Not enough balance -> pay from the TON wallet (auto-activated after on-chain confirmation).
    if (!tonAddress) {
      tonConnectUI.openModal();
      alert("Connect your wallet, then tap Buy again to pay.");
      return;
    }
    setBusyMinerId(minerId);
    try {
      const comment = buildMinerPaymentComment(playerId, minerId);
      const payload = beginCell().storeUint(0, 32).storeStringTail(comment).endCell().toBoc().toString("base64");
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: TON_WALLET_ADDRESS,
            amount: String(Math.round(tonCost * 1e9)),
            payload,
          },
        ],
      });
      alert("Payment sent — the miner activates automatically once it's confirmed on-chain (usually under a minute).");
    } catch (err) {
      alert(err instanceof Error ? err.message : "TON payment failed or was cancelled");
    } finally {
      setBusyMinerId(null);
    }
  }

  async function handleBuy(minerId: string) {
    const def = miners!.find((m) => m.id === minerId);
    if (!def) return;

    if (def.costType === "ton") {
      await handleBuyTon(minerId, def.tonCost ?? 0);
      return;
    }

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

  async function handleUpgrade(minerId: string) {
    try {
      await upgrade({ playerId: playerId as any, minerId });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to upgrade");
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
        onUpgrade={handleUpgrade}
      />
    </div>
  );
}
