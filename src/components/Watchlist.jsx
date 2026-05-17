export default function Watchlist({
  watchlist,
  watched,
  onMarkWatched,
  onRemoveFromWatchlist,
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.2em",
          color: "#555",
          textTransform: "uppercase",
          marginBottom: 18,
        }}
      >
        Watchlist · {watchlist.length} titles
      </div>
      {watchlist.length === 0 ? (
        <div style={{ color: "#444", fontStyle: "italic", fontSize: 14 }}>
          No titles yet. Get recommendations and add them with the + button.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {watchlist.map((item) => (
            <div
              key={item.id}
              style={{
                background: "#0c0c16",
                border: "1px solid #1a1a24",
                borderRadius: 4,
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: "#ddd" }}>{item.title}</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
                  {item.type} · {item.streamingOn?.join(", ")} · {item.releaseYear || ""}
                </div>
              </div>
              <button
                onClick={() => onMarkWatched(item)}
                title="Mark as watched"
                style={{
                  background: "transparent",
                  border: "1px solid #252535",
                  color: "#608060",
                  padding: "4px 12px",
                  borderRadius: 3,
                  fontSize: 12,
                }}
              >
                ✓ Watched
              </button>
              <button
                onClick={() => onRemoveFromWatchlist(item.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#444",
                  fontSize: 16,
                  padding: "4px",
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {watched.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.2em",
              color: "#444",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            Watched History · {watched.length}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {watched.slice(0, 20).map((item) => (
              <div
                key={item.id}
                style={{
                  background: "#0a0a12",
                  border: "1px solid #141420",
                  borderRadius: 4,
                  padding: "10px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  opacity: 0.7,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "#999" }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: "#444" }}>
                    {item.type} · watched{" "}
                    {new Date(item.watchedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
