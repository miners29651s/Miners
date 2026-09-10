"use client";

import { useState } from "react";

export function ClaimButton({ onClaim }: { onClaim: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      await onClaim();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        width: "100%",
        padding: 14,
        borderRadius: 10,
        border: "1px solid var(--gold)",
        background: "#1a1206",
        color: "var(--gold)",
        fontSize: 15,
        fontWeight: 600,
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? "Claiming…" : "Claim"}
    </button>
  );
}
