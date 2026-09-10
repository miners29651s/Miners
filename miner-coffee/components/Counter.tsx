"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders a smoothly increasing counter without hammering the backend.
 * `basePending` and `ratePerSecond` come from a periodic (not per-frame)
 * convex query (see mining.status). Between syncs, the counter advances
 * locally via requestAnimationFrame purely for visual smoothness — the
 * server remains the source of truth and recomputes on the next sync/claim.
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
    <div
      style={{
        width: 150,
        height: 150,
        borderRadius: "50%",
        border: "2px solid var(--bronze)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span style={{ fontSize: 22, fontWeight: 600 }}>{display.toFixed(5)}</span>
    </div>
  );
}
