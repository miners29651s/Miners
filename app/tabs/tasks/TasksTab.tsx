"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function TasksTab({ playerId }: { playerId: string }) {
  const tasks = useQuery(api.tasks.list, { playerId: playerId as any });
  const complete = useMutation(api.tasks.complete);

  if (!tasks) return null;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Tasks</div>
      {tasks.map((task) => (
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
          <div style={{ fontSize: 12, color: "var(--text-dim)", margin: "6px 0" }}>
            {task.description}
          </div>
          <button
            disabled={task.completed}
            onClick={() => complete({ playerId: playerId as any, taskKey: task.key })}
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
      ))}
    </div>
  );
}

