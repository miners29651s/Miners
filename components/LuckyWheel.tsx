"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SPIN_SEGMENTS, segmentIndexById } from "../lib/spinCatalog";

type SpinResult = { prizeId: string; label: string; type: "coffee" | "ton" | "none"; amount: number };

const SEG_COUNT = SPIN_SEGMENTS.length;
const SEG_ANGLE = 360 / SEG_COUNT;
const WHEEL_SIZE = 260;

const wheelDividers = `repeating-conic-gradient(rgba(255,255,255,0.14) 0deg 1deg, transparent 1deg ${SEG_ANGLE}deg)`;

export function LuckyWheel({ playerId }: { playerId: string }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"idle" | "spinning" | "won">("idle");
  const [result, setResult] = useState<SpinResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);

  const doSpin = useMutation(api.spin.spin);
  const doClaimSpin = useMutation(api.spin.claimSpin);
  const pending = useQuery(api.spin.pending, open ? { playerId: playerId as any } : "skip");

  useEffect(() => {
    if (!open || !pending) return;
    const index = segmentIndexById(pending.prizeId);
    const mid = index * SEG_ANGLE + SEG_ANGLE / 2;
    setRotation(360 - mid);
    setResult(pending as SpinResult);
    setPhase("won");
  }, [open, pending]);

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
      const index = segmentIndexById(prize.prizeId);
      const mid = index * SEG_ANGLE + SEG_ANGLE / 2;
      const extraSpins = 6;
      const target = extraSpins * 360 + (360 - mid);
      setRotation((prev) => prev - (prev % 360) + target);

      setTimeout(() => {
        setResult(prize);
        setPhase("won");
      }, 2500);
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
            background: "rgba(0,0,0,0.7)",
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
              background: "linear-gradient(160deg, rgba(30,15,45,0.95), rgba(8,10,18,0.97))",
              border: "1px solid rgba(150,120,255,0.4)",
              boxShadow: "0 0 40px rgba(120,80,255,0.25), inset 0 0 30px rgba(0,0,0,0.5)",
              borderRadius: 22,
              padding: "18px 16px 22px",
              width: "88%",
              maxWidth: 340,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <button
              onClick={closeWheel}
              aria-label="بستن"
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                width: 30,
                height: 30,
                borderRadius: "50%",
                border: "1px solid #e53935",
                background: "rgba(229,57,53,0.15)",
                color: "#e53935",
                fontSize: 17,
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
              }}
            >
              ×
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/spin/crown.png" alt="" style={{ width: 70, marginBottom: -6 }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/spin/title.png" alt="Lucky Spin — Spin & Win Amazing Rewards" style={{ width: "88%" }} />

            <div
              style={{
                position: "relative",
                width: WHEEL_SIZE,
                height: WHEEL_SIZE,
                marginTop: 6,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -10,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 0,
                  height: 0,
                  borderLeft: "10px solid transparent",
                  borderRight: "10px solid transparent",
                  borderTop: "16px solid #ffd54f",
                  filter: "drop-shadow(0 0 4px rgba(255,213,79,0.8))",
                  zIndex: 8,
                }}
              />

              <div
                style={{
                  position: "absolute",
                  inset: -6,
                  borderRadius: "50%",
                  background: "conic-gradient(from 0deg, #8a6a2a, #ffe9a8, #8a6a2a, #4a3510, #ffe9a8, #8a6a2a)",
                  boxShadow: "0 0 18px rgba(255,200,80,0.35)",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  inset: 4,
                  borderRadius: "50%",
                  background: "#181818",
                  border: "2px solid #1a1206",
                  transform: `rotate(${rotation}deg)`,
                  transition: phase === "spinning" ? "transform 2.5s cubic-bezier(0.17,0.67,0.2,1)" : "none",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background: wheelDividers,
                  }}
                />
              </div>

              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: WHEEL_SIZE * 0.34,
                  height: WHEEL_SIZE * 0.34,
                  zIndex: 6,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/spin/robot.png" alt="" style={{ width: "100%", height: "100%" }} />
              </div>
            </div>

            {phase === "won" && result && (
              <div
                style={{
                  color: isEmptyResult ? "#9a9a9a" : "var(--gold)",
                  fontSize: 15,
                  fontWeight: 700,
                  marginTop: 4,
                }}
              >
                {isEmptyResult ? "این بار شانس نبود!" : `🎉 ${result.label} ${result.type === "ton" ? "TON" : "Coffee"}`}
              </div>
            )}

            {error && <div style={{ color: "#e53935", fontSize: 12, textAlign: "center" }}>{error}</div>}

            {phase !== "won" ? (
              <button
                onClick={handleSpin}
                disabled={phase === "spinning"}
                style={{
                  width: "100%",
                  maxWidth: 220,
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  cursor: phase === "spinning" ? "default" : "pointer",
                  opacity: phase === "spinning" ? 0.55 : 1,
                  marginTop: 4,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/spin/spinbtn.png" alt="Spin" style={{ width: "100%" }} />
              </button>
            ) : (
              <button
                onClick={handleClaim}
                style={{
                  width: "100%",
                  maxWidth: 220,
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid var(--gold)",
                  background: "#1a1206",
                  color: "var(--gold)",
                  fontSize: 14,
                  fontWeight: 600,
                  marginTop: 4,
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
