// Bottom "shelf" grid on Home. Empty by design for now — pass `items` later
// (from a prop, or a Convex query in HomeTab) and it renders automatically.
// No structural change needed when real data shows up.
export type ShelfItem = {
  id: string;
  label?: string;
  iconUrl?: string;
};

export function Shelf({ items = [] }: { items?: ShelfItem[] }) {
  return (
    <div
      style={{
        margin: "12px 12px 16px",
        padding: 12,
        borderRadius: 12,
        border: "1px solid var(--bronze)",
        background: "rgba(0,0,0,0.35)",
        minHeight: 90,
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 10,
      }}
    >
      {items.length === 0
        ? Array.from({ length: 4 }).map((_, i) => (
            <div
              key={`empty-${i}`}
              style={{
                aspectRatio: "1 / 1",
                borderRadius: 8,
                border: "1px dashed var(--bronze)",
                opacity: 0.35,
              }}
            />
          ))
        : items.map((item) => (
            <div
              key={item.id}
              style={{
                aspectRatio: "1 / 1",
                borderRadius: 8,
                border: "1px solid var(--gold)",
                background: "#1a1206",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {item.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.iconUrl}
                  alt={item.label ?? item.id}
                  style={{ width: "70%", height: "70%", objectFit: "contain" }}
                />
              ) : (
                <span style={{ color: "var(--gold)", fontSize: 11 }}>{item.label ?? ""}</span>
              )}
            </div>
          ))}
    </div>
  );
}
