"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { TON_TO_COFFEE } from "../lib/minerCatalog";
import { useGameDialog } from "./GameDialog";

type Dir = "coffee_to_ton" | "ton_to_coffee";

const MIN_COFFEE = 1_000;
const MIN_TON = 0.001;

const fmtCoffee = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const fmtTon = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 6 });

export function Converter({ playerId }: { playerId: string }) {
  const status = useQuery(api.mining.status, { playerId: playerId as any });
  const convert = useMutation(api.exchange.convert);
  const dialog = useGameDialog();

  const [dir, setDir] = useState<Dir>("coffee_to_ton");
  const [input, setInput] = useState("");
  const [rot, setRot] = useState(0);
  const [busy, setBusy] = useState(false);
  const [pressed, setPressed] = useState(false);

  if (!status) return null;

  const coffeeBal = status.balance;
  const tonBal = status.tonBalance ?? 0;
  const fromCoffee = dir === "coffee_to_ton";
  const fromBal = fromCoffee ? coffeeBal : tonBal;

  const amount = Number(input);
  const valid = input.trim() !== "" && Number.isFinite(amount) && amount > 0;
  const out = valid ? (fromCoffee ? amount / TON_TO_COFFEE : amount * TON_TO_COFFEE) : 0;

  const coffeePanel = {
    border: "1px solid var(--bronze)",
    background: "linear-gradient(160deg, #241a0e, #120c06)",
  };
  const tonPanel = {
    border: "1px solid #0098ea",
    background: "linear-gradient(160deg, #0a1c2b, #060f17)",
  };

  const panelBase: React.CSSProperties = {
    borderRadius: 14,
    padding: "10px 12px",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 3px 0 rgba(0,0,0,0.5)",
  };

  function swap() {
    if (busy) return;
    setDir(fromCoffee ? "ton_to_coffee" : "coffee_to_ton");
    setInput("");
    setRot((r) => r + 180);
  }

  function onChange(raw: string) {
    const v = raw.replace(/[^0-9.]/g, "");
    if (v.split(".").length > 2) return;
    setInput(v);
  }

  function setMax() {
    if (fromCoffee) setInput(String(Math.floor(coffeeBal)));
    else setInput(String(Math.floor(tonBal * 1e6) / 1e6));
  }

  async function handleConvert() {
    if (busy) return;

    if (!valid) {
      await dialog.show({ type: "warning", title: "Enter an amount", message: "Type how much you want to convert." });
      return;
    }
    if (fromCoffee ? amount < MIN_COFFEE : amount < MIN_TON) {
      await dialog.show({
        type: "warning",
        title: "Amount too small",
        message: fromCoffee ? `Minimum is ${fmtCoffee(MIN_COFFEE)} COFFEE.` : `Minimum is ${MIN_TON} TON.`,
      });
      return;
    }
    if (amount > fromBal + 1e-9) {
      await dialog.show({
        type: "warning",
        title: fromCoffee ? "Not enough COFFEE" : "Not enough TON",
        message: `You have ${fromCoffee ? fmtCoffee(coffeeBal) + " COFFEE" : fmtTon(tonBal) + " TON"}.`,
      });
      return;
    }

    setBusy(true);
    try {
      const r = await convert({ playerId: playerId as any, direction: dir, amount });
      setInput("");
      await dialog.show({
        type: "success",
        title: "Converted!",
        message: fromCoffee
          ? `You received ${fmtTon(r.received)} TON. Use it to buy new miners!`
          : `You received ${fmtCoffee(r.received)} COFFEE.`,
      });
    } catch (err) {
      await dialog.error(err, "Conversion failed", "We couldn't convert right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const fromLabel = fromCoffee ? "☕ COFFEE" : "🔷 TON";
  const toLabel = fromCoffee ? "🔷 TON" : "☕ COFFEE";

  return (
    <div style={{ marginTop: 20, padding: 12, borderRadius: 12, border: "1px solid var(--bronze)", background: "rgba(0,0,0,0.25)" }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, color: "var(--gold)" }}>Converter</div>
      <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12 }}>
        1 TON = {TON_TO_COFFEE.toLocaleString("en-US")} COFFEE
      </div>

      {/* FROM */}
      <div style={{ ...panelBase, ...(fromCoffee ? coffeePanel : tonPanel) }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
          <span style={{ fontWeight: 700, color: fromCoffee ? "var(--gold)" : "#7fd0ff" }}>{fromLabel}</span>
          <span style={{ color: "var(--text-dim)" }}>
            Balance: {fromCoffee ? fmtCoffee(coffeeBal) : fmtTon(tonBal)}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={input}
            onChange={(e) => onChange(e.target.value)}
            style={{
              flex: 1,
              minWidth: 0,
              padding: "8px 10px",
              fontSize: 18,
              fontWeight: 600,
              borderRadius: 8,
              border: "1px solid #1c1c1c",
              background: "#0a0704",
              color: "#fff",
            }}
          />
          <button
            onClick={setMax}
            style={{
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 8,
              border: "1px solid var(--bronze)",
              background: "#1a1206",
              color: "var(--gold)",
            }}
          >
            MAX
          </button>
        </div>
      </div>

      {/* SWAP */}
      <div style={{ display: "flex", justifyContent: "center", margin: "-6px 0", position: "relative", zIndex: 2 }}>
        <button
          onClick={swap}
          aria-label="Swap direction"
          style={{
            width: 46,
            height: 46,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid #f6d576",
            background: "radial-gradient(circle at 32% 25%, #fff0b8 0%, #f6d576 40%, #a8741c 100%)",
            boxShadow: "0 4px 0 #6b4514, 0 8px 14px rgba(0,0,0,0.6), inset 0 2px 3px rgba(255,255,255,0.6), inset 0 -4px 6px rgba(0,0,0,0.3)",
            transform: `rotate(${rot}deg)`,
            transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2a1c0c" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 4v15M8 4L4.5 7.5M8 4l3.5 3.5" />
            <path d="M16 20V5M16 20l-3.5-3.5M16 20l3.5-3.5" />
          </svg>
        </button>
      </div>

      {/* TO */}
      <div style={{ ...panelBase, ...(fromCoffee ? tonPanel : coffeePanel) }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
          <span style={{ fontWeight: 700, color: fromCoffee ? "#7fd0ff" : "var(--gold)" }}>{toLabel}</span>
          <span style={{ color: "var(--text-dim)" }}>
            Balance: {fromCoffee ? fmtTon(tonBal) : fmtCoffee(coffeeBal)}
          </span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, padding: "8px 2px", color: valid ? "#fff" : "var(--text-dim)" }}>
          {valid ? (fromCoffee ? fmtTon(out) : fmtCoffee(out)) : "0"}
        </div>
      </div>

      <button
        onClick={handleConvert}
        disabled={busy}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        style={{
          width: "100%",
          marginTop: 12,
          padding: 13,
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 800,
          letterSpacing: 0.3,
          color: "#2a1c0c",
          border: "1px solid #8a5a28",
          background: "linear-gradient(180deg, #ffe38f 0%, #f6d576 35%, #cd9c2e 100%)",
          boxShadow: pressed
            ? "0 1px 0 #7a4a18, 0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.5)"
            : "0 4px 0 #7a4a18, 0 8px 14px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.7)",
          transform: pressed ? "translateY(3px)" : "none",
          transition: "transform 0.06s, box-shadow 0.06s",
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? "Converting..." : fromCoffee ? "Convert to TON" : "Convert to COFFEE"}
      </button>
    </div>
  );
}
