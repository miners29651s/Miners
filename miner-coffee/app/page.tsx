"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { initTelegram, getInitData, getReferralCode } from "../lib/telegram";
import { BottomNav, TabKey } from "../components/BottomNav";
import { HomeTab } from "./tabs/home/HomeTab";
import { MinersTab } from "./tabs/miners/MinersTab";
import { TasksTab } from "./tabs/tasks/TasksTab";
import { ProfileTab } from "./tabs/profile/ProfileTab";

export default function Page() {
  const [tab, setTab] = useState<TabKey>("home");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const authenticate = useMutation(api.auth.authenticate);

  useEffect(() => {
    initTelegram();
    const initData = getInitData();
    if (!initData) {
      setError("Open this app from Telegram.");
      return;
    }
    authenticate({ initData, referralCode: getReferralCode() })
      .then((id) => setPlayerId(id as unknown as string))
      .catch((e) => setError(String(e.message || e)));
  }, [authenticate]);

  if (error) {
    return (
      <div style={{ padding: 24, color: "var(--text-dim)", textAlign: "center" }}>{error}</div>
    );
  }

  if (!playerId) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--gold)" }}>Loading…</div>
    );
  }

  return (
    <div id="app-shell">
      <div className="tab-content">
        {tab === "home" && <HomeTab playerId={playerId} />}
        {tab === "miners" && <MinersTab playerId={playerId} />}
        {tab === "tasks" && <TasksTab playerId={playerId} />}
        {tab === "profile" && <ProfileTab playerId={playerId} />}
      </div>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
