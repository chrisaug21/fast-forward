import { useState } from "react";

export default function CatalogBrowser({ catalog, onAddToWatchlist }) {
  const [activeTab, setActiveTab] = useState("all");

  if (catalog.length === 0) {
    return null;
  }

  const filteredCatalog = catalog.filter((item) => {
    if (activeTab === "streaming") {
      return item.source === "streaming";
    }

    if (activeTab === "plex") {
      return item.source === "plex";
    }

    return true;
  });

  const streamingCount = catalog.filter((item) => item.source === "streaming").length;
  const plexCount = catalog.filter((item) => item.source === "plex").length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.2em",
            color: "#555",
            textTransform: "uppercase",
          }}
        >
          Browse Catalog
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            ["all", "All", catalog.length],
            ["streaming", "Streaming", streamingCount],
            ["plex", "Plex", plexCount],
          ].map(([id, label, count]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                background: activeTab === id ? "#1a1a28" : "transparent",
                border: `1px solid ${activeTab === id ? "#2a2a3a" : "transparent"}`,
                color: activeTab === id ? "#aaa" : "#444",
                padding: "3px 10px",
                borderRadius: 2,
                fontSize: 11,
              }}
            >
              {label} {count}
            </button>
          ))}
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 8,
          maxHeight: 400,
          overflowY: "auto",
        }}
      >
        {filteredCatalog.slice(0, 100).map((item) => (
          <div
            key={item.id}
            style={{
              background: "#0c0c16",
              border: "1px solid #181820",
              borderRadius: 3,
              padding: "10px 12px",
              cursor: "pointer",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.borderColor = "#2a2a3a";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.borderColor = "#181820";
            }}
            onClick={() => onAddToWatchlist(item)}
            title="Click to add to watchlist"
          >
            <div style={{ fontSize: 13, color: "#ccc", marginBottom: 4, lineHeight: 1.3 }}>
              {item.title}
            </div>
            <div style={{ fontSize: 10, color: "#555" }}>
              {item.releaseYear} · {item.streamingOn[0]}
            </div>
            {item.imdbScore && (
              <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>
                ★ {item.imdbScore}
              </div>
            )}
          </div>
        ))}
      </div>
      {filteredCatalog.length > 100 && (
        <div style={{ textAlign: "center", color: "#444", fontSize: 11, marginTop: 10 }}>
          Showing 100 of {filteredCatalog.length} — use recommendations to find more
        </div>
      )}
    </div>
  );
}
