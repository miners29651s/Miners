export function Balance({ hashrate, balance }: { hashrate: number; balance: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 16px 0" }}>
      <div>
        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>HASHRATE</div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{hashrate.toLocaleString()} H/s</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>COFFEE</div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{balance.toFixed(2)}</div>
      </div>
    </div>
  );
}
