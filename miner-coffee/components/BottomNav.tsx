"use client";

export type TabKey = "miners" | "tasks" | "home" | "profile";

const TABS: { key: TabKey; label: string }[] = [
  { key: "miners", label: "Miners" },
  { key: "tasks", label: "Tasks" },
  { key: "home", label: "Home" },
  { key: "profile", label: "Profile" },
];

export function BottomNav({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}) {
  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        maxWidth: 480,
        margin: "0 auto",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        padding: "10px 8px",
        background: "var(--bg-metal)",
        borderTop: "1px solid #1c1c1c",
      }}
    >
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            style={{
              background: "transparent",
              border: "none",
              color: isActive ? "var(--gold)" : "var(--text-dim)",
              fontWeight: isActive ? 600 : 400,
              fontSize: 12,
              padding: "6px 10px",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
