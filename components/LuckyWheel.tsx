"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
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

const SIZE = 280;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 6;
const LABEL_RADIUS = RADIUS * 0.68;
const SEGMENT_COUNT = SPIN_SEGMENTS.length;
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;

function pointAt(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.sin(rad),
    y: CENTER - radius * Math.cos(rad),
  };
}

function segmentColor(index: number) {
  if (SPIN_SEGMENTS[index].type === "none") {
    return "#151515";
  }
  return index % 2 === 0 ? "#7b5518" : "#b98525";
}

function labelText(segment: (typeof SPIN_SEGMENTS)[number]) {
  if (segment.type === "none") return "EMPTY";
  if (segment.type === "ton") return "1 TON";
  return segment.label;
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
  const status = useQuery(api.spin.getSpinStatus, {
    playerId: playerId as any,
  });

  const canSpin = status ? status.canSpin : false;

  function openWheel() {
    setOpen(true);
    setError(null);
    setResult(null);
  }

  function closeWheel() {
    if (spinning) return;
    setOpen(false);
    setError(null);
    setResult(null);
  }

  async function handleSpin() {
    if (spinning || !canSpin) return;

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
        360 - (index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2);

      const currentNormalized = ((rotation % 360) + 360) % 360;
      const delta = ((targetAngle - currentNormalized) + 360) % 360;
      const extraRounds = 6;

      setRotation(rotation + extraRounds * 360 + delta);

      window.setTimeout(() => {
        setResult(prize);
        setSpinning(false);
      }, 4500);
    } catch (e: any) {
      setSpinning(false);
      setError(e?.message ?? "Spin failed.");
    }
  }

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
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 350,
              borderRadius: 20,
              padding: 20,
              background: "#0d0d0d",
              border: "1px solid rgba(255,193,7,0.35)",
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
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <strong style={{ color: "var(--gold)", fontSize: 20 }}>
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
                  cursor: spinning ? "default" : "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                position: "relative",
                width: SIZE,
                height: SIZE,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -8,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 0,
                  height: 0,
                  borderLeft: "10px solid transparent",
                  borderRight: "10px solid transparent",
                  borderTop: "18px solid var(--gold)",
                  zIndex: 5,
                }}
              />

              <svg
                width={SIZE}
                height={SIZE}
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                style={{
                  display: "block",
                  borderRadius: "50%",
                  boxShadow: "0 0 25px rgba(255,193,7,0.25)",
                  background: "#d5a73c",
                }}
              >
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS + 4}
                  fill="#0d0d0d"
                />
                <g
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transformOrigin: `${CENTER}px ${CENTER}px`,
                    transition: spinning
                      ? "transform 4.5s cubic-bezier(0.12, 0.72, 0.15, 1)"
                      : "none",
                  }}
                >
                  {SPIN_SEGMENTS.map((segment, index) => {
                    const start = index * SEGMENT_ANGLE;
                    const end = start + SEGMENT_ANGLE;
                    const mid = start + SEGMENT_ANGLE / 2;
                    const p1 = pointAt(start, RADIUS);
                    const p2 = pointAt(end, RADIUS);
                    const labelPos = pointAt(mid, LABEL_RADIUS);
                    const textRotation =
                      mid > 90 && mid < 270 ? mid + 180 : mid;

                    return (
                      <g key={segment.id}>
                        <path
                          d={`M ${CENTER} ${CENTER} L ${p1.x} ${p1.y} A ${RADIUS} ${RADIUS} 0 0 1 ${p2.x} ${p2.y} Z`}
                          fill={segmentColor(index)}
                          stroke="#0d0d0d"
                          strokeWidth={1}
                        />
                        <text
                          x={labelPos.x}
                          y={labelPos.y}
                          fill={segment.type === "none" ? "#666" : "#fff"}
                          fontSize={10}
                          fontWeight={800}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${textRotation} ${labelPos.x} ${labelPos.y})`}
                        >
                          {labelText(segment)}
                        </text>
                      </g>
                    );
                  })}
                </g>

                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={38}
                  fill="#0d0d0d"
                  stroke="#d5a73c"
                  strokeWidth={4}
                />
                <text
                  x={CENTER}
                  y={CENTER}
                  fill="var(--gold)"
                  fontSize={12}
                  fontWeight={900}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  SPIN
                </text>
              </svg>
            </div>

            {result && (
              <div style={{ textAlign: "center", minHeight: 24 }}>
                {result.type === "none" ? (
                  <span style={{ color: "#888", fontWeight: 700 }}>
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
                    {result.type === "ton" ? "TON" : "Coffee"}
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
              disabled={spinning || !canSpin}
              style={{
                width: "100%",
                maxWidth: 240,
                height: 50,
                borderRadius: 12,
                border: "none",
                background: spinning || !canSpin ? "#444" : "var(--gold)",
                color: "#111",
                fontSize: 16,
                fontWeight: 900,
                cursor: spinning || !canSpin ? "default" : "pointer",
                opacity: spinning || !canSpin ? 0.65 : 1,
              }}
            >
              {spinning ? "SPINNING..." : "SPIN"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
