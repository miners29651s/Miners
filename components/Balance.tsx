export function Balance({ hashrate, balance }: { hashrate: number; balance: number }) {
  const boxStyle: React.CSSProperties = {
    padding: "8px 14px",
    borderRadius: 10,
    border: "1px solid var(--gold)",
    background: "#1a1206",
  };

  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 16px 0", gap: 12 }}>
      <div style={boxStyle}>
        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>HASHRATE</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--gold)" }}>{hashrate.toLocaleString()} H/s</div>
      </div>
      <div style={{ ...boxStyle, textAlign: "right" }}>
        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>COFFEE</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--gold)" }}>{balance.toFixed(2)}</div>
      </div>
    </div>
  );
}
