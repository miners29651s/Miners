"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getTelegramWebApp } from "../../../lib/telegram";
import { ReferralSprintCard } from "../../../components/ReferralSprintCard";
import { GiftCard } from "../../../components/GiftCard";
import { useGameDialog } from "../../../components/GameDialog";

export function TasksTab({ playerId }: { playerId: string }) {
  const tasks = useQuery(api.tasks.list, { playerId: playerId as any });
  const gifts = useQuery(api.gifts.list, { playerId: playerId as any });
  const complete = useAction(api.tasks.complete);
  const claimGift = useMutation(api.gifts.claim);
  const dialog = useGameDialog();
  const [busyGift, setBusyGift] = useState<string | null>(null);

  if (!tasks) return null;

  async function handleClaimGift(giftId: string) {
    if (busyGift) return;
    setBusyGift(giftId);
    try {
      await claimGift({ playerId: playerId as any, giftId });
      await dialog.show({
        type: "success",
        title: "Gift claimed!",
        message: "We'll send it to your Telegram profile soon.",
      });
    } catch (err) {
      await dialog.error(err, "Can't claim yet", "Finish all the steps first, then try again.");
    } finally {
      setBusyGift(null);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      {gifts && gifts.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Gifts 🎁</div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12 }}>
            Complete the steps, then claim a real Telegram gift.
          </div>
          {gifts.map((g) => (
            <GiftCard
              key={g.id}
              gift={g}
              busy={busyGift === g.id}
              onClaim={() => handleClaimGift(g.id)}
            />
          ))}
        </div>
      )}

      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Tasks</div>

      {tasks.map((task) => {
        if (task.type === "referral_sprint") {
          return (
            <ReferralSprintCard
              key={task.key}
              playerId={playerId}
              taskKey={task.key}
              title={task.title}
              description={task.description}
              rewardAmount={task.rewardAmount}
            />
          );
        }

        return (
          <div
            key={task.key}
            style={{
              border: "1px solid #1c1c1c",
              borderRadius: 12,
              padding: 12,
              marginBottom: 10,
              background: "var(--bg-metal)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{task.title}</span>
              <span style={{ fontSize: 12, color: "var(--gold)" }}>
                +{task.rewardAmount.toLocaleString("en-US")}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-dim)", margin: "6px 0" }}>{task.description}</div>

            {(task.type === "channel_join" || task.type === "channel_reaction") && task.channelId?.startsWith("@") && (
              <button
                onClick={() => {
                  const link = `https://t.me/${task.channelId!.slice(1)}`;
                  const tg = getTelegramWebApp();
                  if (tg) {
                    tg.openTelegramLink(link);
                  } else {
                    window.open(link, "_blank");
                  }
                }}
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid var(--bronze)",
                  background: "#141414",
                  color: "var(--gold)",
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                Open Channel
              </button>
            )}
            <button
              disabled={task.completed}
              onClick={async () => {
                try {
                  await complete({ playerId: playerId as any, taskKey: task.key });
                } catch (err) {
                  await dialog.error(
                    err,
                    "Task not completed",
                    "Make sure you finished the task first (join the channel or react to the latest post), then try again."
                  );
                }
              }}
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 8,
                border: "1px solid var(--bronze)",
                background: task.completed ? "#141414" : "#1a1206",
                color: task.completed ? "var(--text-dim)" : "var(--gold)",
                fontSize: 12,
              }}
            >
              {task.completed ? "Completed" : "Complete"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
