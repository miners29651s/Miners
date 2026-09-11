"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Balance } from "../../../components/Balance";
import { Counter } from "../../../components/Counter";
import { ClaimButton } from "../../../components/ClaimButton";

export function HomeTab({ playerId }: { playerId: string }) {
  const status = useQuery(api.mining.status, { playerId: playerId as any });
  const claim = useMutation(api.mining.claim);

  if (!status) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 76px)",
        backgroundImage: "url(/home-bg.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Balance hashrate={status.hashrate} balance={status.balance} />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          padding: "0 24px",
        }}
      >
        <Counter
          basePending={status.pendingMining}
          ratePerSecond={status.ratePerSecond}
          syncedAtMs={Date.now()}
        />
        <div style={{ width: "100%" }}>
          <ClaimButton onClaim={async () => { await claim({ playerId: playerId as any }); }} />
        </div>
      </div>
    </div>
  );
}
