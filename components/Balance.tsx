export function Balance({ hashrate, balance }: { hashrate: number; balance: number }) {
  const pillStyle: React.CSSProperties = {
    padding: "8px 14px",
    borderRadius: 10,
    border: "1px solid var(--gold)",
    background: "#1a1206",
  };

  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 16px 0", gap: 10 }}>
      <div style={pillStyle}>
        <div style={{ fontSize: 11, color: "var(--gold)", opacity: 0.75 }}>HASHRATE</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--gold)" }}>
          {hashrate.toLocaleString("en-US")} H/s
        </div>
      </div>
      <div style={{ ...pillStyle, textAlign: "right" }}>
        <div style={{ fontSize: 11, color: "var(--gold)", opacity: 0.75 }}>COFFEE</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--gold)" }}>{balance.toFixed(2)}</div>
      </div>
    </div>
  );
}
