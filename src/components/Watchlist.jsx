export default function Watchlist({
  watchlist,
  watched,
  onMarkWatched,
  onRemoveFromWatchlist,
}) {
  return (
    <div>
      <div className="ff-page-kicker">
        Watchlist · {watchlist.length} titles
      </div>
      {watchlist.length === 0 ? (
        <div className="ff-empty-state">
          No titles yet. Get recommendations and add them with the + button.
        </div>
      ) : (
        <div className="ff-list">
          {watchlist.map((item) => (
            <div key={item.id} className="ff-list-card">
              <div className="ff-list-body">
                <div className="ff-list-title">{item.title}</div>
                <div className="ff-list-meta">
                  {item.type} · {item.streamingOn?.join(", ")} · {item.releaseYear || ""}
                </div>
              </div>
              <button
                onClick={() => onMarkWatched(item)}
                title="Mark as watched"
                className="ff-button-outline-coral"
              >
                ✓ Watched
              </button>
              <button
                onClick={() => onRemoveFromWatchlist(item.id)}
                className="ff-button-ghost ff-button-ghost--icon"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {watched.length > 0 && (
        <div className="ff-watched-section">
          <div className="ff-page-kicker">
            Watched History · {watched.length}
          </div>
          <div className="ff-list">
            {watched.slice(0, 20).map((item) => (
              <div key={item.id} className="ff-list-card ff-list-card--muted">
                <div className="ff-list-body">
                  <div className="ff-list-title ff-list-title--muted">{item.title}</div>
                  <div className="ff-list-meta">
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
