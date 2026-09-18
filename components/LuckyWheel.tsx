"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import {
  SPIN_SEGMENTS,
  segmentIndexById,
} from "../lib/spinCatalog";

type SpinResult = {
  prizeId: string;
  label: string;
  type: "coffee" | "ton" | "none";
  amount: number;
  usedFreeSpin: boolean;
};

const WHEEL_SIZE = 280;
const SEGMENT_COUNT = SPIN_SEGMENTS.length;
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;

function getSegmentColor(index: number) {
  if (SPIN_SEGMENTS[index].type === "none") {
    return "#151515";
  }

  return index % 2 === 0 ? "#7b5518" : "#b98525";
}

export function LuckyWheel({
  playerId,
}: {
  playerId: string;
}) {
  const [open, setOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const spin = useMutation(api.spin.spin);

  function openWheel() {
    setOpen(true);
    setError(null);
    setResult(null);
  }

  function closeWheel() {
    if (spinning) {
      return;
    }

    setOpen(false);
    setError(null);
    setResult(null);
  }

  async function handleSpin() {
    if (spinning) {
      return;
    }

    setSpinning(true);
    setError(null);
    setResult(null);

    try {
      const prize = (await spin({
        playerId: playerId as any,
      })) as SpinResult;

      const index = segmentIndexById(prize.prizeId);

      if (index < 0) {
        throw new Error("Invalid spin result.");
      }

      const targetAngle =
        360 -
        (index * SEGMENT_ANGLE +
          SEGMENT_ANGLE / 2);

      const currentNormalized =
        ((rotation % 360) + 360) % 360;

      const delta =
        ((targetAngle - currentNormalized) + 360) % 360;

      const extraRounds = 6;

      setRotation(
        rotation +
          extraRounds * 360 +
          delta,
      );

      window.setTimeout(() => {
        setResult(prize);
        setSpinning(false);
      }, 4500);
    } catch (e: any) {
      setSpinning(false);
      setError(
        e?.message ?? "Spin failed.",
      );
    }
  }

  const wheelBackground =
    SPIN_SEGMENTS.map((_, index) => {
      const start =
        index * SEGMENT_ANGLE;

      const end =
        start + SEGMENT_ANGLE;

      return `${getSegmentColor(index)} ${start}deg ${end}deg`;
    }).join(", ");

  return (
    <>
      <button
        onClick={openWheel}
        aria-label="Lucky Spin"
        style={{
          position: "absolute",
          top: 90,
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
        🎡
      </button>

      {open && (
        <div
          onClick={closeWheel}
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
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth: 350,
              borderRadius: 20,
              padding: 20,
              background: "#0d0d0d",
              border:
                "1px solid rgba(255,193,7,0.35)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
              }}
            >
              <strong
                style={{
                  color: "var(--gold)",
                  fontSize: 20,
                }}
              >
                Lucky Spin
              </strong>

              <button
                onClick={closeWheel}
                disabled={spinning}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#888",
                  fontSize: 24,
                  cursor: spinning
                    ? "default"
                    : "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                position: "relative",
                width: WHEEL_SIZE,
                height: WHEEL_SIZE,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -8,
                  left: "50%",
                  transform:
                    "translateX(-50%)",
                  width: 0,
                  height: 0,
                  borderLeft:
                    "10px solid transparent",
                  borderRight:
                    "10px solid transparent",
                  borderTop:
                    "18px solid var(--gold)",
                  zIndex: 5,
                }}
              />

              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  padding: 7,
                  background: "#d5a73c",
                  boxShadow:
                    "0 0 25px rgba(255,193,7,0.25)",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    overflow: "hidden",
                    background:
                      `conic-gradient(${wheelBackground})`,
                    transform:
                      `rotate(${rotation}deg)`,
                    transition: spinning
                      ? "transform 4.5s cubic-bezier(0.12, 0.72, 0.15, 1)"
                      : "none",
                  }}
                >
                  {SPIN_SEGMENTS.map(
                    (segment, index) => {
                      const angle =
                        index *
                          SEGMENT_ANGLE +
                        SEGMENT_ANGLE / 2;

                      return (
                        <div
                          key={segment.id}
                          style={{
                            position:
                              "absolute",
                            left: "50%",
                            top: "50%",
                            width: 1,
                            height: "50%",
                            transformOrigin:
                              "bottom center",
                            transform:
                              `rotate(${angle}deg)`,
                            pointerEvents:
                              "none",
                          }}
                        >
                          <div
                            style={{
                              position:
                                "absolute",
                              bottom: 18,
                              left: -28,
                              width: 56,
                              textAlign:
                                "center",
                              color:
                                segment.type ===
                                "none"
                                  ? "#666"
                                  : "#fff",
                              fontSize: 10,
                              fontWeight: 800,
                              transform:
                                `rotate(${-angle}deg)`,
                              textShadow:
                                "0 1px 2px #000",
                            }}
                          >
                            {segment.type ===
                            "none"
                              ? "EMPTY"
                              : segment.type ===
                                  "ton"
                                ? "1 TON"
                                : segment.label}
                          </div>
                        </div>
                      );
                    },
                  )}

                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      width: 76,
                      height: 76,
                      transform:
                        "translate(-50%, -50%)",
                      borderRadius: "50%",
                      background: "#0d0d0d",
                      border:
                        "4px solid #d5a73c",
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        "center",
                      color: "var(--gold)",
                      fontWeight: 900,
                      fontSize: 12,
                    }}
                  >
                    SPIN
                  </div>
                </div>
              </div>
            </div>

            {result && (
              <div
                style={{
                  textAlign: "center",
                  minHeight: 24,
                }}
              >
                {result.type === "none" ? (
                  <span
                    style={{
                      color: "#888",
                      fontWeight: 700,
                    }}
                  >
                    Better luck next time
                  </span>
                ) : (
                  <span
                    style={{
                      color: "var(--gold)",
                      fontSize: 18,
                      fontWeight: 800,
                    }}
                  >
                    🎉 {result.label}{" "}
                    {result.type === "ton"
                      ? "TON"
                      : "Coffee"}
                  </span>
                )}
              </div>
            )}

            {error && (
              <div
                style={{
                  color: "#e53935",
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                {error}
              </div>
            )}

            <button
              onClick={handleSpin}
              disabled={spinning}
              style={{
                width: "100%",
                maxWidth: 240,
                height: 50,
                borderRadius: 12,
                border: "none",
                background: spinning
                  ? "#444"
                  : "var(--gold)",
                color: "#111",
                fontSize: 16,
                fontWeight: 900,
                cursor: spinning
                  ? "default"
                  : "pointer",
                opacity: spinning
                  ? 0.65
                  : 1,
              }}
            >
              {spinning
                ? "SPINNING..."
                : "SPIN"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
