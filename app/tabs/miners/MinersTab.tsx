"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useTonConnectUI, useTonAddress } from "@tonconnect/ui-react";
import { beginCell } from "@ton/core";
import { api } from "../../../convex/_generated/api";
import { MinerRack } from "../../../components/MinerRack";
import { MinerCardData } from "../../../components/MinerCard";
import { useGameDialog } from "../../../components/GameDialog";
import { openTelegramInvoice } from "../../../lib/telegram";
import { TON_WALLET_ADDRESS, buildMinerPaymentComment } from "../../../lib/ton";

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

export function MinersTab({ playerId }: { playerId: string }) {
  const miners = useQuery(api.miners.myMiners, { playerId: playerId as any });
  const status = useQuery(api.mining.status, { playerId: playerId as any });
  const buy = useMutation(api.miners.buy);
  const upgrade = useMutation(api.miners.upgrade);
  const buyWithBalance = useMutation(api.minerBalanceBuy.buyWithBalance);
  const createStarsInvoice = useAction(api.miners.createStarsInvoice);
  const [tonConnectUI] = useTonConnectUI();
  const tonAddress = useTonAddress();
  const dialog = useGameDialog();
  const [busyMinerId, setBusyMinerId] = useState<string | null>(null);
  const lockRef = useRef(false); // blocks rapid double taps instantly (state updates are async)

  if (!miners || !status) return null;

  const minerList = miners;
  const balance = status.balance;
  // Real in-app TON balance (admin-credited / wheel). Not the COFFEE-equivalent shown on Home.
  const tonBalance = status.tonBalance ?? 0;

  async function run(minerId: string, fn: () => Promise<void>) {
    if (lockRef.current) return;
    lockRef.current = true;
    setBusyMinerId(minerId);
    try {
      await fn();
    } finally {
      lockRef.current = false;
      setBusyMinerId(null);
    }
  }

  async function buyTon(def: MinerCardData) {
    const tonCost = def.tonCost ?? 0;

    // 1) Enough in-app TON balance -> pay from it, no wallet needed.
    if (tonBalance + 1e-9 >= tonCost) {
      try {
        await buyWithBalance({ playerId: playerId as any, minerId: def.id });
        await dialog.show({
          type: "success",
          title: "Miner activated!",
          message: `${def.name} is now mining for you. ${tonCost} TON was taken from your game balance.`,
        });
      } catch (err) {
        await dialog.error(err, "Purchase failed", "We couldn't complete this purchase. Please try again.");
      }
      return;
    }

    // 2) Not enough balance -> offer the TON wallet instead.
    if (tonBalance > 0) {
      const go = await dialog.show({
        type: "info",
        title: "Not enough TON balance",
        message: `You have ${tonBalance.toFixed(3)} TON in the game and ${def.name} costs ${tonCost} TON. Pay ${tonCost} TON from your wallet instead?`,
        confirmText: "Pay with wallet",
        cancelText: "Cancel",
      });
      if (!go) return;
    }

    if (!tonAddress) {
      await dialog.show({
        type: "info",
        title: "Connect your wallet",
        message: "Connect a TON wallet to pay, then tap the miner again.",
        confirmText: "Connect",
      });
      tonConnectUI.openModal();
      return;
    }

    try {
      const comment = buildMinerPaymentComment(playerId, def.id);
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
      await dialog.show({
        type: "success",
        title: "Payment sent",
        message: "Your miner activates automatically once the payment is confirmed on-chain — usually under a minute.",
      });
    } catch {
      await dialog.show({
        type: "error",
        title: "Payment not completed",
        message: "The payment was cancelled or failed. Nothing was activated.",
      });
    }
  }

  async function buyStars(def: MinerCardData) {
    try {
      const { invoiceLink } = await createStarsInvoice({ playerId: playerId as any, minerId: def.id });
      const result = await openTelegramInvoice(invoiceLink);
      if (result === "unavailable") {
        await dialog.show({ type: "warning", title: "Open in Telegram", message: "Stars payments only work inside the Telegram app." });
      } else if (result === "failed") {
        await dialog.show({ type: "error", title: "Payment failed", message: "Please try again." });
      }
    } catch (err) {
      await dialog.error(err, "Purchase failed", "We couldn't start this purchase. Please try again.");
    }
  }

  async function buyCoffee(def: MinerCardData) {
    if (balance < def.baseCost) {
      await dialog.show({
        type: "warning",
        title: "Not enough COFFEE",
        message: `You need ${fmt(def.baseCost - balance)} more COFFEE to unlock ${def.name}. Keep mining!`,
      });
      return;
    }
    try {
      await buy({ playerId: playerId as any, minerId: def.id });
      await dialog.show({ type: "success", title: "Miner unlocked!", message: `${def.name} is now mining for you.` });
    } catch (err) {
      await dialog.error(err, "Purchase failed", "We couldn't complete this purchase. Please try again.");
    }
  }

  async function handleBuy(minerId: string) {
    const def = minerList.find((m) => m.id === minerId);
    if (!def) return;
    await run(minerId, async () => {
      if (def.costType === "ton") return buyTon(def);
      if (def.costType === "stars") return buyStars(def);
      return buyCoffee(def);
    });
  }

  async function handleUpgrade(minerId: string) {
    const def = minerList.find((m) => m.id === minerId);
    if (!def) return;

    if (def.isMaxLevel) {
      await dialog.show({
        type: "max",
        title: "MAX LEVEL",
        message: `${def.name} is fully upgraded. Nothing more to unlock here!`,
      });
      return;
    }

    if (balance < def.nextUpgradeCost) {
      await dialog.show({
        type: "warning",
        title: "Not enough COFFEE",
        message: `You need ${fmt(def.nextUpgradeCost - balance)} more COFFEE to upgrade ${def.name}. Keep mining!`,
      });
      return;
    }

    await run(minerId, async () => {
      try {
        await upgrade({ playerId: playerId as any, minerId });
      } catch (err) {
        await dialog.error(err, "Upgrade failed", "We couldn't upgrade this miner right now. Please try again.");
      }
    });
  }

  return (
    <div>
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Miners</div>
        <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
          Mining power {status.hashrate.toLocaleString("en-US")} H/s · Balance {balance.toFixed(2)} COFFEE
        </div>
        <div style={{ fontSize: 12, color: "#0098ea", marginTop: 2 }}>TON balance {tonBalance.toFixed(3)}</div>
      </div>
      <MinerRack
        miners={minerList}
        balance={balance}
        busyMinerId={busyMinerId}
        onBuy={handleBuy}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
}
