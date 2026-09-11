"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getReferralLink, copyReferralLink, shareReferralLink } from "../../../lib/telegram";

export function ProfileTab({ playerId }: { playerId: string }) {
  const profile = useQuery(api.profile.get, { playerId: playerId as any });
  const referrals = useQuery(api.referrals.list, { playerId: playerId as any });
  const [copied, setCopied] = useState(false);

  if (!profile) return null;

  const row = (label: string, value: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1c1c1c" }}>
      <span style={{ fontSize: 13, color: "var(--text-dim)" }}>{label}</span>
      <span style={{ fontSize: 13 }}>{value}</span>
    </div>
  );

  const referralLink = getReferralLink(profile.telegramId);

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

      <div style={{ marginTop: 20, padding: 12, borderRadius: 12, border: "1px solid var(--bronze)" }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: "var(--gold)" }}>
          Invite friends · earn {referrals?.bonusPercent ?? 10}% forever
        </div>
        <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 10 }}>
          Every time someone you invite claims COFFEE, you get an extra{" "}
          {referrals?.bonusPercent ?? 10}% on top — for free, on every claim they ever make.
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-dim)",
            background: "#0f0a06",
            borderRadius: 8,
            padding: "8px 10px",
            wordBreak: "break-all",
            marginBottom: 10,
          }}
        >
          {referralLink}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              copyReferralLink(profile.telegramId).then((ok) => {
                if (ok) {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }
              });
            }}
            style={{
              flex: 1,
              padding: "8px 6px",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 8,
              border: "1px solid var(--bronze)",
              background: "#141414",
              color: "var(--gold)",
            }}
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
          <button
            onClick={() =>
              shareReferralLink(
                profile.telegramId,
                "Join me on Miner Coffee and start mining COFFEE! ☕"
              )
            }
            style={{
              flex: 1,
              padding: "8px 6px",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 8,
              border: "1px solid var(--bronze)",
              background: "#1a1206",
              color: "var(--gold)",
            }}
          >
            Share
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid #1c1c1c" }}>
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

