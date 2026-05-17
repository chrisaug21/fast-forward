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
      <div className="ff-catalog-header">
        <div className="ff-catalog-controls">
          <div className="ff-catalog-title">Browse Catalog</div>
          <div className="ff-filter-tabs">
            {[
              ["all", "All", catalog.length],
              ["streaming", "Streaming", streamingCount],
              ["plex", "Plex", plexCount],
            ].map(([id, label, count]) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`ff-filter-tab${activeTab === id ? " ff-filter-tab--active" : ""}`}
              >
                {label} {count}
              </button>
            ))}
          </div>
        </div>

        <input
          className="ff-input ff-catalog-search"
          placeholder="Search catalog"
          aria-label="Search catalog"
        />
      </div>

      <div className="ff-catalog-grid">
        {filteredCatalog.slice(0, 100).map((item) => {
          const sourceLabel =
            item.source === "streaming" ? item.streamingOn?.[0] || "Streaming" : "Plex";

          return (
            <div
              key={item.id}
              className="ff-card"
              onClick={() => onAddToWatchlist(item)}
              title="Click to add to watchlist"
            >
              <div className="ff-card-title">{item.title}</div>

              <div className="ff-card-meta">
                <span>{item.releaseYear || "Unknown year"}</span>
                <span
                  className={`ff-source-badge ${
                    item.source === "streaming"
                      ? "ff-source-badge--streaming"
                      : "ff-source-badge--plex"
                  }`}
                >
                  {sourceLabel}
                </span>
              </div>

              {item.imdbScore && <div className="ff-card-rating">★ {item.imdbScore}</div>}
            </div>
          );
        })}
      </div>

      {filteredCatalog.length > 100 && (
        <div className="ff-catalog-footnote">
          Showing 100 of {filteredCatalog.length} - use recommendations to find more
        </div>
      )}
    </div>
  );
}
