"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

type SpinResult = { prizeId: string; label: string; type: "coffee" | "ton" | "none"; amount: number };

export function LuckyWheel({ playerId }: { playerId: string }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"idle" | "spinning" | "won">("idle");
  const [result, setResult] = useState<SpinResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const doSpin = useMutation(api.spin.spin);
  const doClaimSpin = useMutation(api.spin.claimSpin);

  function openWheel() {
    setError(null);
    setResult(null);
    setPhase("idle");
    setOpen(true);
  }

  function closeWheel() {
    setOpen(false);
    setPhase("idle");
    setResult(null);
    setError(null);
  }

  async function handleSpin() {
    setPhase("spinning");
    setError(null);
    try {
      const prize = (await doSpin({ playerId: playerId as any })) as SpinResult;
      setTimeout(() => {
        setResult(prize);
        setPhase("won");
      }, 1200);
    } catch (e: any) {
      setPhase("idle");
      setError(e?.message ?? "خطا در چرخوندن چرخ");
    }
  }

  async function handleClaim() {
    if (!result) return;
    try {
      await doClaimSpin({ playerId: playerId as any });
      closeWheel();
    } catch (e: any) {
      setError(e?.message ?? "خطا در دریافت جایزه");
    }
  }

  const isEmptyResult = result?.type === "none";

  return (
    <>
      <button
        onClick={openWheel}
        style={{
          position: "absolute",
          top: 90,
          right: 16,
          width: 64,
          height: 64,
          borderRadius: "50%",
          border: "2px solid var(--gold)",
          background: "radial-gradient(circle at 30% 30%, #2a1c08, #0d0904)",
          color: "var(--gold)",
          fontSize: 26,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 12px rgba(255,193,7,0.35)",
          zIndex: 5,
        }}
        aria-label="چرخ شانس"
      >
        🎡
      </button>

      {open && (
        <div
          onClick={closeWheel}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              background: "var(--bg-metal)",
              border: "1px solid var(--bronze)",
              borderRadius: 16,
              padding: 24,
              width: "78%",
              maxWidth: 300,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            <button
              onClick={closeWheel}
              aria-label="بستن"
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: "1px solid #e53935",
                background: "rgba(229,57,53,0.15)",
                color: "#e53935",
                fontSize: 16,
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ×
            </button>

            <div style={{ color: "var(--gold)", fontSize: 15, fontWeight: 600 }}>چرخ شانس</div>

            <div
              style={{
                width: 140,
                height: 140,
                borderRadius: "50%",
                border: "4px solid var(--gold)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: 10,
                background: "conic-gradient(from 0deg, #3a2408, #1a1206, #3a2408, #1a1206)",
                transition: "transform 1.1s cubic-bezier(0.2, 0.8, 0.2, 1)",
                transform: phase === "spinning" ? "rotate(1080deg)" : "rotate(0deg)",
              }}
            >
              {phase === "won" && result ? (
                <span style={{ color: isEmptyResult ? "#9a9a9a" : "var(--gold)", fontSize: 13, fontWeight: 700 }}>
                  {result.label}
                </span>
              ) : (
                <span style={{ color: "var(--gold)", fontSize: 24 }}>🎡</span>
              )}
            </div>

            {error && <div style={{ color: "#e53935", fontSize: 12, textAlign: "center" }}>{error}</div>}

            {phase !== "won" ? (
              <button
                onClick={handleSpin}
                disabled={phase === "spinning"}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid var(--gold)",
                  background: "#1a1206",
                  color: "var(--gold)",
                  fontSize: 14,
                  fontWeight: 600,
                  opacity: phase === "spinning" ? 0.6 : 1,
                }}
              >
                {phase === "spinning" ? "در حال چرخش..." : "Spin"}
              </button>
            ) : (
              <button
                onClick={handleClaim}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid var(--gold)",
                  background: "#1a1206",
                  color: "var(--gold)",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {isEmptyResult ? "OK" : "Claim"}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
