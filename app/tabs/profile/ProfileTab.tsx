"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function ProfileTab({ playerId }: { playerId: string }) {
  const profile = useQuery(api.profile.get, { playerId: playerId as any });
  const referrals = useQuery(api.referrals.list, { playerId: playerId as any });

  if (!profile) return null;

  const row = (label: string, value: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1c1c1c" }}>
      <span style={{ fontSize: 13, color: "var(--text-dim)" }}>{label}</span>
      <span style={{ fontSize: 13 }}>{value}</span>
    </div>
  );

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <img
          src={profile.avatarUrl || "/avatar-fallback.png"}
          alt=""
          width={48}
          height={48}
          style={{ borderRadius: "50%", background: "#111" }}
        />
        <div>
          <div style={{ fontWeight: 600 }}>{profile.username || "Player"}</div>
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>ID {profile.telegramId}</div>
        </div>
      </div>

      {row("COFFEE balance", profile.balance.toFixed(2))}
      {row("Total earned", profile.totalEarned.toFixed(2))}
      {row("Hashrate", `${profile.hashrate.toLocaleString()} H/s`)}
      {row("Miners owned", String(profile.minersOwned))}
      {row("Referrals", String(profile.referralCount))}
      {referrals && row("Referral bonus earned", referrals.totalBonusEarned.toFixed(2))}

      <div style={{ marginTop: 20, padding: 12, borderRadius: 12, border: "1px solid #1c1c1c" }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Withdrawal</div>
        <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
          {profile.withdrawal.locked
            ? `Locked — ${profile.withdrawal.usersNeeded.toLocaleString()} more users needed before launch.`
            : `Unlocked · ${profile.withdrawal.feePercent}% fee applies.`}
        </div>
      </div>
    </div>
  );
}
