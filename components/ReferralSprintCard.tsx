"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ReferralSprintCard({
  playerId,
  taskKey,
  title,
  description,
  rewardAmount,
}: {
  playerId: string;
  taskKey: string;
  title: string;
  description: string;
  rewardAmount: number;
}) {
  const status = useQuery(api.referralSprint.getStatus, { playerId: playerId as any, taskKey });
  const start = useMutation(api.referralSprint.start);
  const claim = useMutation(api.referralSprint.claim);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const cardStyle: React.CSSProperties = {
    border: "1px solid #1c1c1c",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    background: "var(--bg-metal)",
  };

  const actionButtonStyle = (enabled: boolean): React.CSSProperties => ({
    width: "100%",
    padding: 8,
    borderRadius: 8,
    border: "1px solid var(--bronze)",
    background: enabled ? "#1a1206" : "#141414",
    color: enabled ? "var(--gold)" : "var(--text-dim)",
    fontSize: 12,
  });

  const header = (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontWeight: 600, fontSize: 14 }}>{title}</span>
      <span style={{ fontSize: 12, color: "var(--gold)" }}>+{rewardAmount.toLocaleString("en-US")}</span>
    </div>
  );

  if (status === undefined) return null;

  const isActive = status && status.status === "active" && now <= status.deadline;
  const isWinnable = isActive && status.progress >= status.targetCount;
  const isExpired = status && (status.status === "expired" || (status.status === "active" && now > status.deadline));

  return (
    <div style={cardStyle}>
      {header}
      <div style={{ fontSize: 12, color: "var(--text-dim)", margin: "6px 0" }}>{description}</div>

      {!status || status.status === "won" || isExpired ? (
        <>
          {status?.status === "won" && (
            <div style={{ fontSize: 11, color: "var(--gold)", marginBottom: 6 }}>
              ✅ Won last time! Start a new sprint to earn it again.
            </div>
          )}
          {isExpired && (
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 6 }}>
              ⏰ Previous sprint expired. Start a new one.
            </div>
          )}
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await start({ playerId: playerId as any, taskKey });
              } catch (err) {
                alert(err instanceof Error ? err.message : "Failed to start");
              } finally {
                setBusy(false);
              }
            }}
            style={actionButtonStyle(true)}
          >
            Start (24h)
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 12, marginBottom: 4 }}>
            Progress: <span style={{ color: "var(--gold)" }}>{status.progress}</span> / {status.targetCount}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 8 }}>
            Time left: {formatRemaining(status.deadline - now)}
          </div>
          <button
            disabled={!isWinnable || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await claim({ playerId: playerId as any, taskKey });
              } catch (err) {
                alert(err instanceof Error ? err.message : "Failed to claim");
              } finally {
                setBusy(false);
              }
            }}
            style={actionButtonStyle(isWinnable)}
          >
            {isWinnable ? "Claim reward" : "Keep inviting..."}
          </button>
        </>
      )}
    </div>
  );
}
