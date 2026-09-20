"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useGameDialog } from "./GameDialog";

type PaymentMethod = "ton" | "coffee";

const TIER_LABELS: Record<number, string> = {
  1: "1 TON",
  10: "10 TON",
  100: "100 TON",
  1000: "1000 TON",
};

const stepperBtnStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: "1px solid rgba(255,193,7,0.35)",
  background: "#151515",
  color: "var(--gold)",
  fontSize: 18,
  fontWeight: 900,
  cursor: "pointer",
};

export function Lottery({ playerId }: { playerId: string }) {
  const [open, setOpen] = useState(false);
  const [activeTier, setActiveTier] = useState<number>(1);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("ton");
  const [busy, setBusy] = useState(false);

  const dialog = useGameDialog();
  const state = useQuery(api.lottery.getLotteryState, { playerId: playerId as any });
  const buyTicket = useMutation(api.lottery.buyTicket);

  const current = state?.find((t) => t.tier === activeTier);

  function openLottery() {
    setOpen(true);
  }

  function closeLottery() {
    if (busy) return;
    setOpen(false);
  }

  async function handleBuy() {
    if (busy || !current) return;
    setBusy(true);
    try {
      await buyTicket({
        playerId: playerId as any,
        tier: activeTier,
        quantity,
        paymentMethod,
      });
      await dialog.show({
        type: "success",
        title: "Ticket purchased!",
        message: `You bought ${quantity} ticket${quantity > 1 ? "s" : ""} for the ${TIER_LABELS[activeTier]} draw.`,
      });
      setQuantity(1);
    } catch (e: any) {
      await dialog.error(e, "Purchase failed");
    } finally {
      setBusy(false);
    }
  }

  const price = paymentMethod === "ton" ? current?.ticketPriceTon : current?.ticketPriceCoffee;
  const totalCost = price !== undefined ? price * quantity : 0;

  return (
    <>
      <button
        onClick={openLottery}
        aria-label="Lottery"
        style={{
          position: "absolute",
          top: 166,
          right: 16,
          width: 62,
          height: 62,
          borderRadius: "50%",
          border: "2px solid var(--gold)",
          background: "#100d08",
          color: "var(--gold)",
          fontSize: 26,
          cursor: "pointer",
          zIndex: 5,
        }}
      >
        🎟️
      </button>

      {open && (
        <div
          onClick={closeLottery}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.78)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
            padding: 16,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 360,
              maxHeight: "80vh",
              overflowY: "auto",
              borderRadius: 20,
              padding: 20,
              background: "#0d0d0d",
              border: "1px solid rgba(255,193,7,0.35)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ color: "var(--gold)", fontSize: 20 }}>Lottery</strong>
              <button
                onClick={closeLottery}
                disabled={busy}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#e53935",
                  fontSize: 26,
                  fontWeight: 900,
                  cursor: busy ? "default" : "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {state?.map((t) => (
                <button
                  key={t.tier}
                  onClick={() => {
                    setActiveTier(t.tier);
                    setQuantity(1);
                  }}
                  style={{
                    flex: "1 1 auto",
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: t.tier === activeTier ? "2px solid var(--gold)" : "1px solid rgba(255,193,7,0.25)",
                    background: t.tier === activeTier ? "#1a1206" : "#151515",
                    color: "var(--gold)",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {TIER_LABELS[t.tier]}
                </button>
              ))}
            </div>

            {current && (
              <>
                <div style={{ fontSize: 13, color: "#b9ab94" }}>
                  Your tickets: <strong style={{ color: "var(--gold)" }}>{current.myTickets}</strong>
                  {" · "}Tickets sold: {current.ticketsSold}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setPaymentMethod("ton")}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      borderRadius: 10,
                      border: paymentMethod === "ton" ? "2px solid var(--gold)" : "1px solid rgba(255,193,7,0.25)",
                      background: paymentMethod === "ton" ? "#1a1206" : "#151515",
                      color: "var(--gold)",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Pay with TON
                  </button>
                  <button
                    onClick={() => setPaymentMethod("coffee")}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      borderRadius: 10,
                      border: paymentMethod === "coffee" ? "2px solid var(--gold)" : "1px solid rgba(255,193,7,0.25)",
                      background: paymentMethod === "coffee" ? "#1a1206" : "#151515",
                      color: "var(--gold)",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Pay with COFFEE
                  </button>
                </div>

                <div style={{ fontSize: 13, color: "#b9ab94" }}>
                  Ticket price:{" "}
                  {paymentMethod === "ton"
                    ? `${current.ticketPriceTon.toFixed(4)} TON`
                    : `${current.ticketPriceCoffee.toLocaleString("en-US")} COFFEE`}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} style={stepperBtnStyle}>
                    −
                  </button>
                  <span style={{ color: "var(--gold)", fontSize: 16, fontWeight: 800, minWidth: 32, textAlign: "center" }}>
                    {quantity}
                  </span>
                  <button onClick={() => setQuantity((q) => Math.min(500, q + 1))} style={stepperBtnStyle}>
                    +
                  </button>
                  <span style={{ marginLeft: "auto", color: "#b9ab94", fontSize: 13 }}>
                    Total:{" "}
                    {paymentMethod === "ton"
                      ? `${totalCost.toFixed(4)} TON`
                      : `${totalCost.toLocaleString("en-US")} COFFEE`}
                  </span>
                </div>

                <button
                  onClick={handleBuy}
                  disabled={busy}
                  style={{
                    width: "100%",
                    height: 50,
                    borderRadius: 12,
                    border: "none",
                    background: busy ? "#444" : "var(--gold)",
                    color: "#111",
                    fontSize: 16,
                    fontWeight: 900,
                    cursor: busy ? "default" : "pointer",
                    opacity: busy ? 0.65 : 1,
                  }}
                >
                  {busy ? "BUYING..." : "BUY TICKET"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
