"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders a smoothly increasing counter without hammering the backend.
 * `basePending` and `ratePerSecond` come from a periodic (not per-frame)
 * convex query (see mining.status). Between syncs, the counter advances
 * locally via requestAnimationFrame purely for visual smoothness — the
 * server remains the source of truth and recomputes on the next sync/claim.
 *
 * The rotating gold spark below is a purely decorative CSS animation loop.
 * It never reads basePending/ratePerSecond/display and never restarts or
 * reacts when they change — it just spins forever behind the circle.
 */
export function Counter({
  basePending,
  ratePerSecond,
  syncedAtMs,
}: {
  basePending: number;
  ratePerSecond: number;
  syncedAtMs: number;
}) {
  const [display, setDisplay] = useState(basePending);
  const frameRef = useRef<number>();

  useEffect(() => {
    function tick() {
      const elapsedSec = (Date.now() - syncedAtMs) / 1000;
      setDisplay(basePending + ratePerSecond * elapsedSec);
      frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [basePending, ratePerSecond, syncedAtMs]);

  return (
    <div style={{ position: "relative", width: 150, height: 150 }}>
      <style>{`
        @keyframes counterSparkSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Decorative only — orbits forever, independent of any app state. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          animation: "counterSparkSpin 3s linear infinite",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -3,
            left: "50%",
            width: 8,
            height: 8,
            borderRadius: "50%",
            transform: "translateX(-50%)",
            background: "var(--gold)",
            boxShadow: "0 0 8px 3px var(--gold)",
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: "2px solid var(--bronze)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 22, fontWeight: 600 }}>{display.toFixed(5)}</span>
      </div>
    </div>
  );
}
